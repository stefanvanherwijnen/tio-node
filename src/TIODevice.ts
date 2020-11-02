import { Stream, Source, Timebase } from './types'
import { TIOSession } from './TIOSession'
import { generateHeartbeat } from './TIOProtocol'

export class TIODevice {
  session: TIOSession
  routing?: Array<number>
  name = ''
  description = ''
  timebases: Record<string, Timebase> = {}
  sources: Record<string, Source> = {}
  streams: Record<string, Stream> = {}
  columns: Array<string> = []
  publishedData: Record<string, []> = {}
  queue: Record<string, any> = {}
  connected = false
  started = false

  constructor ({ session, routing }: { session: TIOSession, routing?: Array<number> }) {
    this.session = session
    this.routing = routing
  }

  async connect () {
    this.description = await this.session.rpc('dev.desc', undefined, undefined, this.routing)
    this.name = await this.session.rpc('dev.name', undefined, undefined, this.routing)
    // await this.session.rpc('rpc.list', undefined, undefined, this.routing)
    this.connected = true
    console.log(this.name, this.description)
    return { name: this.name, description: this.description }
  }

  start () {
    this.session.rpc('data.send_all', undefined, undefined, this.routing)
    this.started = true
  }

  ready () {
    if (this.columns.length && this.started) {
      return true
    }
    return false
  }

  samplingPeriod () {
    const stream = this.streams[0]
    if (stream) {
      const timebase = this.timebases?.[stream.streamTimebaseId]
      if (timebase) {
        const timebasePeriod = timebase.timebasePeriodNumUs / timebase.timebasePeriodDenomUs / Math.pow(10, 6)
        return timebasePeriod * stream.streamPeriod
      }
    }
  }

  generateColumns () {
    this.columns = []
    if (this.streams[0]) {
      for (const streamIndex in this.streams[0].streamDescription) {
        const stream = this.streams[0].streamDescription[streamIndex]
        if (this.sources[stream.streamSourceId]) {
          const description = this.sources[stream.streamSourceId].description.split('\t')
          const sourceName = description[0]
          const columnNames = description[1].split(',')

          if (columnNames.length > 1) {
            for (const columnName of columnNames) {
              this.columns.push(`${sourceName}.${columnName}`)
            }
          } else {
            this.columns.push(sourceName)
          }
        }
      }
    }
  }

  heartbeat () {
    const heartbeat = generateHeartbeat(this.routing)
      setTimeout(() => {
        this.session.socket.write(heartbeat)
        this.heartbeat()
      }, 1000)
  }

  mappedData () {
    if (this.columns.length) {
      const sampleNumber = Number(Object.keys(this.queue)[0])
      const samplingPeriod = this.samplingPeriod()
      const mappedData: Record<string, any> = {
        time: samplingPeriod ? samplingPeriod*sampleNumber : undefined
      }
      this.columns.forEach((val, index) => {
        const subColumns = val.split('.')

        subColumns.reduce( (p, c, i) => {
          if (i === subColumns.length - 1) {
            p[c] = this.queue[sampleNumber][index].value
          } else {
            p[c] = p[c] || {}
          }
          return p[c]
        }, mappedData);
      }, {})

      return mappedData
    }
  }

}