"use strict";
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
exports.__esModule = true;
exports.TIODevice = void 0;
var TIOProtocol_1 = require("./TIOProtocol");
var TIODevice = /** @class */ (function () {
    function TIODevice(_a) {
        var session = _a.session, routing = _a.routing;
        this.name = '';
        this.description = '';
        this.timebases = {};
        this.sources = {};
        this.streams = {};
        this.columns = [];
        this.publishedData = {};
        this.queue = {};
        this.connected = false;
        this.started = false;
        this.session = session;
        this.routing = routing;
    }
    TIODevice.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.session.rpc('dev.desc', undefined, undefined, this.routing)];
                    case 1:
                        _a.description = _c.sent();
                        _b = this;
                        return [4 /*yield*/, this.session.rpc('dev.name', undefined, undefined, this.routing)
                            // await this.session.rpc('rpc.list', undefined, undefined, this.routing)
                        ];
                    case 2:
                        _b.name = _c.sent();
                        // await this.session.rpc('rpc.list', undefined, undefined, this.routing)
                        this.connected = true;
                        console.log(this.name, this.description);
                        return [2 /*return*/, { name: this.name, description: this.description }];
                }
            });
        });
    };
    TIODevice.prototype.start = function () {
        var _this = this;
        return this.session.rpc('data.send_all', undefined, undefined, this.routing).then(function () {
            _this.started = true;
        });
    };
    TIODevice.prototype.ready = function () {
        if (this.columns.length && this.started) {
            return true;
        }
        return false;
    };
    TIODevice.prototype.samplingPeriod = function () {
        var _a;
        var stream = this.streams[0];
        if (stream) {
            var timebase = (_a = this.timebases) === null || _a === void 0 ? void 0 : _a[stream.streamTimebaseId];
            if (timebase) {
                var timebasePeriod = timebase.timebasePeriodNumUs / timebase.timebasePeriodDenomUs / Math.pow(10, 6);
                return timebasePeriod * stream.streamPeriod;
            }
        }
    };
    TIODevice.prototype.generateColumns = function () {
        this.columns = [];
        if (this.streams[0]) {
            for (var streamIndex in this.streams[0].streamDescription) {
                var stream = this.streams[0].streamDescription[streamIndex];
                if (this.sources[stream.streamSourceId]) {
                    var description = this.sources[stream.streamSourceId].description.split('\t');
                    var sourceName = description[0];
                    var columnNames = description[1].split(',');
                    if (columnNames.length > 1) {
                        for (var _i = 0, columnNames_1 = columnNames; _i < columnNames_1.length; _i++) {
                            var columnName = columnNames_1[_i];
                            this.columns.push(sourceName + "." + columnName);
                        }
                    }
                    else {
                        this.columns.push(sourceName);
                    }
                }
            }
        }
    };
    TIODevice.prototype.heartbeat = function () {
        var _this = this;
        var heartbeat = TIOProtocol_1.generateHeartbeat(this.routing);
        setTimeout(function () {
            _this.session.socket.write(heartbeat);
            _this.heartbeat();
        }, 1000);
    };
    TIODevice.prototype.mappedData = function () {
        var _this = this;
        if (this.columns.length) {
            var sampleNumber_1 = Number(Object.keys(this.queue)[0]);
            var samplingPeriod = this.samplingPeriod();
            var mappedData_1 = {
                time: samplingPeriod ? samplingPeriod * sampleNumber_1 : undefined
            };
            this.columns.forEach(function (val, index) {
                var subColumns = val.split('.');
                subColumns.reduce(function (p, c, i) {
                    if (i === subColumns.length - 1) {
                        p[c] = _this.queue[sampleNumber_1][index].value;
                    }
                    else {
                        p[c] = p[c] || {};
                    }
                    return p[c];
                }, mappedData_1);
            }, {});
            return mappedData_1;
        }
    };
    return TIODevice;
}());
exports.TIODevice = TIODevice;
