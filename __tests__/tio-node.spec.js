const { TIOSession, packetParser, streamPacketParser, TIOProtocol, generateRequest, generateHeartbeat, headerParser, rpcPayloadParser, routingParser, publishedDataParser, TL_PTYPE_HEARTBEAT, timebasePacketParser, sourcePacketParser } = require('../dist/index.common.js');
const utf8 = require('utf8');
const { head } = require('lodash');


describe('Session', () => {
  let session
  test('should be able to initialize a session', () => {
    session = new TIOSession()
  })

  test('should be able to get the device description', () => {
  })

  test('should be able to parse a packet', () => {

  })


  test('should generate a correct request', () => {
    const protocol = new TIOProtocol()

    headerParser.encode({

    })
    const topic = 'test'
    const routing = ['0']
    const rpcPayload = undefined
    const requestId = 32
    const methodId = utf8.encode(topic).length + 0x8000

    const request = generateRequest(requestId, methodId, topic, rpcPayload, routing)
  })
})

describe('Binary', () => {
  test('should generate a correct header', () => {
    const header = headerParser.encode({
      type: 1,
      routingLength: 2,
      payloadLength: 10
    })

    expect(header.toString('hex')).toBe('01020a00')
  })

  test('should generate a correct rpc payload', () => {
    const payload = rpcPayloadParser(false).encode({
      requestId: 1,
      methodId: 2,
      topic: 'test',
      rpcPayload: undefined
    })

    expect(payload.toString('hex')).toBe('0100020074657374')
  })

  test('should generate correct routing', () => {
    const routing = routingParser.encode({
      routing: [1]
    })

    expect(routing.toString('hex')).toBe('01')
  })

  test('should generate a correct rpc request', () => {
    const topic = 'test'
    const routing = [1]
    const rpcPayload = undefined
    const requestId = 32
    const methodId = utf8.encode(topic).length + 0x8000

    const request = generateRequest(requestId, methodId, topic, rpcPayload, routing)

    expect(request.toString('hex')).toBe('02010800200004807465737401')
  })

  test('should parse published data correctly', () => {
    const rawData = '83b423009efceaa90a7c994671a1cbc5cb0fdfc0ccfdb2c0163489c00e5ead3cedc11abcb2265e3c295c7b44703be441'
    const buffer = Buffer.from(rawData, 'hex')
    const data = publishedDataParser.parse(buffer)

    expect(data).toMatchObject({
      sampleNumber: 2339971,
      data: [
        { value: -1.0435509607050614e-13 },
        { value: 19646.01953125 },
        { value: -6516.18017578125 },
        { value: -6.970677852630615 },
        { value: -5.593481063842773 },
        { value: -4.2876081466674805 },
        { value: 0.021163012832403183 },
        { value: -0.009445649571716785 },
        { value: 0.013559030368924141 },
        { value: 1005.4400024414062 },
        { value: 28.529022216796875 }
      ]
    })
    
    // 83b423009efceaa90a7c994671a1cbc5cb0fdfc0ccfdb2c0163489c00e5ead3cedc11abcb2265e3c295c7b44703be441
    // [(116998.55, (-1.0435509607050614e-13, 19646.01953125, -6516.18017578125, -6.970677852630615, -5.593481063842773, -4.2876081466674805, 0.021163012832403183, -0.009445649571716785, 0.013559030368924141, 1005.4400024414062, 28.529022216796875))]
    
  })

  test('should parse a stream correctly', () => {
    const streamPayload = '000001002800000000000000df263d000000000005000100000000000100000000000000010000000100000000000000020000000100000000000000030001000100000000000000040001000100000000000000'
    const parsedStream = streamPacketParser.parse(Buffer.from(streamPayload, 'hex'))

    expect(parsedStream).toMatchObject({
      streamId: 0,
      streamTimebaseId: 1,
      streamPeriod: 40,
      streamOffset: 0,
      streamSampleNumber: 4007647n,
      streamTotalComponents: 5,
      streamFlags: 1,
      streamDescription: [
        {
          streamSourceId: 0,
          streamFlags: 0,
          streamPeriod: 1,
          streamOffset: 0
        },
        {
          streamSourceId: 1,
          streamFlags: 0,
          streamPeriod: 1,
          streamOffset: 0
        },
        {
          streamSourceId: 2,
          streamFlags: 0,
          streamPeriod: 1,
          streamOffset: 0
        },
        {
          streamSourceId: 3,
          streamFlags: 1,
          streamPeriod: 1,
          streamOffset: 0
        },
        {
          streamSourceId: 4,
          streamFlags: 1,
          streamPeriod: 1,
          streamOffset: 0
        }
      ]
    }
  )
    // 'routing': [1], 'stream_id': 0, 'stream_timebase_id': 1, 'stream_period': 40, 'stream_offset': 0, 'stream_sample_number': 4007647, 'stream_total_components': 5, 'stream_flags': 1}
    // [{'stream_source_id': 0, 'stream_flags': 0, 'stream_period': 1, 'stream_offset': 0}, 
    // {'stream_source_id': 1, 'stream_flags': 0, 'stream_period': 1, 'stream_offset': 0}, 
    // {'stream_source_id': 2, 'stream_flags': 0, 'stream_period': 1, 'stream_offset': 0}, 
    // {'stream_source_id': 3, 'stream_flags': 1, 'stream_period': 1, 'stream_offset': 0}, 
    // {'stream_source_id': 4, 'stream_flags': 1, 'stream_period': 1, 'stream_offset': 0}]
    
  })

  test('should parse a timebase correctly', () => {
    const timebasePayload = '0100010200863ba101000000d0121300e80300000100000095bf563301000000340048000451383138323735'
    const parsedTimebase = timebasePacketParser.parse(Buffer.from(timebasePayload, 'hex'))

    expect(parsedTimebase).toMatchObject({
      timebaseId: 1,
      timebaseSource: 1,
      timebaseEpoch: 2,
      timebaseStartTime: 7000000000n,
      timebasePeriodNumUs: 1250000,
      timebasePeriodDenomUs: 1000,
      timebaseFlags: 1,
      timebaseStabilityPpb: 5.000000058430487e-8,
      timebaseSrcParams: [
         1,  0,  0,  0, 52,  0,
        72,  0,  4, 81, 56, 49,
        56, 50, 55, 53
      ]
    }
  )

  // 'timebase_id': 1, 'timebase_source': 1, 'timebase_epoch': 2, 'timebase_start_time': 7000000000, 'timebase_period_num_us': 1250000, 'timebase_period_denom_us': 1000, 'timebase_flags': 1, 'timebase_stability_ppb': 50.00000058430487, 'timebase_src_params': (1, 0, 0, 0, 52, 0, 72, 0, 4, 81, 56, 49, 56, 50, 55, 53)}
  })

  test('should parse a source correctly', () => {
    const sourcePayload = '040001005000000000000000ffffffff0000010042746865726d0909416d6269656e742074656d70657261747572650943'
    const parsedSource = sourcePacketParser.parse(Buffer.from(sourcePayload, 'hex'))

    expect(parsedSource).toMatchObject({
      sourceId: 4,
      sourceTimeBaseId: 1,
      sourcePeriod: 80,
      sourceOffset: 0,
      sourceFmt: 4294967295,
      sourceFlags: 0,
      sourceChannels: 1,
      sourceType: 66,
      description: 'therm\t\tAmbient temperature\tC'
    }
  )
  })

  test('should generate a heartbeat correctly', () => {
    const routing = [1]
    const heartbeat = generateHeartbeat(routing)
    expect(heartbeat.toString('hex')).toBe('0501000001')
  })
})
