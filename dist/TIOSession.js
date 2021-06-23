"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.TIOSession = void 0;
var net = __importStar(require("net"));
var TIOProtocol_1 = require("./TIOProtocol");
var events_1 = require("events");
var TIOProtocol_2 = require("./TIOProtocol");
var utf8_1 = __importDefault(require("utf8"));
var TIODevice_1 = require("./TIODevice");
var timeoutPromise = function (timeout) { return new Promise(function (resolve, reject) {
    setTimeout(function () { return reject(new Error('Request timed out')); }, timeout);
}); };
var TIOSession = /** @class */ (function () {
    function TIOSession(_a) {
        var _b = _a === void 0 ? { host: 'localhost', port: 7855, streamingDevices: ['proxy'] } : _a, _c = _b.host, host = _c === void 0 ? 'localhost' : _c, _d = _b.port, port = _d === void 0 ? 7855 : _d, _e = _b.streamingDevices, streamingDevices = _e === void 0 ? ['proxy'] : _e;
        this.devices = {};
        this.packetEmitter = new events_1.EventEmitter();
        this.host = host;
        this.port = port;
        this.streamingDevices = streamingDevices;
        this.socket = new net.Socket();
        this.socket.on('error', function (err) {
            console.error(err);
        });
        this.protocol = new TIOProtocol_1.TIOProtocol();
    }
    TIOSession.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promise;
            var _this = this;
            return __generator(this, function (_a) {
                this.socket.connect(this.port, this.host);
                this.socket.on('connect', function () {
                    _this.setup();
                });
                promise = new Promise(function (resolve, reject) {
                    var interval = setInterval(function () {
                        if (_this.streamingDevices.every(function (v) { return Object.keys(_this.devices).includes(v); })) {
                            clearInterval(interval);
                            resolve(true);
                        }
                        else if (Object.keys(_this.devices).length) {
                            console.log('Waiting on devices, connected devices: ', Object.keys(_this.devices));
                        }
                        else {
                            clearInterval(interval);
                            reject('Device is not ready');
                        }
                    }, 1000);
                });
                return [2 /*return*/, Promise.race([
                        promise,
                        timeoutPromise(5000)
                    ])];
            });
        });
    };
    TIOSession.prototype.end = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.socket.end(function () { return resolve(true); });
        });
    };
    TIOSession.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.socket.on('data', function (rawPacket) { return __awaiter(_this, void 0, void 0, function () {
                    var packet, route, device;
                    var _a;
                    return __generator(this, function (_b) {
                        packet = this.protocol.parsePacket(rawPacket);
                        route = (_a = packet.routing) === null || _a === void 0 ? void 0 : _a[0];
                        device = this.getDevice(route);
                        if (!device) {
                            device = new TIODevice_1.TIODevice({ session: this, routing: packet.routing });
                            if (typeof route !== 'undefined') {
                                this.devices[route] = device;
                            }
                            else {
                                this.devices.proxy = device;
                            }
                            device.connect();
                        }
                        switch (packet.header.type) {
                            case TIOProtocol_2.TL_PTYPE_STREAM0:
                                this.packetEmitter.emit('publishedData', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_LOG:
                                this.packetEmitter.emit('log', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_RPC_REP:
                                this.packetEmitter.emit('rpcReply', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_RPC_ERROR:
                                this.packetEmitter.emit('rpcError', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_TIMEBASE:
                                this.packetEmitter.emit('timebase', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_SOURCE:
                                this.packetEmitter.emit('source', packet);
                                break;
                            case TIOProtocol_2.TL_PTYPE_STREAM:
                                this.packetEmitter.emit('stream', packet);
                                break;
                            default:
                                break;
                        }
                        return [2 /*return*/];
                    });
                }); });
                this.packetEmitter.on('publishedData', function (packet) {
                    var _a;
                    var device = _this.getDevice(packet.routing);
                    if (device && device.started) {
                        var sampleNumber = packet.payload.sampleNumber;
                        device.queue = (_a = {}, _a[sampleNumber] = packet.payload.data, _a);
                        if (_this.checkIfSynchronized(sampleNumber)) {
                            var synchronizedData = _this.getSynchronizedSamples(sampleNumber);
                            if (synchronizedData) {
                                _this.packetEmitter.emit('data', synchronizedData);
                            }
                        }
                    }
                });
                this.packetEmitter.on('timebase', function (packet) {
                    var device = _this.getDevice(packet.routing);
                    if (device) {
                        device.timebases[packet.payload.timebaseId] = packet.payload;
                    }
                });
                this.packetEmitter.on('source', function (packet) {
                    var device = _this.getDevice(packet.routing);
                    var sourceId = packet.payload.sourceId;
                    if (device) {
                        device.sources[sourceId] = packet.payload;
                        device.generateColumns();
                    }
                });
                this.packetEmitter.on('stream', function (packet) {
                    var device = _this.getDevice(packet.routing);
                    var streamId = packet.payload.streamId;
                    if (device) {
                        device.streams[streamId] = packet.payload;
                        device.generateColumns();
                    }
                });
                return [2 /*return*/];
            });
        });
    };
    TIOSession.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises, _i, _a, deviceNr, device;
            return __generator(this, function (_b) {
                promises = [];
                for (_i = 0, _a = this.streamingDevices; _i < _a.length; _i++) {
                    deviceNr = _a[_i];
                    device = this.devices[deviceNr];
                    if (device) {
                        promises.push(device.start());
                    }
                    else {
                        throw new Error(deviceNr + " is not connected");
                    }
                }
                return [2 /*return*/, Promise.all(promises)];
            });
        });
    };
    TIOSession.prototype.rpc = function (topic, rpcPayload, payloadType, routing) {
        var _this = this;
        var _a = this.protocol.createRequest(topic, rpcPayload, payloadType, routing), request = _a.request, requestId = _a.requestId;
        if (!this.socket) {
            throw new Error('No socket connected');
        }
        var promise = new Promise(function (resolve, reject) {
            _this.packetEmitter.once('rpcReply', function (reply) {
                if (reply.payload.value) {
                    resolve(utf8_1["default"].decode(reply.payload.value.toString()));
                }
                else {
                    resolve();
                }
            });
            _this.socket.write(request);
        });
        return Promise.race([
            promise,
            timeoutPromise(5000)
        ]);
    };
    TIOSession.prototype.checkIfSynchronized = function (sampleNumber) {
        for (var _i = 0, _a = Object.values(this.devices); _i < _a.length; _i++) {
            var device = _a[_i];
            if (device.ready() && !device.queue[sampleNumber]) {
                return false;
            }
        }
        return true;
    };
    TIOSession.prototype.getSynchronizedSamples = function (sampleNumber) {
        var samples = {};
        for (var _i = 0, _a = Object.entries(this.devices); _i < _a.length; _i++) {
            var _b = _a[_i], deviceKey = _b[0], device = _b[1];
            if (device.ready() && device.queue[sampleNumber]) {
                samples[deviceKey] = device.mappedData();
            }
        }
        return Object.keys(samples).length ? samples : undefined;
    };
    TIOSession.prototype.getDevice = function (route) {
        if (typeof route === "undefined") {
            return this.devices.proxy;
        }
        else {
            return this.devices[route];
        }
    };
    TIOSession.prototype.on = function (event, fn) {
        this.packetEmitter.on(event, function (data) { return fn(data); });
    };
    return TIOSession;
}());
exports.TIOSession = TIOSession;
