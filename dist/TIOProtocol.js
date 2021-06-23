"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.TIOProtocol = exports.generateRequest = exports.publishedDataParser = exports.timebasePacketParser = exports.streamPacketParser = exports.sourcePacketParser = exports.defaultPacketParser = exports.generateHeartbeat = exports.payloadParser = exports.rpcPayloadParser = exports.routingParser = exports.headerParser = exports.dataTypes = exports.TL_PTYPE_OTHER_ROUTING = exports.TL_PTYPE_STREAM0 = exports.TL_PTYPE_USER = exports.TL_PTYPE_STREAM = exports.TL_PTYPE_SOURCE = exports.TL_PTYPE_TIMEBASE = exports.TL_PTYPE_HEARTBEAT = exports.TL_PTYPE_RPC_ERROR = exports.TL_PTYPE_RPC_REP = exports.TL_PTYPE_RPC_REQ = exports.TL_PTYPE_LOG = exports.TL_PTYPE_INVALID = exports.TL_PTYPE_NONE = void 0;
var utf8_1 = __importDefault(require("utf8"));
var binary_parser_encoder_1 = require("binary-parser-encoder");
exports.TL_PTYPE_NONE = 0;
exports.TL_PTYPE_INVALID = 0;
exports.TL_PTYPE_LOG = 1; // Log messages
exports.TL_PTYPE_RPC_REQ = 2; // RPC request
exports.TL_PTYPE_RPC_REP = 3; // RPC reply
exports.TL_PTYPE_RPC_ERROR = 4; // RPC error
exports.TL_PTYPE_HEARTBEAT = 5; // NOP heartbeat
exports.TL_PTYPE_TIMEBASE = 6; // Update to a timebase's parameters
exports.TL_PTYPE_SOURCE = 7; // Update to a source's parameters
exports.TL_PTYPE_STREAM = 8; // Update to a stream's parameters
exports.TL_PTYPE_USER = 64;
exports.TL_PTYPE_STREAM0 = 128;
exports.TL_PTYPE_OTHER_ROUTING = -1;
exports.dataTypes = {
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
};
exports.headerParser = new binary_parser_encoder_1.Parser()
    .endianess("little")
    .uint8('type')
    .uint8('routingLength')
    .uint16('payloadLength');
exports.routingParser = new binary_parser_encoder_1.Parser()
    .array('routing', { type: 'uint8', readUntil: 'eof' });
exports.rpcPayloadParser = function (rpcPayload) {
    if (rpcPayload === void 0) { rpcPayload = false; }
    var parser = new binary_parser_encoder_1.Parser()
        .endianess("little")
        .uint16('requestId')
        .uint16('methodId')
        .string('topic', { greedy: true });
    if (rpcPayload) {
        parser.uint32('rpcPayload');
    }
    return parser;
};
exports.payloadParser = function (type, payloadLength, payload) {
    switch (type) {
        case exports.TL_PTYPE_NONE:
            break;
        case exports.TL_PTYPE_LOG:
            return exports.defaultPacketParser(payloadLength).parse(payload);
        case exports.TL_PTYPE_RPC_REQ:
            break;
        case exports.TL_PTYPE_RPC_REP:
            return rpcReplyPacketParser(payloadLength).parse(payload);
        case exports.TL_PTYPE_RPC_ERROR:
            break;
        case exports.TL_PTYPE_HEARTBEAT:
            break;
        case exports.TL_PTYPE_TIMEBASE:
            return exports.timebasePacketParser.parse(payload);
        case exports.TL_PTYPE_SOURCE:
            return exports.sourcePacketParser.parse(payload);
        case exports.TL_PTYPE_STREAM:
            return exports.streamPacketParser.parse(payload);
        case exports.TL_PTYPE_STREAM0:
            return exports.publishedDataParser.parse(payload);
        default:
            break;
    }
};
exports.generateHeartbeat = function (routing) {
    var payload = Buffer.from('');
    var routingBuffer = exports.routingParser.encode({
        routing: routing
    });
    var header = exports.headerParser.encode({
        type: exports.TL_PTYPE_HEARTBEAT,
        routingLength: routingBuffer.length,
        payloadLength: payload.length
    });
    var request = Buffer.concat([header, payload, routingBuffer]);
    return request;
};
// const logPacketParser = (payloadLength: number) => new Parser()
//   .string('value', { lengthInBytes: payloadLength })
var rpcReplyPacketParser = function (payloadLength) {
    var parser = new binary_parser_encoder_1.Parser()
        .uint16('requestId');
    if (payloadLength > 2) {
        parser.buffer('value', { length: payloadLength - 2 });
    }
    return parser;
};
exports.defaultPacketParser = function (payloadLength) { return new binary_parser_encoder_1.Parser()
    .endianess('little')
    .buffer('value', { length: payloadLength }); };
