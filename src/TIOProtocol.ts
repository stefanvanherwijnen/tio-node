import utf8 from 'utf8'
import { Parser } from 'binary-parser-encoder'
export const TL_PTYPE_NONE       = 0
export const TL_PTYPE_INVALID    = 0
export const TL_PTYPE_LOG        = 1 // Log messages
export const TL_PTYPE_RPC_REQ    = 2 // RPC request
export const TL_PTYPE_RPC_REP    = 3 // RPC reply
export const TL_PTYPE_RPC_ERROR  = 4 // RPC error
export const TL_PTYPE_HEARTBEAT  = 5 // NOP heartbeat
export const TL_PTYPE_TIMEBASE   = 6 // Update to a timebase's parameters
export const TL_PTYPE_SOURCE     = 7 // Update to a source's parameters
export const TL_PTYPE_STREAM     = 8 // Update to a stream's parameters
export const TL_PTYPE_USER       = 64
export const TL_PTYPE_STREAM0    = 128
export const TL_PTYPE_OTHER_ROUTING = -1

export const dataTypes = {
  0x10: 'uint8',
  0x11: 'int8',
  0x20: 'uint16',
  0x21: 'int16',
  0x30: 'uin24',
  0x31: 'in24',
  0x40: 'uint32',
  0x41: 'int32',
  0x80: 'uint64',
  0x81: 'int64',
  0x42: 'float',
  0x82: 'double',
  0x03: 'string',
  0x00: 'none'
}


export const headerParser = new Parser()
  .endianess("little")
  .uint8('type')
  .uint8('routingLength')
  .uint16('payloadLength')

export const routingParser = new Parser()
  .array('routing', { type: 'uint8', readUntil: 'eof' })

export const rpcPayloadParser = (rpcPayload = false) => {
  const parser = new Parser()
    .endianess("little")
    .uint16('requestId')
    .uint16('methodId')
    .string('topic', { greedy: true })
  if (rpcPayload) {
    parser.uint32('rpcPayload')
  }
  return parser
}

export const payloadParser = (type: number, payloadLength: number, payload: Buffer) => {
  switch (type) {
    case TL_PTYPE_NONE:
      break;
    case TL_PTYPE_LOG:
      return defaultPacketParser(payloadLength).parse(payload)
    case TL_PTYPE_RPC_REQ:
      break
    case TL_PTYPE_RPC_REP:
      return rpcReplyPacketParser(payloadLength).parse(payload)
    case TL_PTYPE_RPC_ERROR:
      break
    case TL_PTYPE_HEARTBEAT:
      break
    case TL_PTYPE_TIMEBASE:
      return timebasePacketParser.parse(payload)
    case TL_PTYPE_SOURCE:
      return sourcePacketParser.parse(payload)
    case TL_PTYPE_STREAM:
      return streamPacketParser.parse(payload)
    case TL_PTYPE_STREAM0:
      return publishedDataParser.parse(payload)
    default:
      break;
  }
}

export const generateHeartbeat = (routing?: Array<number>) => {
  const payload = Buffer.from('')
  const routingBuffer = routingParser.encode({
    routing: routing
  })
  const header = headerParser.encode({
    type: TL_PTYPE_HEARTBEAT,
    routingLength: routingBuffer.length,
    payloadLength: payload.length
  })

  const request = Buffer.concat([header, payload, routingBuffer])
  return request
}

// const logPacketParser = (payloadLength: number) => new Parser()
//   .string('value', { lengthInBytes: payloadLength })

const rpcReplyPacketParser = (payloadLength: number) => {
  const parser = new Parser()
    .uint16('requestId')
  if (payloadLength > 2) {
    parser.buffer('value', { length: payloadLength - 2 })
  }
  return parser
}

export const defaultPacketParser = (payloadLength: number) => new Parser()
  .endianess('little')
  .buffer('value', { length: payloadLength })

export const sourcePacketParser = new Parser()
  .endianess('little')
  .uint16('sourceId')
  .uint16('sourceTimeBaseId')
  .uint32('sourcePeriod')
  .uint32('sourceOffset')
  .uint32('sourceFmt')
  .uint16('sourceFlags')
  .uint16('sourceChannels')
  .uint8('sourceType')
  .string('description', { greedy: true })

export const streamPacketParser = new Parser()
  .endianess('little')
  .uint16le('streamId')
  .uint16le('streamTimebaseId')
  .uint32le('streamPeriod')
  .uint32le('streamOffset')
  .uint64le('streamSampleNumber')
  .uint16le('streamTotalComponents')
  .uint16le('streamFlags')
  .array('streamDescription', {
    type: new Parser()
      .uint16le('streamSourceId')
      .uint16le('streamFlags')
      .uint32le('streamPeriod')
      .uint32le('streamOffset'),
    length: 'streamTotalComponents'
  })

export const timebasePacketParser = new Parser()
  .endianess('little')
  .uint16le('timebaseId')
  .uint8('timebaseSource')
  .uint8('timebaseEpoch')
  .uint64le('timebaseStartTime')
  .uint32le('timebasePeriodNumUs')
  .uint32le('timebasePeriodDenomUs')
  .uint32le('timebaseFlags')
  .floatle('timebaseStabilityPpb')
  .array('timebaseSrcParams', { type: 'uint8', lengthInBytes: 16 })


const float32Parser = new Parser()
  .floatle('value')

// Not all packets might contain only float32 values
export const publishedDataParser = new Parser()
  .endianess('little')
  .int32le('sampleNumber', { lengthInBytes: 4 })
  .array('data', { type: float32Parser, readUntil: 'eof' })

export const generateRequest = (requestId: number, methodId: number, topic: string, rpcPayload: any, routing: Array<number>) => {
  const payload = rpcPayloadParser(rpcPayload).encode({
    requestId: requestId,
    methodId: methodId,
    topic: topic,
    rpcPayload: rpcPayload
  })
  const routingBuffer = routingParser.encode({
    routing: routing
  })
  const header = headerParser.encode({
    type: TL_PTYPE_RPC_REQ,
    routingLength: routingBuffer.length,
    payloadLength: payload.length
  })

  const request = Buffer.concat([header, payload, routingBuffer])
  return request
}

export class TIOProtocol {
  routing: Array<number>

  constructor () {
    this.routing = []
  }

  parsePacket (rawPacket: Buffer) {
    const header = headerParser.parse(rawPacket.slice(0,4))
    const payload = payloadParser(header.type, header.payloadLength, rawPacket.slice(4, 4+header.payloadLength))
    const routing = header.routingLength ? routingParser.parse(rawPacket.slice(4+header.payloadLength, 4+header.payloadLength+header.routingLength))?.routing : undefined
    return { header, payload, routing }
  }

  createRequest (topic: string, rpcPayload?: any, payloadType?: 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32', routing?: Array<number>) {
    const requestId = Math.ceil(Math.random() * Math.pow(2, 16))
    const methodId = utf8.encode(topic).length + 0x8000

    const payload = rpcPayloadParser(rpcPayload).encode({
      requestId: requestId,
      methodId: methodId,
      topic: topic,
      rpcPayload: rpcPayload
    })
    const routingBuffer = routingParser.encode({
      routing: routing
    })
    const header = headerParser.encode({
      type: TL_PTYPE_RPC_REQ,
      routingLength: routingBuffer.length,
      payloadLength: payload.length
    })

    const request = Buffer.concat([header, payload, routingBuffer])

    return { request, requestId }
  }
}