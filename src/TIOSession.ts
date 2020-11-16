import * as net from 'net'

import { TIOProtocol } from './TIOProtocol'
import { EventEmitter } from 'events'
import { TL_PTYPE_STREAM0,
  TL_PTYPE_LOG, TL_PTYPE_RPC_REP, TL_PTYPE_RPC_ERROR, TL_PTYPE_TIMEBASE, TL_PTYPE_SOURCE, TL_PTYPE_STREAM } from './TIOProtocol'
import utf8 from 'utf8'
import { TIODevice } from './TIODevice'

const timeoutPromise = (timeout: number) => new Promise<never>((resolve, reject) => {
  setTimeout(() => reject(new Error('Request timed out')), timeout)
})
export class TIOSession {

  host: string
  port: number
  socket: net.Socket
  protocol: TIOProtocol

  devices: Record<string, TIODevice> = {}
  streamingDevices: Array<string>

  packetEmitter = new EventEmitter()

  constructor({ host = 'localhost', port = 7855, streamingDevices = ['proxy'] }:
    { host?: string, port?: number, streamingDevices?: Array<string>}
    = { host: 'localhost', port: 7855, streamingDevices: ['proxy']}) {
    this.host = host
    this.port = port
    this.streamingDevices = streamingDevices
    this.socket = new net.Socket()
    this.protocol = new TIOProtocol()
  }

  async connect () {
      this.socket.connect(this.port, this.host)
      this.socket.on('connect', () => {
        this.setup()
      })
      const promise =  new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (this.streamingDevices.every(v => Object.keys(this.devices).includes(v))) {
            clearInterval(interval)
            resolve()
          }
        }, 1000)
      })
      return Promise.race([
        promise,
        timeoutPromise(5000)
      ])
  }

  end () {
    return new Promise((resolve, reject) => {
      this.socket.end(() => resolve())
    })
  }

  async setup () {
    this.socket.on('data', async (rawPacket) => {
      const packet = this.protocol.parsePacket(rawPacket)
      const route = packet.routing?.[0]
      let device = this.getDevice(route)
      if (!device) {
        device = new TIODevice({ session: this, routing: packet.routing })
        if (typeof route !== 'undefined') {
          this.devices[route] = device
        } else {
          this.devices.proxy = device
        }
        device.connect()
      }

      switch (packet.header.type) {
        case TL_PTYPE_STREAM0:
          this.packetEmitter.emit('publishedData', packet)
          break;
        case TL_PTYPE_LOG:
          this.packetEmitter.emit('log', packet)
          break
        case TL_PTYPE_RPC_REP:
          this.packetEmitter.emit('rpcReply', packet)
          break
        case TL_PTYPE_RPC_ERROR:
          this.packetEmitter.emit('rpcError', packet)
          break
        case TL_PTYPE_TIMEBASE:
          this.packetEmitter.emit('timebase', packet)
          break
        case TL_PTYPE_SOURCE:
          this.packetEmitter.emit('source', packet)
          break
        case TL_PTYPE_STREAM:
          this.packetEmitter.emit('stream', packet)
          break
        default:
          break
      }
    })

    this.packetEmitter.on('publishedData', packet => {
      const device = this.getDevice(packet.routing)
      if (device && device.started) {
        const sampleNumber = packet.payload.sampleNumber
        device.queue = { [sampleNumber]: packet.payload.data }
        if (this.checkIfSynchronized(sampleNumber)) {
          const synchronizedData = this.getSynchronizedSamples(sampleNumber)
          if (synchronizedData) {
            this.packetEmitter.emit('data', synchronizedData)
          }
        }
      }
    })

    this.packetEmitter.on('timebase', packet => {
      const device = this.getDevice(packet.routing)
      if (device) {
        device.timebases[packet.payload.timebaseId] = packet.payload
      }
    })

    this.packetEmitter.on('source', packet => {
      const device = this.getDevice(packet.routing)
      const sourceId = packet.payload.sourceId
      if (device) {
        device.sources[sourceId] = packet.payload
        device.generateColumns()
      }
    })

    this.packetEmitter.on('stream', packet => {
      const device = this.getDevice(packet.routing)
      const streamId = packet.payload.streamId
      if (device) {
        device.streams[streamId] = packet.payload
        device.generateColumns()
      }
    })

  }

  async start () {
    const promises = []
    for (const deviceNr of this.streamingDevices) {
      const device = this.devices[deviceNr]
      if (device) {
        promises.push(device.start())
      } else {
        throw new Error(`${deviceNr} is not connected`)
      }
    }
    return Promise.all(promises)
  }

  rpc (topic: string, rpcPayload?: any, payloadType?: 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32',  routing?: Array<number>) {
    const { request, requestId } = this.protocol.createRequest(topic, rpcPayload, payloadType, routing)
    if (!this.socket) {
      throw new Error('No socket connected')
    }
    const promise = new Promise<string>((resolve, reject) => {
      this.packetEmitter.once('rpcReply', reply => {
        if (reply.payload.value) {
          resolve(utf8.decode(reply.payload.value.toString()))
        } else{
          resolve()
        }
      })
      this.socket.write(request)
    })

    return Promise.race([
      promise,
      timeoutPromise(5000)
    ])
  }

  checkIfSynchronized (sampleNumber: number) {
    for (const device of Object.values(this.devices)) {
      if (device.ready() && !device.queue[sampleNumber]) {
        return false
      }
    }
    return true
  }

  getSynchronizedSamples (sampleNumber: number) {
    const samples: Record<string, any> = {}
    for (const [deviceKey, device] of Object.entries(this.devices)) {
      if (device.ready() && device.queue[sampleNumber]) {
        samples[deviceKey] = device.mappedData()
      }
    }
    return Object.keys(samples).length ? samples : undefined
  }

  getDevice (route: number) {
    if (typeof route === "undefined") {
      return this.devices.proxy
    } else {
      return this.devices[route]
    }
  }

  on (event: string, fn: (data: any) => void) {
    this.packetEmitter.on(event, data => fn(data))
  }

}