exports.sourcePacketParser = new binary_parser_encoder_1.Parser()
    .endianess('little')
    .uint16('sourceId')
    .uint16('sourceTimeBaseId')
    .uint32('sourcePeriod')
    .uint32('sourceOffset')
    .uint32('sourceFmt')
    .uint16('sourceFlags')
    .uint16('sourceChannels')
    .uint8('sourceType')
    .string('description', { greedy: true });
exports.streamPacketParser = new binary_parser_encoder_1.Parser()
    .endianess('little')
    .uint16le('streamId')
    .uint16le('streamTimebaseId')
    .uint32le('streamPeriod')
    .uint32le('streamOffset')
    .uint64le('streamSampleNumber')
    .uint16le('streamTotalComponents')
    .uint16le('streamFlags')
    .array('streamDescription', {
    type: new binary_parser_encoder_1.Parser()
        .uint16le('streamSourceId')
        .uint16le('streamFlags')
        .uint32le('streamPeriod')
        .uint32le('streamOffset'),
    length: 'streamTotalComponents'
});
exports.timebasePacketParser = new binary_parser_encoder_1.Parser()
    .endianess('little')
    .uint16le('timebaseId')
    .uint8('timebaseSource')
    .uint8('timebaseEpoch')
    .uint64le('timebaseStartTime')
    .uint32le('timebasePeriodNumUs')
    .uint32le('timebasePeriodDenomUs')
    .uint32le('timebaseFlags')
    .floatle('timebaseStabilityPpb')
    .array('timebaseSrcParams', { type: 'uint8', lengthInBytes: 16 });
var float32Parser = new binary_parser_encoder_1.Parser()
    .floatle('value');
// Not all packets might contain only float32 values
exports.publishedDataParser = new binary_parser_encoder_1.Parser()
    .endianess('little')
    .int32le('sampleNumber', { lengthInBytes: 4 })
    .array('data', { type: float32Parser, readUntil: 'eof' });
exports.generateRequest = function (requestId, methodId, topic, rpcPayload, routing) {
    var payload = exports.rpcPayloadParser(rpcPayload).encode({
        requestId: requestId,
        methodId: methodId,
        topic: topic,
        rpcPayload: rpcPayload
    });
    var routingBuffer = exports.routingParser.encode({
        routing: routing
    });
    var header = exports.headerParser.encode({
        type: exports.TL_PTYPE_RPC_REQ,
        routingLength: routingBuffer.length,
        payloadLength: payload.length
    });
    var request = Buffer.concat([header, payload, routingBuffer]);
    return request;
};
var TIOProtocol = /** @class */ (function () {
    function TIOProtocol() {
        this.routing = [];
    }
    TIOProtocol.prototype.parsePacket = function (rawPacket) {
        var _a;
        var header = exports.headerParser.parse(rawPacket.slice(0, 4));
        var payload = exports.payloadParser(header.type, header.payloadLength, rawPacket.slice(4, 4 + header.payloadLength));
        var routing = header.routingLength ? (_a = exports.routingParser.parse(rawPacket.slice(4 + header.payloadLength, 4 + header.payloadLength + header.routingLength))) === null || _a === void 0 ? void 0 : _a.routing : undefined;
        return { header: header, payload: payload, routing: routing };
    };
    TIOProtocol.prototype.createRequest = function (topic, rpcPayload, payloadType, routing) {
        var requestId = Math.ceil(Math.random() * Math.pow(2, 16));
        var methodId = utf8_1["default"].encode(topic).length + 0x8000;
        var payload = exports.rpcPayloadParser(rpcPayload).encode({
            requestId: requestId,
            methodId: methodId,
            topic: topic,
            rpcPayload: rpcPayload
        });
        var routingBuffer = exports.routingParser.encode({
            routing: routing
        });
        var header = exports.headerParser.encode({
            type: exports.TL_PTYPE_RPC_REQ,
            routingLength: routingBuffer.length,
            payloadLength: payload.length
        });
        var request = Buffer.concat([header, payload, routingBuffer]);
        return { request: request, requestId: requestId };
    };
    return TIOProtocol;
}());
exports.TIOProtocol = TIOProtocol;
