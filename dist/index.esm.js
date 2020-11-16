import { Socket } from 'net';
import buffer_1 from 'buffer';
import vm_1 from 'vm';
import { EventEmitter } from 'events';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var utf8 = createCommonjsModule(function (module, exports) {
(function(root) {

	var stringFromCharCode = String.fromCharCode;

	// Taken from https://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from https://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	function checkScalarValue(codePoint) {
		if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
			throw Error(
				'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
				' is not a scalar value'
			);
		}
	}
	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			checkScalarValue(codePoint);
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);
		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				checkScalarValue(codePoint);
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	root.version = '3.0.0';
	root.encode = utf8encode;
	root.decode = utf8decode;

}( exports));
});

var context = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
var Context = /** @class */ (function () {
    function Context() {
        this.code = '';
        this.scopes = [['vars']];
        this.bitFields = [];
        this.tmpVariableCount = 0;
        this.references = {};
    }
    Context.prototype.generateVariable = function (name) {
        var arr = [];
        var scopes = this.scopes[this.scopes.length - 1];
        arr.push.apply(arr, scopes);
        if (name) {
            arr.push(name);
        }
        return arr.join('.');
    };
    Context.prototype.generateOption = function (val) {
        switch (typeof val) {
            case 'number':
                return val.toString();
            case 'string':
                return this.generateVariable(val);
            case 'function':
                return "(" + val + ").call(" + this.generateVariable() + ", vars)";
        }
    };
    Context.prototype.generateError = function (err) {
        this.pushCode('throw new Error(' + err + ');');
    };
    Context.prototype.generateTmpVariable = function () {
        return '$tmp' + this.tmpVariableCount++;
    };
    Context.prototype.pushCode = function (code) {
        this.code += code + '\n';
    };
    Context.prototype.pushPath = function (name) {
        if (name) {
            this.scopes[this.scopes.length - 1].push(name);
        }
    };
    Context.prototype.popPath = function (name) {
        if (name) {
            this.scopes[this.scopes.length - 1].pop();
        }
    };
    Context.prototype.pushScope = function (name) {
        this.scopes.push([name]);
    };
    Context.prototype.popScope = function () {
        this.scopes.pop();
    };
    Context.prototype.addReference = function (alias) {
        if (this.references[alias])
            return;
        this.references[alias] = { resolved: false, requested: false };
    };
    Context.prototype.markResolved = function (alias) {
        this.references[alias].resolved = true;
    };
    Context.prototype.markRequested = function (aliasList) {
        var _this = this;
        aliasList.forEach(function (alias) {
            _this.references[alias].requested = true;
        });
    };
    Context.prototype.getUnresolvedReferences = function () {
        var references = this.references;
        return Object.keys(this.references).filter(function (alias) { return !references[alias].resolved && !references[alias].requested; });
    };
    return Context;
}());
exports.Context = Context;

});

var utils = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Error strings
 */
const ERRORS = {
    INVALID_ENCODING: 'Invalid encoding provided. Please specify a valid encoding the internal Node.js Buffer supports.',
    INVALID_SMARTBUFFER_SIZE: 'Invalid size provided. Size must be a valid integer greater than zero.',
    INVALID_SMARTBUFFER_BUFFER: 'Invalid Buffer provided in SmartBufferOptions.',
    INVALID_SMARTBUFFER_OBJECT: 'Invalid SmartBufferOptions object supplied to SmartBuffer constructor or factory methods.',
    INVALID_OFFSET: 'An invalid offset value was provided.',
    INVALID_OFFSET_NON_NUMBER: 'An invalid offset value was provided. A numeric value is required.',
    INVALID_LENGTH: 'An invalid length value was provided.',
    INVALID_LENGTH_NON_NUMBER: 'An invalid length value was provived. A numeric value is required.',
    INVALID_TARGET_OFFSET: 'Target offset is beyond the bounds of the internal SmartBuffer data.',
    INVALID_TARGET_LENGTH: 'Specified length value moves cursor beyong the bounds of the internal SmartBuffer data.',
    INVALID_READ_BEYOND_BOUNDS: 'Attempted to read beyond the bounds of the managed data.',
    INVALID_WRITE_BEYOND_BOUNDS: 'Attempted to write beyond the bounds of the managed data.'
};
exports.ERRORS = ERRORS;
/**
 * Checks if a given encoding is a valid Buffer encoding. (Throws an exception if check fails)
 *
 * @param { String } encoding The encoding string to check.
 */
function checkEncoding(encoding) {
    if (!buffer_1.Buffer.isEncoding(encoding)) {
        throw new Error(ERRORS.INVALID_ENCODING);
    }
}
exports.checkEncoding = checkEncoding;
/**
 * Checks if a given number is a finite integer. (Throws an exception if check fails)
 *
 * @param { Number } value The number value to check.
 */
function isFiniteInteger(value) {
    return typeof value === 'number' && isFinite(value) && isInteger(value);
}
exports.isFiniteInteger = isFiniteInteger;
/**
 * Checks if an offset/length value is valid. (Throws an exception if check fails)
 *
 * @param value The value to check.
 * @param offset True if checking an offset, false if checking a length.
 */
function checkOffsetOrLengthValue(value, offset) {
    if (typeof value === 'number') {
        // Check for non finite/non integers
        if (!isFiniteInteger(value) || value < 0) {
            throw new Error(offset ? ERRORS.INVALID_OFFSET : ERRORS.INVALID_LENGTH);
        }
    }
    else {
        throw new Error(offset ? ERRORS.INVALID_OFFSET_NON_NUMBER : ERRORS.INVALID_LENGTH_NON_NUMBER);
    }
}
/**
 * Checks if a length value is valid. (Throws an exception if check fails)
 *
 * @param { Number } length The value to check.
 */
function checkLengthValue(length) {
    checkOffsetOrLengthValue(length, false);
}
exports.checkLengthValue = checkLengthValue;
/**
 * Checks if a offset value is valid. (Throws an exception if check fails)
 *
 * @param { Number } offset The value to check.
 */
function checkOffsetValue(offset) {
    checkOffsetOrLengthValue(offset, true);
}
exports.checkOffsetValue = checkOffsetValue;
/**
 * Checks if a target offset value is out of bounds. (Throws an exception if check fails)
 *
 * @param { Number } offset The offset value to check.
 * @param { SmartBuffer } buff The SmartBuffer instance to check against.
 */
function checkTargetOffset(offset, buff) {
    if (offset < 0 || offset > buff.length) {
        throw new Error(ERRORS.INVALID_TARGET_OFFSET);
    }
}
exports.checkTargetOffset = checkTargetOffset;
/**
 * Determines whether a given number is a integer.
 * @param value The number to check.
 */
function isInteger(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
}
/**
 * Throws if Node.js version is too low to support bigint
 */
function bigIntAndBufferInt64Check(bufferMethod) {
    if (typeof BigInt === 'undefined') {
        throw new Error('Platform does not support JS BigInt type.');
    }
    if (typeof buffer_1.Buffer.prototype[bufferMethod] === 'undefined') {
        throw new Error(`Platform does not support Buffer.prototype.${bufferMethod}.`);
    }
}
exports.bigIntAndBufferInt64Check = bigIntAndBufferInt64Check;

});

var smartbuffer = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

// The default Buffer size if one is not provided.
const DEFAULT_SMARTBUFFER_SIZE = 4096;
// The default string encoding to use for reading/writing strings.
const DEFAULT_SMARTBUFFER_ENCODING = 'utf8';
class SmartBuffer {
    /**
     * Creates a new SmartBuffer instance.
     *
     * @param options { SmartBufferOptions } The SmartBufferOptions to apply to this instance.
     */
    constructor(options) {
        this.length = 0;
        this._encoding = DEFAULT_SMARTBUFFER_ENCODING;
        this._writeOffset = 0;
        this._readOffset = 0;
        if (SmartBuffer.isSmartBufferOptions(options)) {
            // Checks for encoding
            if (options.encoding) {
                utils.checkEncoding(options.encoding);
                this._encoding = options.encoding;
            }
            // Checks for initial size length
            if (options.size) {
                if (utils.isFiniteInteger(options.size) && options.size > 0) {
                    this._buff = Buffer.allocUnsafe(options.size);
                }
                else {
                    throw new Error(utils.ERRORS.INVALID_SMARTBUFFER_SIZE);
                }
                // Check for initial Buffer
            }
            else if (options.buff) {
                if (options.buff instanceof Buffer) {
                    this._buff = options.buff;
                    this.length = options.buff.length;
                }
                else {
                    throw new Error(utils.ERRORS.INVALID_SMARTBUFFER_BUFFER);
                }
            }
            else {
                this._buff = Buffer.allocUnsafe(DEFAULT_SMARTBUFFER_SIZE);
            }
        }
        else {
            // If something was passed but it's not a SmartBufferOptions object
            if (typeof options !== 'undefined') {
                throw new Error(utils.ERRORS.INVALID_SMARTBUFFER_OBJECT);
            }
            // Otherwise default to sane options
            this._buff = Buffer.allocUnsafe(DEFAULT_SMARTBUFFER_SIZE);
        }
    }
    /**
     * Creates a new SmartBuffer instance with the provided internal Buffer size and optional encoding.
     *
     * @param size { Number } The size of the internal Buffer.
     * @param encoding { String } The BufferEncoding to use for strings.
     *
     * @return { SmartBuffer }
     */
    static fromSize(size, encoding) {
        return new this({
            size: size,
            encoding: encoding
        });
    }
    /**
     * Creates a new SmartBuffer instance with the provided Buffer and optional encoding.
     *
     * @param buffer { Buffer } The Buffer to use as the internal Buffer value.
     * @param encoding { String } The BufferEncoding to use for strings.
     *
     * @return { SmartBuffer }
     */
    static fromBuffer(buff, encoding) {
        return new this({
            buff: buff,
            encoding: encoding
        });
    }
    /**
     * Creates a new SmartBuffer instance with the provided SmartBufferOptions options.
     *
     * @param options { SmartBufferOptions } The options to use when creating the SmartBuffer instance.
     */
    static fromOptions(options) {
        return new this(options);
    }
    /**
     * Type checking function that determines if an object is a SmartBufferOptions object.
     */
    static isSmartBufferOptions(options) {
        const castOptions = options;
        return (castOptions &&
            (castOptions.encoding !== undefined || castOptions.size !== undefined || castOptions.buff !== undefined));
    }
    // Signed integers
    /**
     * Reads an Int8 value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readInt8(offset) {
        return this._readNumberValue(Buffer.prototype.readInt8, 1, offset);
    }
    /**
     * Reads an Int16BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readInt16BE(offset) {
        return this._readNumberValue(Buffer.prototype.readInt16BE, 2, offset);
    }
    /**
     * Reads an Int16LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readInt16LE(offset) {
        return this._readNumberValue(Buffer.prototype.readInt16LE, 2, offset);
    }
    /**
     * Reads an Int32BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readInt32BE(offset) {
        return this._readNumberValue(Buffer.prototype.readInt32BE, 4, offset);
    }
    /**
     * Reads an Int32LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readInt32LE(offset) {
        return this._readNumberValue(Buffer.prototype.readInt32LE, 4, offset);
    }
    /**
     * Reads a BigInt64BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { BigInt }
     */
    readBigInt64BE(offset) {
        utils.bigIntAndBufferInt64Check('readBigInt64BE');
        return this._readNumberValue(Buffer.prototype.readBigInt64BE, 8, offset);
    }
    /**
     * Reads a BigInt64LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { BigInt }
     */
    readBigInt64LE(offset) {
        utils.bigIntAndBufferInt64Check('readBigInt64LE');
        return this._readNumberValue(Buffer.prototype.readBigInt64LE, 8, offset);
    }
    /**
     * Writes an Int8 value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeInt8(value, offset) {
        this._writeNumberValue(Buffer.prototype.writeInt8, 1, value, offset);
        return this;
    }
    /**
     * Inserts an Int8 value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertInt8(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeInt8, 1, value, offset);
    }
    /**
     * Writes an Int16BE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeInt16BE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeInt16BE, 2, value, offset);
    }
    /**
     * Inserts an Int16BE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertInt16BE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeInt16BE, 2, value, offset);
    }
    /**
     * Writes an Int16LE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeInt16LE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeInt16LE, 2, value, offset);
    }
    /**
     * Inserts an Int16LE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertInt16LE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeInt16LE, 2, value, offset);
    }
    /**
     * Writes an Int32BE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeInt32BE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeInt32BE, 4, value, offset);
    }
    /**
     * Inserts an Int32BE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertInt32BE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeInt32BE, 4, value, offset);
    }
    /**
     * Writes an Int32LE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeInt32LE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeInt32LE, 4, value, offset);
    }
    /**
     * Inserts an Int32LE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertInt32LE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeInt32LE, 4, value, offset);
    }
    /**
     * Writes a BigInt64BE value to the current write position (or at optional offset).
     *
     * @param value { BigInt } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeBigInt64BE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigInt64BE');
        return this._writeNumberValue(Buffer.prototype.writeBigInt64BE, 8, value, offset);
    }
    /**
     * Inserts a BigInt64BE value at the given offset value.
     *
     * @param value { BigInt } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertBigInt64BE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigInt64BE');
        return this._insertNumberValue(Buffer.prototype.writeBigInt64BE, 8, value, offset);
    }
    /**
     * Writes a BigInt64LE value to the current write position (or at optional offset).
     *
     * @param value { BigInt } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeBigInt64LE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigInt64LE');
        return this._writeNumberValue(Buffer.prototype.writeBigInt64LE, 8, value, offset);
    }
    /**
     * Inserts a Int64LE value at the given offset value.
     *
     * @param value { BigInt } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertBigInt64LE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigInt64LE');
        return this._insertNumberValue(Buffer.prototype.writeBigInt64LE, 8, value, offset);
    }
    // Unsigned Integers
    /**
     * Reads an UInt8 value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readUInt8(offset) {
        return this._readNumberValue(Buffer.prototype.readUInt8, 1, offset);
    }
    /**
     * Reads an UInt16BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readUInt16BE(offset) {
        return this._readNumberValue(Buffer.prototype.readUInt16BE, 2, offset);
    }
    /**
     * Reads an UInt16LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readUInt16LE(offset) {
        return this._readNumberValue(Buffer.prototype.readUInt16LE, 2, offset);
    }
    /**
     * Reads an UInt32BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readUInt32BE(offset) {
        return this._readNumberValue(Buffer.prototype.readUInt32BE, 4, offset);
    }
    /**
     * Reads an UInt32LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readUInt32LE(offset) {
        return this._readNumberValue(Buffer.prototype.readUInt32LE, 4, offset);
    }
    /**
     * Reads a BigUInt64BE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { BigInt }
     */
    readBigUInt64BE(offset) {
        utils.bigIntAndBufferInt64Check('readBigUInt64BE');
        return this._readNumberValue(Buffer.prototype.readBigUInt64BE, 8, offset);
    }
    /**
     * Reads a BigUInt64LE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { BigInt }
     */
    readBigUInt64LE(offset) {
        utils.bigIntAndBufferInt64Check('readBigUInt64LE');
        return this._readNumberValue(Buffer.prototype.readBigUInt64LE, 8, offset);
    }
    /**
     * Writes an UInt8 value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeUInt8(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeUInt8, 1, value, offset);
    }
    /**
     * Inserts an UInt8 value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertUInt8(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeUInt8, 1, value, offset);
    }
    /**
     * Writes an UInt16BE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeUInt16BE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeUInt16BE, 2, value, offset);
    }
    /**
     * Inserts an UInt16BE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertUInt16BE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeUInt16BE, 2, value, offset);
    }
    /**
     * Writes an UInt16LE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeUInt16LE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeUInt16LE, 2, value, offset);
    }
    /**
     * Inserts an UInt16LE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertUInt16LE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeUInt16LE, 2, value, offset);
    }
    /**
     * Writes an UInt32BE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeUInt32BE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeUInt32BE, 4, value, offset);
    }
    /**
     * Inserts an UInt32BE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertUInt32BE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeUInt32BE, 4, value, offset);
    }
    /**
     * Writes an UInt32LE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeUInt32LE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeUInt32LE, 4, value, offset);
    }
    /**
     * Inserts an UInt32LE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertUInt32LE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeUInt32LE, 4, value, offset);
    }
    /**
     * Writes a BigUInt64BE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeBigUInt64BE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigUInt64BE');
        return this._writeNumberValue(Buffer.prototype.writeBigUInt64BE, 8, value, offset);
    }
    /**
     * Inserts a BigUInt64BE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertBigUInt64BE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigUInt64BE');
        return this._insertNumberValue(Buffer.prototype.writeBigUInt64BE, 8, value, offset);
    }
    /**
     * Writes a BigUInt64LE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeBigUInt64LE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigUInt64LE');
        return this._writeNumberValue(Buffer.prototype.writeBigUInt64LE, 8, value, offset);
    }
    /**
     * Inserts a BigUInt64LE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertBigUInt64LE(value, offset) {
        utils.bigIntAndBufferInt64Check('writeBigUInt64LE');
        return this._insertNumberValue(Buffer.prototype.writeBigUInt64LE, 8, value, offset);
    }
    // Floating Point
    /**
     * Reads an FloatBE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readFloatBE(offset) {
        return this._readNumberValue(Buffer.prototype.readFloatBE, 4, offset);
    }
    /**
     * Reads an FloatLE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readFloatLE(offset) {
        return this._readNumberValue(Buffer.prototype.readFloatLE, 4, offset);
    }
    /**
     * Writes a FloatBE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeFloatBE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeFloatBE, 4, value, offset);
    }
    /**
     * Inserts a FloatBE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertFloatBE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeFloatBE, 4, value, offset);
    }
    /**
     * Writes a FloatLE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeFloatLE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeFloatLE, 4, value, offset);
    }
    /**
     * Inserts a FloatLE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertFloatLE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeFloatLE, 4, value, offset);
    }
    // Double Floating Point
    /**
     * Reads an DoublEBE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readDoubleBE(offset) {
        return this._readNumberValue(Buffer.prototype.readDoubleBE, 8, offset);
    }
    /**
     * Reads an DoubleLE value from the current read position or an optionally provided offset.
     *
     * @param offset { Number } The offset to read data from (optional)
     * @return { Number }
     */
    readDoubleLE(offset) {
        return this._readNumberValue(Buffer.prototype.readDoubleLE, 8, offset);
    }
    /**
     * Writes a DoubleBE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeDoubleBE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeDoubleBE, 8, value, offset);
    }
    /**
     * Inserts a DoubleBE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertDoubleBE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeDoubleBE, 8, value, offset);
    }
    /**
     * Writes a DoubleLE value to the current write position (or at optional offset).
     *
     * @param value { Number } The value to write.
     * @param offset { Number } The offset to write the value at.
     *
     * @return this
     */
    writeDoubleLE(value, offset) {
        return this._writeNumberValue(Buffer.prototype.writeDoubleLE, 8, value, offset);
    }
    /**
     * Inserts a DoubleLE value at the given offset value.
     *
     * @param value { Number } The value to insert.
     * @param offset { Number } The offset to insert the value at.
     *
     * @return this
     */
    insertDoubleLE(value, offset) {
        return this._insertNumberValue(Buffer.prototype.writeDoubleLE, 8, value, offset);
    }
    // Strings
    /**
     * Reads a String from the current read position.
     *
     * @param arg1 { Number | String } The number of bytes to read as a String, or the BufferEncoding to use for
     *             the string (Defaults to instance level encoding).
     * @param encoding { String } The BufferEncoding to use for the string (Defaults to instance level encoding).
     *
     * @return { String }
     */
    readString(arg1, encoding) {
        let lengthVal;
        // Length provided
        if (typeof arg1 === 'number') {
            utils.checkLengthValue(arg1);
            lengthVal = Math.min(arg1, this.length - this._readOffset);
        }
        else {
            encoding = arg1;
            lengthVal = this.length - this._readOffset;
        }
        // Check encoding
        if (typeof encoding !== 'undefined') {
            utils.checkEncoding(encoding);
        }
        const value = this._buff.slice(this._readOffset, this._readOffset + lengthVal).toString(encoding || this._encoding);
        this._readOffset += lengthVal;
        return value;
    }
    /**
     * Inserts a String
     *
     * @param value { String } The String value to insert.
     * @param offset { Number } The offset to insert the string at.
     * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
     *
     * @return this
     */
    insertString(value, offset, encoding) {
        utils.checkOffsetValue(offset);
        return this._handleString(value, true, offset, encoding);
    }
    /**
     * Writes a String
     *
     * @param value { String } The String value to write.
     * @param arg2 { Number | String } The offset to write the string at, or the BufferEncoding to use.
     * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
     *
     * @return this
     */
    writeString(value, arg2, encoding) {
        return this._handleString(value, false, arg2, encoding);
    }
    /**
     * Reads a null-terminated String from the current read position.
     *
     * @param encoding { String } The BufferEncoding to use for the string (Defaults to instance level encoding).
     *
     * @return { String }
     */
    readStringNT(encoding) {
        if (typeof encoding !== 'undefined') {
            utils.checkEncoding(encoding);
        }
        // Set null character position to the end SmartBuffer instance.
        let nullPos = this.length;
        // Find next null character (if one is not found, default from above is used)
        for (let i = this._readOffset; i < this.length; i++) {
            if (this._buff[i] === 0x00) {
                nullPos = i;
                break;
            }
        }
        // Read string value
        const value = this._buff.slice(this._readOffset, nullPos);
        // Increment internal Buffer read offset
        this._readOffset = nullPos + 1;
        return value.toString(encoding || this._encoding);
    }
    /**
     * Inserts a null-terminated String.
     *
     * @param value { String } The String value to write.
     * @param arg2 { Number | String } The offset to write the string to, or the BufferEncoding to use.
     * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
     *
     * @return this
     */
    insertStringNT(value, offset, encoding) {
        utils.checkOffsetValue(offset);
        // Write Values
        this.insertString(value, offset, encoding);
        this.insertUInt8(0x00, offset + value.length);
        return this;
    }
    /**
     * Writes a null-terminated String.
     *
     * @param value { String } The String value to write.
     * @param arg2 { Number | String } The offset to write the string to, or the BufferEncoding to use.
     * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
     *
     * @return this
     */
    writeStringNT(value, arg2, encoding) {
        // Write Values
        this.writeString(value, arg2, encoding);
        this.writeUInt8(0x00, typeof arg2 === 'number' ? arg2 + value.length : this.writeOffset);
        return this;
    }
    // Buffers
    /**
     * Reads a Buffer from the internal read position.
     *
     * @param length { Number } The length of data to read as a Buffer.
     *
     * @return { Buffer }
     */
    readBuffer(length) {
        if (typeof length !== 'undefined') {
            utils.checkLengthValue(length);
        }
        const lengthVal = typeof length === 'number' ? length : this.length;
        const endPoint = Math.min(this.length, this._readOffset + lengthVal);
        // Read buffer value
        const value = this._buff.slice(this._readOffset, endPoint);
        // Increment internal Buffer read offset
        this._readOffset = endPoint;
        return value;
    }
    /**
     * Writes a Buffer to the current write position.
     *
     * @param value { Buffer } The Buffer to write.
     * @param offset { Number } The offset to write the Buffer to.
     *
     * @return this
     */
    insertBuffer(value, offset) {
        utils.checkOffsetValue(offset);
        return this._handleBuffer(value, true, offset);
    }
    /**
     * Writes a Buffer to the current write position.
     *
     * @param value { Buffer } The Buffer to write.
     * @param offset { Number } The offset to write the Buffer to.
     *
     * @return this
     */
    writeBuffer(value, offset) {
        return this._handleBuffer(value, false, offset);
    }
    /**
     * Reads a null-terminated Buffer from the current read poisiton.
     *
     * @return { Buffer }
     */
    readBufferNT() {
        // Set null character position to the end SmartBuffer instance.
        let nullPos = this.length;
        // Find next null character (if one is not found, default from above is used)
        for (let i = this._readOffset; i < this.length; i++) {
            if (this._buff[i] === 0x00) {
                nullPos = i;
                break;
            }
        }
        // Read value
        const value = this._buff.slice(this._readOffset, nullPos);
        // Increment internal Buffer read offset
        this._readOffset = nullPos + 1;
        return value;
    }
    /**
     * Inserts a null-terminated Buffer.
     *
     * @param value { Buffer } The Buffer to write.
     * @param offset { Number } The offset to write the Buffer to.
     *
     * @return this
     */
    insertBufferNT(value, offset) {
        utils.checkOffsetValue(offset);
        // Write Values
        this.insertBuffer(value, offset);
        this.insertUInt8(0x00, offset + value.length);
        return this;
    }
    /**
     * Writes a null-terminated Buffer.
     *
     * @param value { Buffer } The Buffer to write.
     * @param offset { Number } The offset to write the Buffer to.
     *
     * @return this
     */
    writeBufferNT(value, offset) {
        // Checks for valid numberic value;
        if (typeof offset !== 'undefined') {
            utils.checkOffsetValue(offset);
        }
        // Write Values
        this.writeBuffer(value, offset);
        this.writeUInt8(0x00, typeof offset === 'number' ? offset + value.length : this._writeOffset);
        return this;
    }
    /**
     * Clears the SmartBuffer instance to its original empty state.
     */
    clear() {
        this._writeOffset = 0;
        this._readOffset = 0;
        this.length = 0;
        return this;
    }
    /**
     * Gets the remaining data left to be read from the SmartBuffer instance.
     *
     * @return { Number }
     */
    remaining() {
        return this.length - this._readOffset;
    }
    /**
     * Gets the current read offset value of the SmartBuffer instance.
     *
     * @return { Number }
     */
    get readOffset() {
        return this._readOffset;
    }
    /**
     * Sets the read offset value of the SmartBuffer instance.
     *
     * @param offset { Number } - The offset value to set.
     */
    set readOffset(offset) {
        utils.checkOffsetValue(offset);
        // Check for bounds.
        utils.checkTargetOffset(offset, this);
        this._readOffset = offset;
    }
    /**
     * Gets the current write offset value of the SmartBuffer instance.
     *
     * @return { Number }
     */
    get writeOffset() {
        return this._writeOffset;
    }
    /**
     * Sets the write offset value of the SmartBuffer instance.
     *
     * @param offset { Number } - The offset value to set.
     */
    set writeOffset(offset) {
        utils.checkOffsetValue(offset);
        // Check for bounds.
        utils.checkTargetOffset(offset, this);
        this._writeOffset = offset;
    }
    /**
     * Gets the currently set string encoding of the SmartBuffer instance.
     *
     * @return { BufferEncoding } The string Buffer encoding currently set.
     */
    get encoding() {
        return this._encoding;
    }
    /**
     * Sets the string encoding of the SmartBuffer instance.
     *
     * @param encoding { BufferEncoding } The string Buffer encoding to set.
     */
    set encoding(encoding) {
        utils.checkEncoding(encoding);
        this._encoding = encoding;
    }
    /**
     * Gets the underlying internal Buffer. (This includes unmanaged data in the Buffer)
     *
     * @return { Buffer } The Buffer value.
     */
    get internalBuffer() {
        return this._buff;
    }
    /**
     * Gets the value of the internal managed Buffer (Includes managed data only)
     *
     * @param { Buffer }
     */
    toBuffer() {
        return this._buff.slice(0, this.length);
    }
    /**
     * Gets the String value of the internal managed Buffer
     *
     * @param encoding { String } The BufferEncoding to display the Buffer as (defaults to instance level encoding).
     */
    toString(encoding) {
        const encodingVal = typeof encoding === 'string' ? encoding : this._encoding;
        // Check for invalid encoding.
        utils.checkEncoding(encodingVal);
        return this._buff.toString(encodingVal, 0, this.length);
    }
    /**
     * Destroys the SmartBuffer instance.
     */
    destroy() {
        this.clear();
        return this;
    }
    /**
     * Handles inserting and writing strings.
     *
     * @param value { String } The String value to insert.
     * @param isInsert { Boolean } True if inserting a string, false if writing.
     * @param arg2 { Number | String } The offset to insert the string at, or the BufferEncoding to use.
     * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
     */
    _handleString(value, isInsert, arg3, encoding) {
        let offsetVal = this._writeOffset;
        let encodingVal = this._encoding;
        // Check for offset
        if (typeof arg3 === 'number') {
            offsetVal = arg3;
            // Check for encoding
        }
        else if (typeof arg3 === 'string') {
            utils.checkEncoding(arg3);
            encodingVal = arg3;
        }
        // Check for encoding (third param)
        if (typeof encoding === 'string') {
            utils.checkEncoding(encoding);
            encodingVal = encoding;
        }
        // Calculate bytelength of string.
        const byteLength = Buffer.byteLength(value, encodingVal);
        // Ensure there is enough internal Buffer capacity.
        if (isInsert) {
            this.ensureInsertable(byteLength, offsetVal);
        }
        else {
            this._ensureWriteable(byteLength, offsetVal);
        }
        // Write value
        this._buff.write(value, offsetVal, byteLength, encodingVal);
        // Increment internal Buffer write offset;
        if (isInsert) {
            this._writeOffset += byteLength;
        }
        else {
            // If an offset was given, check to see if we wrote beyond the current writeOffset.
            if (typeof arg3 === 'number') {
                this._writeOffset = Math.max(this._writeOffset, offsetVal + byteLength);
            }
            else {
                // If no offset was given, we wrote to the end of the SmartBuffer so increment writeOffset.
                this._writeOffset += byteLength;
            }
        }
        return this;
    }
    /**
     * Handles writing or insert of a Buffer.
     *
     * @param value { Buffer } The Buffer to write.
     * @param offset { Number } The offset to write the Buffer to.
     */
    _handleBuffer(value, isInsert, offset) {
        const offsetVal = typeof offset === 'number' ? offset : this._writeOffset;
        // Ensure there is enough internal Buffer capacity.
        if (isInsert) {
            this.ensureInsertable(value.length, offsetVal);
        }
        else {
            this._ensureWriteable(value.length, offsetVal);
        }
        // Write buffer value
        value.copy(this._buff, offsetVal);
        // Increment internal Buffer write offset;
        if (isInsert) {
            this._writeOffset += value.length;
        }
        else {
            // If an offset was given, check to see if we wrote beyond the current writeOffset.
            if (typeof offset === 'number') {
                this._writeOffset = Math.max(this._writeOffset, offsetVal + value.length);
            }
            else {
                // If no offset was given, we wrote to the end of the SmartBuffer so increment writeOffset.
                this._writeOffset += value.length;
            }
        }
        return this;
    }
    /**
     * Ensures that the internal Buffer is large enough to read data.
     *
     * @param length { Number } The length of the data that needs to be read.
     * @param offset { Number } The offset of the data that needs to be read.
     */
    ensureReadable(length, offset) {
        // Offset value defaults to managed read offset.
        let offsetVal = this._readOffset;
        // If an offset was provided, use it.
        if (typeof offset !== 'undefined') {
            // Checks for valid numberic value;
            utils.checkOffsetValue(offset);
            // Overide with custom offset.
            offsetVal = offset;
        }
        // Checks if offset is below zero, or the offset+length offset is beyond the total length of the managed data.
        if (offsetVal < 0 || offsetVal + length > this.length) {
            throw new Error(utils.ERRORS.INVALID_READ_BEYOND_BOUNDS);
        }
    }
    /**
     * Ensures that the internal Buffer is large enough to insert data.
     *
     * @param dataLength { Number } The length of the data that needs to be written.
     * @param offset { Number } The offset of the data to be written.
     */
    ensureInsertable(dataLength, offset) {
        // Checks for valid numberic value;
        utils.checkOffsetValue(offset);
        // Ensure there is enough internal Buffer capacity.
        this._ensureCapacity(this.length + dataLength);
        // If an offset was provided and its not the very end of the buffer, copy data into appropriate location in regards to the offset.
        if (offset < this.length) {
            this._buff.copy(this._buff, offset + dataLength, offset, this._buff.length);
        }
        // Adjust tracked smart buffer length
        if (offset + dataLength > this.length) {
            this.length = offset + dataLength;
        }
        else {
            this.length += dataLength;
        }
    }
    /**
     * Ensures that the internal Buffer is large enough to write data.
     *
     * @param dataLength { Number } The length of the data that needs to be written.
     * @param offset { Number } The offset of the data to be written (defaults to writeOffset).
     */
    _ensureWriteable(dataLength, offset) {
        const offsetVal = typeof offset === 'number' ? offset : this._writeOffset;
        // Ensure enough capacity to write data.
        this._ensureCapacity(offsetVal + dataLength);
        // Adjust SmartBuffer length (if offset + length is larger than managed length, adjust length)
        if (offsetVal + dataLength > this.length) {
            this.length = offsetVal + dataLength;
        }
    }
    /**
     * Ensures that the internal Buffer is large enough to write at least the given amount of data.
     *
     * @param minLength { Number } The minimum length of the data needs to be written.
     */
    _ensureCapacity(minLength) {
        const oldLength = this._buff.length;
        if (minLength > oldLength) {
            let data = this._buff;
            let newLength = (oldLength * 3) / 2 + 1;
            if (newLength < minLength) {
                newLength = minLength;
            }
            this._buff = Buffer.allocUnsafe(newLength);
            data.copy(this._buff, 0, 0, oldLength);
        }
    }
    /**
     * Reads a numeric number value using the provided function.
     *
     * @typeparam T { number | bigint } The type of the value to be read
     *
     * @param func { Function(offset: number) => number } The function to read data on the internal Buffer with.
     * @param byteSize { Number } The number of bytes read.
     * @param offset { Number } The offset to read from (optional). When this is not provided, the managed readOffset is used instead.
     *
     * @returns { T } the number value
     */
    _readNumberValue(func, byteSize, offset) {
        this.ensureReadable(byteSize, offset);
        // Call Buffer.readXXXX();
        const value = func.call(this._buff, typeof offset === 'number' ? offset : this._readOffset);
        // Adjust internal read offset if an optional read offset was not provided.
        if (typeof offset === 'undefined') {
            this._readOffset += byteSize;
        }
        return value;
    }
    /**
     * Inserts a numeric number value based on the given offset and value.
     *
     * @typeparam T { number | bigint } The type of the value to be written
     *
     * @param func { Function(offset: T, offset?) => number} The function to write data on the internal Buffer with.
     * @param byteSize { Number } The number of bytes written.
     * @param value { T } The number value to write.
     * @param offset { Number } the offset to write the number at (REQUIRED).
     *
     * @returns SmartBuffer this buffer
     */
    _insertNumberValue(func, byteSize, value, offset) {
        // Check for invalid offset values.
        utils.checkOffsetValue(offset);
        // Ensure there is enough internal Buffer capacity. (raw offset is passed)
        this.ensureInsertable(byteSize, offset);
        // Call buffer.writeXXXX();
        func.call(this._buff, value, offset);
        // Adjusts internally managed write offset.
        this._writeOffset += byteSize;
        return this;
    }
    /**
     * Writes a numeric number value based on the given offset and value.
     *
     * @typeparam T { number | bigint } The type of the value to be written
     *
     * @param func { Function(offset: T, offset?) => number} The function to write data on the internal Buffer with.
     * @param byteSize { Number } The number of bytes written.
     * @param value { T } The number value to write.
     * @param offset { Number } the offset to write the number at (REQUIRED).
     *
     * @returns SmartBuffer this buffer
     */
    _writeNumberValue(func, byteSize, value, offset) {
        // If an offset was provided, validate it.
        if (typeof offset === 'number') {
            // Check if we're writing beyond the bounds of the managed data.
            if (offset < 0) {
                throw new Error(utils.ERRORS.INVALID_WRITE_BEYOND_BOUNDS);
            }
            utils.checkOffsetValue(offset);
        }
        // Default to writeOffset if no offset value was given.
        const offsetVal = typeof offset === 'number' ? offset : this._writeOffset;
        // Ensure there is enough internal Buffer capacity. (raw offset is passed)
        this._ensureWriteable(byteSize, offsetVal);
        func.call(this._buff, value, offsetVal);
        // If an offset was given, check to see if we wrote beyond the current writeOffset.
        if (typeof offset === 'number') {
            this._writeOffset = Math.max(this._writeOffset, offsetVal + byteSize);
        }
        else {
            // If no numeric offset was given, we wrote to the end of the SmartBuffer so increment writeOffset.
            this._writeOffset += byteSize;
        }
        return this;
    }
}
exports.SmartBuffer = SmartBuffer;

});

var binary_parser = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




var aliasRegistry = {};
var FUNCTION_PREFIX = '___parser_';
var FUNCTION_ENCODE_PREFIX = '___encoder_';
var PRIMITIVE_SIZES = {
    uint8: 1,
    uint16le: 2,
    uint16be: 2,
    uint32le: 4,
    uint32be: 4,
    int8: 1,
    int16le: 2,
    int16be: 2,
    int32le: 4,
    int32be: 4,
    int64be: 8,
    int64le: 8,
    uint64be: 8,
    uint64le: 8,
    floatle: 4,
    floatbe: 4,
    doublele: 8,
    doublebe: 8,
};
var CAPITILIZED_TYPE_NAMES = {
    uint8: 'UInt8',
    uint16le: 'UInt16LE',
    uint16be: 'UInt16BE',
    uint32le: 'UInt32LE',
    uint32be: 'UInt32BE',
    int8: 'Int8',
    int16le: 'Int16LE',
    int16be: 'Int16BE',
    int32le: 'Int32LE',
    int32be: 'Int32BE',
    int64be: 'BigInt64BE',
    int64le: 'BigInt64LE',
    uint64be: 'BigUInt64BE',
    uint64le: 'BigUInt64LE',
    floatle: 'FloatLE',
    floatbe: 'FloatBE',
    doublele: 'DoubleLE',
    doublebe: 'DoubleBE',
    bit: 'Bit',
    string: 'String',
    buffer: 'Buffer',
    array: 'Array',
    choice: 'Choice',
    nest: 'Nest',
    seek: 'Seek',
    pointer: 'Pointer',
    saveOffset: 'SaveOffset',
    '': '',
};
var Parser = /** @class */ (function () {
    function Parser(opts) {
        this.varName = '';
        this.type = '';
        this.options = {};
        this.next = null;
        this.head = null;
        this.compiled = null;
        this.compiledEncode = null;
        this.endian = 'be';
        this.constructorFn = null;
        this.alias = null;
        this.smartBufferSize =
            opts && typeof opts === 'object' && opts.smartBufferSize
                ? opts.smartBufferSize
                : 256;
        this.encoderOpts = {
            bitEndianess: false,
        };
    }
    Parser.start = function (opts) {
        return new Parser(opts);
    };
    Parser.prototype.primitiveGenerateN = function (type, ctx) {
        var typeName = CAPITILIZED_TYPE_NAMES[type];
        ctx.pushCode(ctx.generateVariable(this.varName) + " = buffer.read" + typeName + "(offset);");
        ctx.pushCode("offset += " + PRIMITIVE_SIZES[type] + ";");
    };
    Parser.prototype.primitiveGenerate_encodeN = function (type, ctx) {
        var typeName = CAPITILIZED_TYPE_NAMES[type];
        ctx.pushCode("smartBuffer.write" + typeName + "(" + ctx.generateVariable(this.varName) + ");");
    };
    Parser.prototype.primitiveN = function (type, varName, options) {
        return this.setNextParser(type, varName, options);
    };
    Parser.prototype.useThisEndian = function (type) {
        return (type + this.endian.toLowerCase());
    };
    Parser.prototype.uint8 = function (varName, options) {
        return this.primitiveN('uint8', varName, options);
    };
    Parser.prototype.uint16 = function (varName, options) {
        return this.primitiveN(this.useThisEndian('uint16'), varName, options);
    };
    Parser.prototype.uint16le = function (varName, options) {
        return this.primitiveN('uint16le', varName, options);
    };
    Parser.prototype.uint16be = function (varName, options) {
        return this.primitiveN('uint16be', varName, options);
    };
    Parser.prototype.uint32 = function (varName, options) {
        return this.primitiveN(this.useThisEndian('uint32'), varName, options);
    };
    Parser.prototype.uint32le = function (varName, options) {
        return this.primitiveN('uint32le', varName, options);
    };
    Parser.prototype.uint32be = function (varName, options) {
        return this.primitiveN('uint32be', varName, options);
    };
    Parser.prototype.int8 = function (varName, options) {
        return this.primitiveN('int8', varName, options);
    };
    Parser.prototype.int16 = function (varName, options) {
        return this.primitiveN(this.useThisEndian('int16'), varName, options);
    };
    Parser.prototype.int16le = function (varName, options) {
        return this.primitiveN('int16le', varName, options);
    };
    Parser.prototype.int16be = function (varName, options) {
        return this.primitiveN('int16be', varName, options);
    };
    Parser.prototype.int32 = function (varName, options) {
        return this.primitiveN(this.useThisEndian('int32'), varName, options);
    };
    Parser.prototype.int32le = function (varName, options) {
        return this.primitiveN('int32le', varName, options);
    };
    Parser.prototype.int32be = function (varName, options) {
        return this.primitiveN('int32be', varName, options);
    };
    Parser.prototype.bigIntVersionCheck = function () {
        var major = process.version.replace('v', '').split('.')[0];
        if (Number(major) < 12) {
            throw new Error("The methods readBigInt64BE, readBigInt64BE, readBigInt64BE, readBigInt64BE are not avilable in your version of nodejs: " + process.version + ", you must use v12 or greater");
        }
    };
    Parser.prototype.int64 = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN(this.useThisEndian('int64'), varName, options);
    };
    Parser.prototype.int64be = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN('int64be', varName, options);
    };
    Parser.prototype.int64le = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN('int64le', varName, options);
    };
    Parser.prototype.uint64 = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN(this.useThisEndian('uint64'), varName, options);
    };
    Parser.prototype.uint64be = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN('uint64be', varName, options);
    };
    Parser.prototype.uint64le = function (varName, options) {
        this.bigIntVersionCheck();
        return this.primitiveN('uint64le', varName, options);
    };
    Parser.prototype.floatle = function (varName, options) {
        return this.primitiveN('floatle', varName, options);
    };
    Parser.prototype.floatbe = function (varName, options) {
        return this.primitiveN('floatbe', varName, options);
    };
    Parser.prototype.doublele = function (varName, options) {
        return this.primitiveN('doublele', varName, options);
    };
    Parser.prototype.doublebe = function (varName, options) {
        return this.primitiveN('doublebe', varName, options);
    };
    Parser.prototype.bitN = function (size, varName, options) {
        if (!options) {
            options = {};
        }
        options.length = size;
        return this.setNextParser('bit', varName, options);
    };
    Parser.prototype.bit1 = function (varName, options) {
        return this.bitN(1, varName, options);
    };
    Parser.prototype.bit2 = function (varName, options) {
        return this.bitN(2, varName, options);
    };
    Parser.prototype.bit3 = function (varName, options) {
        return this.bitN(3, varName, options);
    };
    Parser.prototype.bit4 = function (varName, options) {
        return this.bitN(4, varName, options);
    };
    Parser.prototype.bit5 = function (varName, options) {
        return this.bitN(5, varName, options);
    };
    Parser.prototype.bit6 = function (varName, options) {
        return this.bitN(6, varName, options);
    };
    Parser.prototype.bit7 = function (varName, options) {
        return this.bitN(7, varName, options);
    };
    Parser.prototype.bit8 = function (varName, options) {
        return this.bitN(8, varName, options);
    };
    Parser.prototype.bit9 = function (varName, options) {
        return this.bitN(9, varName, options);
    };
    Parser.prototype.bit10 = function (varName, options) {
        return this.bitN(10, varName, options);
    };
    Parser.prototype.bit11 = function (varName, options) {
        return this.bitN(11, varName, options);
    };
    Parser.prototype.bit12 = function (varName, options) {
        return this.bitN(12, varName, options);
    };
    Parser.prototype.bit13 = function (varName, options) {
        return this.bitN(13, varName, options);
    };
    Parser.prototype.bit14 = function (varName, options) {
        return this.bitN(14, varName, options);
    };
    Parser.prototype.bit15 = function (varName, options) {
        return this.bitN(15, varName, options);
    };
    Parser.prototype.bit16 = function (varName, options) {
        return this.bitN(16, varName, options);
    };
    Parser.prototype.bit17 = function (varName, options) {
        return this.bitN(17, varName, options);
    };
    Parser.prototype.bit18 = function (varName, options) {
        return this.bitN(18, varName, options);
    };
    Parser.prototype.bit19 = function (varName, options) {
        return this.bitN(19, varName, options);
    };
    Parser.prototype.bit20 = function (varName, options) {
        return this.bitN(20, varName, options);
    };
    Parser.prototype.bit21 = function (varName, options) {
        return this.bitN(21, varName, options);
    };
    Parser.prototype.bit22 = function (varName, options) {
        return this.bitN(22, varName, options);
    };
    Parser.prototype.bit23 = function (varName, options) {
        return this.bitN(23, varName, options);
    };
    Parser.prototype.bit24 = function (varName, options) {
        return this.bitN(24, varName, options);
    };
    Parser.prototype.bit25 = function (varName, options) {
        return this.bitN(25, varName, options);
    };
    Parser.prototype.bit26 = function (varName, options) {
        return this.bitN(26, varName, options);
    };
    Parser.prototype.bit27 = function (varName, options) {
        return this.bitN(27, varName, options);
    };
    Parser.prototype.bit28 = function (varName, options) {
        return this.bitN(28, varName, options);
    };
    Parser.prototype.bit29 = function (varName, options) {
        return this.bitN(29, varName, options);
    };
    Parser.prototype.bit30 = function (varName, options) {
        return this.bitN(30, varName, options);
    };
    Parser.prototype.bit31 = function (varName, options) {
        return this.bitN(31, varName, options);
    };
    Parser.prototype.bit32 = function (varName, options) {
        return this.bitN(32, varName, options);
    };
    Parser.prototype.namely = function (alias) {
        aliasRegistry[alias] = this;
        this.alias = alias;
        return this;
    };
    Parser.prototype.skip = function (length, options) {
        return this.seek(length, options);
    };
    Parser.prototype.seek = function (relOffset, options) {
        if (options && options.assert) {
            throw new Error('assert option on seek is not allowed.');
        }
        return this.setNextParser('seek', '', { length: relOffset });
    };
    Parser.prototype.string = function (varName, options) {
        if (!options.zeroTerminated && !options.length && !options.greedy) {
            throw new Error('Neither length, zeroTerminated, nor greedy is defined for string.');
        }
        if ((options.zeroTerminated || options.length) && options.greedy) {
            throw new Error('greedy is mutually exclusive with length and zeroTerminated for string.');
        }
        if (options.stripNull && !(options.length || options.greedy)) {
            throw new Error('Length or greedy must be defined if stripNull is defined.');
        }
        options.encoding = options.encoding || 'utf8';
        return this.setNextParser('string', varName, options);
    };
    Parser.prototype.buffer = function (varName, options) {
        if (!options.length && !options.readUntil) {
            throw new Error('Length nor readUntil is defined in buffer parser');
        }
        return this.setNextParser('buffer', varName, options);
    };
    Parser.prototype.array = function (varName, options) {
        if (!options.readUntil && !options.length && !options.lengthInBytes) {
            throw new Error('Length option of array is not defined.');
        }
        if (!options.type) {
            throw new Error('Type option of array is not defined.');
        }
        if (typeof options.type === 'string' &&
            !aliasRegistry[options.type] &&
            Object.keys(PRIMITIVE_SIZES).indexOf(options.type) < 0) {
            throw new Error("Specified primitive type \"" + options.type + "\" is not supported.");
        }
        return this.setNextParser('array', varName, options);
    };
    Parser.prototype.choice = function (varName, options) {
        if (typeof options !== 'object' && typeof varName === 'object') {
            options = varName;
            varName = null;
        }
        if (!options.tag) {
            throw new Error('Tag option of array is not defined.');
        }
        if (!options.choices) {
            throw new Error('Choices option of array is not defined.');
        }
        Object.keys(options.choices).forEach(function (keyString) {
            var key = parseInt(keyString, 10);
            var value = options.choices[key];
            if (isNaN(key)) {
                throw new Error('Key of choices must be a number.');
            }
            if (!value) {
                throw new Error("Choice Case " + keyString + " of " + varName + " is not valid.");
            }
            if (typeof value === 'string' &&
                !aliasRegistry[value] &&
                Object.keys(PRIMITIVE_SIZES).indexOf(value) < 0) {
                throw new Error("Specified primitive type \"" + value + "\" is not supported.");
            }
        });
        return this.setNextParser('choice', varName, options);
    };
    Parser.prototype.nest = function (varName, options) {
        if (typeof options !== 'object' && typeof varName === 'object') {
            options = varName;
            varName = null;
        }
        if (!options.type) {
            throw new Error('Type option of nest is not defined.');
        }
        if (!(options.type instanceof Parser) && !aliasRegistry[options.type]) {
            throw new Error('Type option of nest must be a Parser object.');
        }
        if (!(options.type instanceof Parser) && !varName) {
            throw new Error('options.type must be a object if variable name is omitted.');
        }
        return this.setNextParser('nest', varName, options);
    };
    Parser.prototype.pointer = function (varName, options) {
        if (!options.offset) {
            throw new Error('Offset option of pointer is not defined.');
        }
        if (!options.type) {
            throw new Error('Type option of pointer is not defined.');
        }
        else if (typeof options.type === 'string') {
            if (Object.keys(PRIMITIVE_SIZES).indexOf(options.type) < 0 &&
                !aliasRegistry[options.type]) {
                throw new Error('Specified type "' + options.type + '" is not supported.');
            }
        }
        else if (options.type instanceof Parser) ;
        else {
            throw new Error('Type option of pointer must be a string or a Parser object.');
        }
        return this.setNextParser('pointer', varName, options);
    };
    Parser.prototype.saveOffset = function (varName, options) {
        return this.setNextParser('saveOffset', varName, options);
    };
    Parser.prototype.endianess = function (endianess) {
        switch (endianess.toLowerCase()) {
            case 'little':
                this.endian = 'le';
                break;
            case 'big':
                this.endian = 'be';
                break;
            default:
                throw new Error("Invalid endianess: " + endianess);
        }
        return this;
    };
    Parser.prototype.encoderSetOptions = function (opts) {
        Object.assign(this.encoderOpts, opts);
        return this;
    };
    Parser.prototype.create = function (constructorFn) {
        if (!(constructorFn instanceof Function)) {
            throw new Error('Constructor must be a Function object.');
        }
        this.constructorFn = constructorFn;
        return this;
    };
    Parser.prototype.getCode = function () {
        var ctx = new context.Context();
        ctx.pushCode('if (!Buffer.isBuffer(buffer)) {');
        ctx.generateError('"argument buffer is not a Buffer object"');
        ctx.pushCode('}');
        if (!this.alias) {
            this.addRawCode(ctx);
        }
        else {
            this.addAliasedCode(ctx);
        }
        if (this.alias) {
            ctx.pushCode("return " + (FUNCTION_PREFIX + this.alias) + "(0).result;");
        }
        else {
            ctx.pushCode('return vars;');
        }
        return ctx.code;
    };
    Parser.prototype.getCodeEncode = function () {
        var ctx = new context.Context();
        ctx.pushCode('if (!obj || typeof obj !== "object") {');
        ctx.generateError('"argument obj is not an object"');
        ctx.pushCode('}');
        if (!this.alias) {
            this.addRawCodeEncode(ctx);
        }
        else {
            this.addAliasedCodeEncode(ctx);
            ctx.pushCode("return " + (FUNCTION_ENCODE_PREFIX + this.alias) + "(obj);");
        }
        return ctx.code;
    };
    Parser.prototype.addRawCode = function (ctx) {
        ctx.pushCode('var offset = 0;');
        if (this.constructorFn) {
            ctx.pushCode('var vars = new constructorFn();');
        }
        else {
            ctx.pushCode('var vars = {};');
        }
        this.generate(ctx);
        this.resolveReferences(ctx);
        ctx.pushCode('return vars;');
    };
    Parser.prototype.addRawCodeEncode = function (ctx) {
        ctx.pushCode('var vars = obj;');
        ctx.pushCode("var smartBuffer = SmartBuffer.fromOptions({size: " + this.smartBufferSize + ", encoding: \"utf8\"});");
        this.generateEncode(ctx);
        this.resolveReferences(ctx, 'encode');
        ctx.pushCode('return smartBuffer.toBuffer();');
    };
    Parser.prototype.addAliasedCode = function (ctx) {
        ctx.pushCode("function " + (FUNCTION_PREFIX + this.alias) + "(offset) {");
        if (this.constructorFn) {
            ctx.pushCode('var vars = new constructorFn();');
        }
        else {
            ctx.pushCode('var vars = {};');
        }
        this.generate(ctx);
        ctx.markResolved(this.alias);
        this.resolveReferences(ctx);
        ctx.pushCode('return { offset: offset, result: vars };');
        ctx.pushCode('}');
        return ctx;
    };
    Parser.prototype.addAliasedCodeEncode = function (ctx) {
        ctx.pushCode("function " + (FUNCTION_ENCODE_PREFIX + this.alias) + "(obj) {");
        ctx.pushCode('var vars = obj;');
        ctx.pushCode("var smartBuffer = SmartBuffer.fromOptions({size: " + this.smartBufferSize + ", encoding: \"utf8\"});");
        this.generateEncode(ctx);
        ctx.markResolved(this.alias);
        this.resolveReferences(ctx, 'encode');
        ctx.pushCode('return smartBuffer.toBuffer();');
        ctx.pushCode('}');
        return ctx;
    };
    Parser.prototype.resolveReferences = function (ctx, encode) {
        var references = ctx.getUnresolvedReferences();
        ctx.markRequested(references);
        references.forEach(function (alias) {
            var parser = aliasRegistry[alias];
            if (encode) {
                parser.addAliasedCodeEncode(ctx);
            }
            else {
                parser.addAliasedCode(ctx);
            }
        });
    };
    Parser.prototype.compile = function () {
        var src = '(function(buffer, constructorFn) { ' + this.getCode() + ' })';
        this.compiled = vm_1.runInNewContext(src, { Buffer: buffer_1.Buffer });
    };
    Parser.prototype.compileEncode = function () {
        var src = '(function(obj) { ' + this.getCodeEncode() + ' })';
        this.compiledEncode = vm_1.runInNewContext(src, { Buffer: buffer_1.Buffer, SmartBuffer: smartbuffer.SmartBuffer });
    };
    Parser.prototype.sizeOf = function () {
        var size = NaN;
        if (Object.keys(PRIMITIVE_SIZES).indexOf(this.type) >= 0) {
            size = PRIMITIVE_SIZES[this.type];
            // if this is a fixed length string
        }
        else if (this.type === 'string' &&
            typeof this.options.length === 'number') {
            size = this.options.length;
            // if this is a fixed length buffer
        }
        else if (this.type === 'buffer' &&
            typeof this.options.length === 'number') {
            size = this.options.length;
            // if this is a fixed length array
        }
        else if (this.type === 'array' &&
            typeof this.options.length === 'number') {
            var elementSize = NaN;
            if (typeof this.options.type === 'string') {
                elementSize = PRIMITIVE_SIZES[this.options.type];
            }
            else if (this.options.type instanceof Parser) {
                elementSize = this.options.type.sizeOf();
            }
            size = this.options.length * elementSize;
            // if this a skip
        }
        else if (this.type === 'seek') {
            size = this.options.length;
            // if this is a nested parser
        }
        else if (this.type === 'nest') {
            size = this.options.type.sizeOf();
        }
        else if (!this.type) {
            size = 0;
        }
        if (this.next) {
            size += this.next.sizeOf();
        }
        return size;
    };
    // Follow the parser chain till the root and start parsing from there
    Parser.prototype.parse = function (buffer) {
        if (!this.compiled) {
            this.compile();
        }
        return this.compiled(buffer, this.constructorFn);
    };
    // Follow the parser chain till the root and start encoding from there
    Parser.prototype.encode = function (obj) {
        if (!this.compiledEncode) {
            this.compileEncode();
        }
        return this.compiledEncode(obj);
    };
    Parser.prototype.setNextParser = function (type, varName, options) {
        var parser = new Parser();
        parser.type = type;
        parser.varName = varName;
        parser.options = options || parser.options;
        parser.endian = this.endian;
        parser.encoderOpts = this.encoderOpts;
        if (this.head) {
            this.head.next = parser;
        }
        else {
            this.next = parser;
        }
        this.head = parser;
        return this;
    };
    // Call code generator for this parser
    Parser.prototype.generate = function (ctx) {
        if (this.type) {
            switch (this.type) {
                case 'uint8':
                case 'uint16le':
                case 'uint16be':
                case 'uint32le':
                case 'uint32be':
                case 'int8':
                case 'int16le':
                case 'int16be':
                case 'int32le':
                case 'int32be':
                case 'int64be':
                case 'int64le':
                case 'uint64be':
                case 'uint64le':
                case 'floatle':
                case 'floatbe':
                case 'doublele':
                case 'doublebe':
                    this.primitiveGenerateN(this.type, ctx);
                    break;
                case 'bit':
                    this.generateBit(ctx);
                    break;
                case 'string':
                    this.generateString(ctx);
                    break;
                case 'buffer':
                    this.generateBuffer(ctx);
                    break;
                case 'seek':
                    this.generateSeek(ctx);
                    break;
                case 'nest':
                    this.generateNest(ctx);
                    break;
                case 'array':
                    this.generateArray(ctx);
                    break;
                case 'choice':
                    this.generateChoice(ctx);
                    break;
                case 'pointer':
                    this.generatePointer(ctx);
                    break;
                case 'saveOffset':
                    this.generateSaveOffset(ctx);
                    break;
            }
            this.generateAssert(ctx);
        }
        var varName = ctx.generateVariable(this.varName);
        if (this.options.formatter) {
            this.generateFormatter(ctx, varName, this.options.formatter);
        }
        return this.generateNext(ctx);
    };
    Parser.prototype.generateEncode = function (ctx) {
        var savVarName = ctx.generateTmpVariable();
        var varName = ctx.generateVariable(this.varName);
        // Transform with the possibly provided encoder before encoding
        if (this.options.encoder) {
            ctx.pushCode("var " + savVarName + " = " + varName);
            this.generateEncoder(ctx, varName, this.options.encoder);
        }
        if (this.type) {
            switch (this.type) {
                case 'uint8':
                case 'uint16le':
                case 'uint16be':
                case 'uint32le':
                case 'uint32be':
                case 'int8':
                case 'int16le':
                case 'int16be':
                case 'int32le':
                case 'int32be':
                case 'int64be':
                case 'int64le':
                case 'uint64be':
                case 'uint64le':
                case 'floatle':
                case 'floatbe':
                case 'doublele':
                case 'doublebe':
                    this.primitiveGenerate_encodeN(this.type, ctx);
                    break;
                case 'bit':
                    this.generate_encodeBit(ctx);
                    break;
                case 'string':
                    this.generate_encodeString(ctx);
                    break;
                case 'buffer':
                    this.generate_encodeBuffer(ctx);
                    break;
                case 'seek':
                    this.generate_encodeSeek(ctx);
                    break;
                case 'nest':
                    this.generate_encodeNest(ctx);
                    break;
                case 'array':
                    this.generate_encodeArray(ctx);
                    break;
                case 'choice':
                    this.generate_encodeChoice(ctx);
                    break;
                case 'pointer':
                    this.generate_encodePointer(ctx);
                    break;
                case 'saveOffset':
                    this.generate_encodeSaveOffset(ctx);
                    break;
            }
            this.generateAssert(ctx);
        }
        if (this.options.encoder) {
            // Restore varName after encoder transformation so that next parsers will
            // have access to original field value (but not nested ones)
            ctx.pushCode(varName + " = " + savVarName + ";");
        }
        return this.generateEncodeNext(ctx);
    };
    Parser.prototype.generateAssert = function (ctx) {
        if (!this.options.assert) {
            return;
        }
        var varName = ctx.generateVariable(this.varName);
        switch (typeof this.options.assert) {
            case 'function':
                ctx.pushCode("if (!(" + this.options.assert + ").call(vars, " + varName + ")) {");
                break;
            case 'number':
                ctx.pushCode("if (" + this.options.assert + " !== " + varName + ") {");
                break;
            case 'string':
                ctx.pushCode("if (\"" + this.options.assert + "\" !== " + varName + ") {");
                break;
            default:
                throw new Error('Assert option supports only strings, numbers and assert functions.');
        }
        ctx.generateError("\"Assert error: " + varName + " is \" + " + this.options.assert);
        ctx.pushCode('}');
    };
    // Recursively call code generators and append results
    Parser.prototype.generateNext = function (ctx) {
        if (this.next) {
            ctx = this.next.generate(ctx);
        }
        return ctx;
    };
    // Recursively call code generators and append results
    Parser.prototype.generateEncodeNext = function (ctx) {
        if (this.next) {
            ctx = this.next.generateEncode(ctx);
        }
        return ctx;
    };
    Parser.prototype.generateBit = function (ctx) {
        // TODO find better method to handle nested bit fields
        var parser = JSON.parse(JSON.stringify(this));
        parser.varName = ctx.generateVariable(parser.varName);
        ctx.bitFields.push(parser);
        if (!this.next ||
            (this.next && ['bit', 'nest'].indexOf(this.next.type) < 0)) {
            var sum_1 = 0;
            ctx.bitFields.forEach(function (parser) { return (sum_1 += parser.options.length); });
            var val_1 = ctx.generateTmpVariable();
            if (sum_1 <= 8) {
                ctx.pushCode("var " + val_1 + " = buffer.readUInt8(offset);");
                sum_1 = 8;
            }
            else if (sum_1 <= 16) {
                ctx.pushCode("var " + val_1 + " = buffer.readUInt16BE(offset);");
                sum_1 = 16;
            }
            else if (sum_1 <= 24) {
                var val1 = ctx.generateTmpVariable();
                var val2 = ctx.generateTmpVariable();
                ctx.pushCode("var " + val1 + " = buffer.readUInt16BE(offset);");
                ctx.pushCode("var " + val2 + " = buffer.readUInt8(offset + 2);");
                ctx.pushCode("var " + val_1 + " = (" + val1 + " << 8) | " + val2 + ";");
                sum_1 = 24;
            }
            else if (sum_1 <= 32) {
                ctx.pushCode("var " + val_1 + " = buffer.readUInt32BE(offset);");
                sum_1 = 32;
            }
            else {
                throw new Error('Currently, bit field sequence longer than 4-bytes is not supported.');
            }
            ctx.pushCode("offset += " + sum_1 / 8 + ";");
            var bitOffset_1 = 0;
            var isBigEndian_1 = this.endian === 'be';
            ctx.bitFields.forEach(function (parser) {
                var length = parser.options.length;
                var offset = isBigEndian_1 ? sum_1 - bitOffset_1 - length : bitOffset_1;
                var mask = (1 << length) - 1;
                ctx.pushCode(parser.varName + " = " + val_1 + " >> " + offset + " & " + mask + ";");
                bitOffset_1 += length;
            });
            ctx.bitFields = [];
        }
    };
    Parser.prototype.generate_encodeBit = function (ctx) {
        // TODO find better method to handle nested bit fields
        var parser = JSON.parse(JSON.stringify(this));
        parser.varName = ctx.generateVariable(parser.varName);
        ctx.bitFields.push(parser);
        if (!this.next ||
            (this.next && ['bit', 'nest'].indexOf(this.next.type) < 0)) {
            var sum_2 = 0;
            ctx.bitFields.forEach(function (parser) {
                sum_2 += parser.options.length;
            });
            if (sum_2 <= 8) {
                sum_2 = 8;
            }
            else if (sum_2 <= 16) {
                sum_2 = 16;
            }
            else if (sum_2 <= 24) {
                sum_2 = 24;
            }
            else if (sum_2 <= 32) {
                sum_2 = 32;
            }
            else {
                throw new Error('Currently, bit field sequences longer than 4-bytes is not supported.');
            }
            var isBitLittleEndian_1 = this.endian === 'le' && this.encoderOpts.bitEndianess;
            var tmpVal_1 = ctx.generateTmpVariable();
            var boundVal_1 = ctx.generateTmpVariable();
            ctx.pushCode("var " + tmpVal_1 + " = 0;");
            ctx.pushCode("var " + boundVal_1 + " = 0;");
            var bitOffset_2 = 0;
            ctx.bitFields.forEach(function (parser) {
                ctx.pushCode(boundVal_1 + " = (" + parser.varName + " & " + ((1 <<
                    parser.options.length) -
                    1) + ");");
                ctx.pushCode(tmpVal_1 + " |= (" + boundVal_1 + " << " + (isBitLittleEndian_1
                    ? bitOffset_2
                    : sum_2 - parser.options.length - bitOffset_2) + ");");
                ctx.pushCode(tmpVal_1 + " = " + tmpVal_1 + " >>> 0;");
                bitOffset_2 += parser.options.length;
            });
            if (sum_2 == 8) {
                ctx.pushCode("smartBuffer.writeUInt8(" + tmpVal_1 + ");");
            }
            else if (sum_2 == 16) {
                ctx.pushCode("smartBuffer.writeUInt16BE(" + tmpVal_1 + ");");
            }
            else if (sum_2 == 24) {
                var val1 = ctx.generateTmpVariable();
                var val2 = ctx.generateTmpVariable();
                ctx.pushCode("var " + val1 + " = (" + tmpVal_1 + " >>> 8);");
                ctx.pushCode("var " + val2 + " = (" + tmpVal_1 + " & 0x0ff);");
                ctx.pushCode("smartBuffer.writeUInt16BE(" + val1 + ");");
                ctx.pushCode("smartBuffer.writeUInt8(" + val2 + ");");
            }
            else if (sum_2 == 32) {
                ctx.pushCode("smartBuffer.writeUInt32BE(" + tmpVal_1 + ");");
            }
            ctx.bitFields = [];
        }
    };
    Parser.prototype.generateSeek = function (ctx) {
        var length = ctx.generateOption(this.options.length);
        ctx.pushCode("offset += " + length + ";");
    };
    Parser.prototype.generate_encodeSeek = function (ctx) {
        var length = ctx.generateOption(this.options.length);
        ctx.pushCode("smartBuffer.writeBuffer(Buffer.alloc(" + length + "));");
    };
    Parser.prototype.generateString = function (ctx) {
        var name = ctx.generateVariable(this.varName);
        var start = ctx.generateTmpVariable();
        var encoding = this.options.encoding;
        if (this.options.length && this.options.zeroTerminated) {
            var len = this.options.length;
            ctx.pushCode("var " + start + " = offset;");
            ctx.pushCode("while(buffer.readUInt8(offset++) !== 0 && offset - " + start + "  < " + len + ");");
            //ctx.pushCode(
            //  `${name} = buffer.toString('${encoding}', ${start}, offset - ${start} < ${len} ? offset - 1 : offset);`
            //);
            ctx.pushCode(name + " = buffer.toString('" + encoding + "', " + start + ", buffer.readUInt8(offset -1) == 0 ? offset - 1 : offset);");
        }
        else if (this.options.length) {
            var len = ctx.generateOption(this.options.length);
            ctx.pushCode(name + " = buffer.toString('" + encoding + "', offset, offset + " + len + ");");
            ctx.pushCode("offset += " + len + ";");
        }
        else if (this.options.zeroTerminated) {
            ctx.pushCode("var " + start + " = offset;");
            ctx.pushCode('while(buffer.readUInt8(offset++) !== 0);');
            ctx.pushCode(name + " = buffer.toString('" + encoding + "', " + start + ", offset - 1);");
        }
        else if (this.options.greedy) {
            ctx.pushCode("var " + start + " = offset;");
            ctx.pushCode('while(buffer.length > offset++);');
            ctx.pushCode(name + " = buffer.toString('" + encoding + "', " + start + ", offset);");
        }
        if (this.options.stripNull) {
            ctx.pushCode(name + " = " + name + ".replace(/\\x00+$/g, '')");
        }
        if (this.options.trim) {
            ctx.pushCode(name + " = " + name + ".trim()");
        }
    };
    Parser.prototype.generate_encodeString = function (ctx) {
        var name = ctx.generateVariable(this.varName);
        // Get the length of string to encode
        if (this.options.length) {
            var optLength = ctx.generateOption(this.options.length);
            // Encode the string to a temporary buffer
            var tmpBuf = ctx.generateTmpVariable();
            ctx.pushCode("var " + tmpBuf + " = Buffer.from(" + name + ", \"" + this.options.encoding + "\");");
            // Truncate the buffer to specified (Bytes) length
            ctx.pushCode(tmpBuf + " = " + tmpBuf + ".slice(0, " + optLength + ");");
            // Compute padding length
            var padLen = ctx.generateTmpVariable();
            ctx.pushCode(padLen + " = " + optLength + " - " + tmpBuf + ".length;");
            if (this.options.zeroTerminated) {
                ctx.pushCode("smartBuffer.writeBuffer(" + tmpBuf + ");");
                ctx.pushCode("if (" + padLen + " > 0) { smartBuffer.writeUInt8(0x00); }");
            }
            else {
                var padCharVar = ctx.generateTmpVariable();
                var padChar = this.options.stripNull ? '\u0000' : ' ';
                if (this.options.padd && typeof this.options.padd === 'string') {
                    var code = this.options.padd.charCodeAt(0);
                    if (code < 0x80) {
                        padChar = String.fromCharCode(code);
                    }
                }
                ctx.pushCode(padCharVar + " = \"" + padChar + "\";");
                if (this.options.padding === 'left') {
                    // Add heading padding spaces
                    ctx.pushCode("if (" + padLen + " > 0) {smartBuffer.writeString(" + padCharVar + ".repeat(" + padLen + "));}");
                }
                // Copy the temporary string buffer to current smartBuffer
                ctx.pushCode("smartBuffer.writeBuffer(" + tmpBuf + ");");
                if (this.options.padding !== 'left') {
                    // Add trailing padding spaces
                    ctx.pushCode("if (" + padLen + " > 0) {smartBuffer.writeString(" + padCharVar + ".repeat(" + padLen + "));}");
                }
            }
        }
        else {
            ctx.pushCode("smartBuffer.writeString(" + name + ", \"" + this.options.encoding + "\");");
            if (this.options.zeroTerminated) {
                ctx.pushCode('smartBuffer.writeUInt8(0x00);');
            }
        }
    };
    Parser.prototype.generateBuffer = function (ctx) {
        var varName = ctx.generateVariable(this.varName);
        if (typeof this.options.readUntil === 'function') {
            var pred = this.options.readUntil;
            var start = ctx.generateTmpVariable();
            var cur = ctx.generateTmpVariable();
            ctx.pushCode("var " + start + " = offset;");
            ctx.pushCode("var " + cur + " = 0;");
            ctx.pushCode("while (offset < buffer.length) {");
            ctx.pushCode(cur + " = buffer.readUInt8(offset);");
            ctx.pushCode("if (" + pred + ".call(this, " + cur + ", buffer.slice(offset))) break;");
            ctx.pushCode("offset += 1;");
            ctx.pushCode("}");
            ctx.pushCode(varName + " = buffer.slice(" + start + ", offset);");
        }
        else if (this.options.readUntil === 'eof') {
            ctx.pushCode(varName + " = buffer.slice(offset);");
        }
        else {
            var len = ctx.generateOption(this.options.length);
            ctx.pushCode(varName + " = buffer.slice(offset, offset + " + len + ");");
            ctx.pushCode("offset += " + len + ";");
        }
        if (this.options.clone) {
            ctx.pushCode(varName + " = Buffer.from(" + varName + ");");
        }
    };
    Parser.prototype.generate_encodeBuffer = function (ctx) {
        ctx.pushCode("smartBuffer.writeBuffer(" + ctx.generateVariable(this.varName) + ");");
    };
    Parser.prototype.generateArray = function (ctx) {
        var length = ctx.generateOption(this.options.length);
        var lengthInBytes = ctx.generateOption(this.options.lengthInBytes);
        var type = this.options.type;
        var counter = ctx.generateTmpVariable();
        var lhs = ctx.generateVariable(this.varName);
        var item = ctx.generateTmpVariable();
        var key = this.options.key;
        var isHash = typeof key === 'string';
        if (isHash) {
            ctx.pushCode(lhs + " = {};");
        }
        else {
            ctx.pushCode(lhs + " = [];");
        }
        if (typeof this.options.readUntil === 'function') {
            ctx.pushCode('do {');
        }
        else if (this.options.readUntil === 'eof') {
            ctx.pushCode("for (var " + counter + " = 0; offset < buffer.length; " + counter + "++) {");
        }
        else if (lengthInBytes !== undefined) {
            ctx.pushCode("for (var " + counter + " = offset; offset - " + counter + " < " + lengthInBytes + "; ) {");
        }
        else {
            ctx.pushCode("for (var " + counter + " = 0; " + counter + " < " + length + "; " + counter + "++) {");
        }
        if (typeof type === 'string') {
            if (!aliasRegistry[type]) {
                var typeName = CAPITILIZED_TYPE_NAMES[type];
                ctx.pushCode("var " + item + " = buffer.read" + typeName + "(offset);");
                ctx.pushCode("offset += " + PRIMITIVE_SIZES[type] + ";");
            }
            else {
                var tempVar = ctx.generateTmpVariable();
                ctx.pushCode("var " + tempVar + " = " + (FUNCTION_PREFIX + type) + "(offset);");
                ctx.pushCode("var " + item + " = " + tempVar + ".result; offset = " + tempVar + ".offset;");
                if (type !== this.alias)
                    ctx.addReference(type);
            }
        }
        else if (type instanceof Parser) {
            ctx.pushCode("var " + item + " = {};");
            ctx.pushScope(item);
            type.generate(ctx);
            ctx.popScope();
        }
        if (isHash) {
            ctx.pushCode(lhs + "[" + item + "." + key + "] = " + item + ";");
        }
        else {
            ctx.pushCode(lhs + ".push(" + item + ");");
        }
        ctx.pushCode('}');
        if (typeof this.options.readUntil === 'function') {
            var pred = this.options.readUntil;
            ctx.pushCode("while (!(" + pred + ").call(this, " + item + ", buffer.slice(offset)));");
        }
    };
    Parser.prototype.generate_encodeArray = function (ctx) {
        var length = ctx.generateOption(this.options.length);
        var lengthInBytes = ctx.generateOption(this.options.lengthInBytes);
        var type = this.options.type;
        var name = ctx.generateVariable(this.varName);
        var item = ctx.generateTmpVariable();
        var itemCounter = ctx.generateTmpVariable();
        var maxItems = ctx.generateTmpVariable();
        var isHash = typeof this.options.key === 'string';
        if (isHash) {
            ctx.generateError('"Encoding associative array not supported"');
        }
        ctx.pushCode("var " + maxItems + " = 0;");
        // Get default array length (if defined)
        ctx.pushCode("if(" + name + ") {" + maxItems + " = " + name + ".length;}");
        // Compute the desired count of array items to encode (min of array size
        // and length option)
        if (length !== undefined) {
            ctx.pushCode(maxItems + " = " + maxItems + " > " + length + " ? " + length + " : " + maxItems);
        }
        // Save current encoding smartBuffer and allocate a new one
        var savSmartBuffer = ctx.generateTmpVariable();
        ctx.pushCode("var " + savSmartBuffer + " = smartBuffer; " +
            ("smartBuffer = SmartBuffer.fromOptions({size: " + this.smartBufferSize + ", encoding: \"utf8\"});"));
        ctx.pushCode("if(" + maxItems + " > 0) {");
        ctx.pushCode("var " + itemCounter + " = 0;");
        if (typeof this.options.encodeUntil === 'function' ||
            typeof this.options.readUntil === 'function') {
            ctx.pushCode('do {');
        }
        else {
            ctx.pushCode("for ( ; " + itemCounter + " < " + maxItems + "; ) {");
        }
        ctx.pushCode("var " + item + " = " + name + "[" + itemCounter + "];");
        ctx.pushCode(itemCounter + "++;");
        if (typeof type === 'string') {
            if (!aliasRegistry[type]) {
                ctx.pushCode("smartBuffer.write" + CAPITILIZED_TYPE_NAMES[type] + "(" + item + ");");
            }
            else {
                ctx.pushCode("smartBuffer.writeBuffer(" + (FUNCTION_ENCODE_PREFIX + type) + "(" + item + "));");
                if (type !== this.alias) {
                    ctx.addReference(type);
                }
            }
        }
        else if (type instanceof Parser) {
            ctx.pushScope(item);
            type.generateEncode(ctx);
            ctx.popScope();
        }
        ctx.pushCode('}'); // End of 'do {' or 'for (...) {'
        if (typeof this.options.encodeUntil === 'function') {
            ctx.pushCode(" while (" + itemCounter + " < " + maxItems + " && !(" + this.options.encodeUntil + ").call(this, " + item + ", vars));");
        }
        else if (typeof this.options.readUntil === 'function') {
            ctx.pushCode(" while (" + itemCounter + " < " + maxItems + " && !(" + this.options.readUntil + ").call(this, " + item + ", " + savSmartBuffer + ".toBuffer()));");
        }
        ctx.pushCode('}'); // End of 'if(...) {'
        var tmpBuffer = ctx.generateTmpVariable();
        ctx.pushCode("var " + tmpBuffer + " = smartBuffer.toBuffer()");
        if (lengthInBytes !== undefined) {
            // Truncate the tmpBuffer so that it will respect the lengthInBytes option
            ctx.pushCode(tmpBuffer + " = " + tmpBuffer + ".slice(0, " + lengthInBytes + ");");
        }
        // Copy tmp Buffer to saved smartBuffer
        ctx.pushCode(savSmartBuffer + ".writeBuffer(" + tmpBuffer + ");");
        // Restore current smartBuffer
        ctx.pushCode("smartBuffer = " + savSmartBuffer + ";");
    };
    Parser.prototype.generateChoiceCase = function (ctx, varName, type) {
        if (typeof type === 'string') {
            var varName_1 = ctx.generateVariable(this.varName);
            if (!aliasRegistry[type]) {
                var typeName = CAPITILIZED_TYPE_NAMES[type];
                ctx.pushCode(varName_1 + " = buffer.read" + typeName + "(offset);");
                ctx.pushCode("offset += " + PRIMITIVE_SIZES[type]);
            }
            else {
                var tempVar = ctx.generateTmpVariable();
                ctx.pushCode("var " + tempVar + " = " + (FUNCTION_PREFIX + type) + "(offset);");
                ctx.pushCode(varName_1 + " = " + tempVar + ".result; offset = " + tempVar + ".offset;");
                if (type !== this.alias)
                    ctx.addReference(type);
            }
        }
        else if (type instanceof Parser) {
            ctx.pushPath(varName);
            type.generate(ctx);
            ctx.popPath(varName);
        }
    };
    Parser.prototype.generate_encodeChoiceCase = function (ctx, varName, type) {
        if (typeof type === 'string') {
            if (!aliasRegistry[type]) {
                ctx.pushCode("smartBuffer.write" + CAPITILIZED_TYPE_NAMES[type] + "(" + ctx.generateVariable(this.varName) + ");");
            }
            else {
                var tempVar = ctx.generateTmpVariable();
                ctx.pushCode("var " + tempVar + " = " + (FUNCTION_ENCODE_PREFIX +
                    type) + "(" + ctx.generateVariable(this.varName) + ");");
                ctx.pushCode("smartBuffer.writeBuffer(" + tempVar + ");");
                if (type !== this.alias)
                    ctx.addReference(type);
            }
        }
        else if (type instanceof Parser) {
            ctx.pushPath(varName);
            type.generateEncode(ctx);
            ctx.popPath(varName);
        }
    };
    Parser.prototype.generateChoice = function (ctx) {
        var _this = this;
        var tag = ctx.generateOption(this.options.tag);
        if (this.varName) {
            ctx.pushCode(ctx.generateVariable(this.varName) + " = {};");
        }
        ctx.pushCode("switch(" + tag + ") {");
        Object.keys(this.options.choices).forEach(function (tag) {
            var type = _this.options.choices[parseInt(tag, 10)];
            ctx.pushCode("case " + tag + ":");
            _this.generateChoiceCase(ctx, _this.varName, type);
            ctx.pushCode('break;');
        });
        ctx.pushCode('default:');
        if (this.options.defaultChoice) {
            this.generateChoiceCase(ctx, this.varName, this.options.defaultChoice);
        }
        else {
            ctx.generateError("\"Met undefined tag value \" + " + tag + " + \" at choice\"");
        }
        ctx.pushCode('}');
    };
    Parser.prototype.generate_encodeChoice = function (ctx) {
        var _this = this;
        var tag = ctx.generateOption(this.options.tag);
        ctx.pushCode("switch(" + tag + ") {");
        Object.keys(this.options.choices).forEach(function (tag) {
            var type = _this.options.choices[parseInt(tag, 10)];
            ctx.pushCode("case " + tag + ":");
            _this.generate_encodeChoiceCase(ctx, _this.varName, type);
            ctx.pushCode('break;');
        }, this);
        ctx.pushCode('default:');
        if (this.options.defaultChoice) {
            this.generate_encodeChoiceCase(ctx, this.varName, this.options.defaultChoice);
        }
        else {
            ctx.generateError("\"Met undefined tag value \" + " + tag + " + \" at choice\"");
        }
        ctx.pushCode('}');
    };
    Parser.prototype.generateNest = function (ctx) {
        var nestVar = ctx.generateVariable(this.varName);
        if (this.options.type instanceof Parser) {
            if (this.varName) {
                ctx.pushCode(nestVar + " = {};");
            }
            ctx.pushPath(this.varName);
            this.options.type.generate(ctx);
            ctx.popPath(this.varName);
        }
        else if (aliasRegistry[this.options.type]) {
            var tempVar = ctx.generateTmpVariable();
            ctx.pushCode("var " + tempVar + " = " + (FUNCTION_PREFIX + this.options.type) + "(offset);");
            ctx.pushCode(nestVar + " = " + tempVar + ".result; offset = " + tempVar + ".offset;");
            if (this.options.type !== this.alias)
                ctx.addReference(this.options.type);
        }
    };
    Parser.prototype.generate_encodeNest = function (ctx) {
        var nestVar = ctx.generateVariable(this.varName);
        if (this.options.type instanceof Parser) {
            ctx.pushPath(this.varName);
            this.options.type.generateEncode(ctx);
            ctx.popPath(this.varName);
        }
        else if (aliasRegistry[this.options.type]) {
            var tempVar = ctx.generateTmpVariable();
            ctx.pushCode("var " + tempVar + " = " + (FUNCTION_ENCODE_PREFIX +
                this.options.type) + "(" + nestVar + ");");
            ctx.pushCode("smartBuffer.writeBuffer(" + tempVar + ");");
            if (this.options.type !== this.alias) {
                ctx.addReference(this.options.type);
            }
        }
    };
    Parser.prototype.generateFormatter = function (ctx, varName, formatter) {
        if (typeof formatter === 'function') {
            ctx.pushCode(varName + " = (" + formatter + ").call(this, " + varName + ", buffer, offset);");
        }
    };
    Parser.prototype.generateEncoder = function (ctx, varName, encoder) {
        if (typeof encoder === 'function') {
            ctx.pushCode(varName + " = (" + encoder + ").call(this, " + varName + ", vars);");
        }
    };
    Parser.prototype.generatePointer = function (ctx) {
        var type = this.options.type;
        var offset = ctx.generateOption(this.options.offset);
        var tempVar = ctx.generateTmpVariable();
        var nestVar = ctx.generateVariable(this.varName);
        // Save current offset
        ctx.pushCode("var " + tempVar + " = offset;");
        // Move offset
        ctx.pushCode("offset = " + offset + ";");
        if (this.options.type instanceof Parser) {
            ctx.pushCode(nestVar + " = {};");
            ctx.pushPath(this.varName);
            this.options.type.generate(ctx);
            ctx.popPath(this.varName);
        }
        else if (aliasRegistry[this.options.type]) {
            var tempVar_1 = ctx.generateTmpVariable();
            ctx.pushCode("var " + tempVar_1 + " = " + (FUNCTION_PREFIX + this.options.type) + "(offset);");
            ctx.pushCode(nestVar + " = " + tempVar_1 + ".result; offset = " + tempVar_1 + ".offset;");
            if (this.options.type !== this.alias)
                ctx.addReference(this.options.type);
        }
        else if (Object.keys(PRIMITIVE_SIZES).indexOf(this.options.type) >= 0) {
            var typeName = CAPITILIZED_TYPE_NAMES[type];
            ctx.pushCode(nestVar + " = buffer.read" + typeName + "(offset);");
            ctx.pushCode("offset += " + PRIMITIVE_SIZES[type] + ";");
        }
        // Restore offset
        ctx.pushCode("offset = " + tempVar + ";");
    };
    // @ts-ignore TS6133
    Parser.prototype.generate_encodePointer = function (ctx) {
        // TODO
    };
    Parser.prototype.generateSaveOffset = function (ctx) {
        var varName = ctx.generateVariable(this.varName);
        ctx.pushCode(varName + " = offset");
    };
    // @ts-ignore TS6133
    Parser.prototype.generate_encodeSaveOffset = function (ctx) {
        // TODO
    };
    return Parser;
}());
exports.Parser = Parser;

});

const TL_PTYPE_NONE = 0;
const TL_PTYPE_INVALID = 0;
const TL_PTYPE_LOG = 1; // Log messages
const TL_PTYPE_RPC_REQ = 2; // RPC request
const TL_PTYPE_RPC_REP = 3; // RPC reply
const TL_PTYPE_RPC_ERROR = 4; // RPC error
const TL_PTYPE_HEARTBEAT = 5; // NOP heartbeat
const TL_PTYPE_TIMEBASE = 6; // Update to a timebase's parameters
const TL_PTYPE_SOURCE = 7; // Update to a source's parameters
const TL_PTYPE_STREAM = 8; // Update to a stream's parameters
const TL_PTYPE_USER = 64;
const TL_PTYPE_STREAM0 = 128;
const TL_PTYPE_OTHER_ROUTING = -1;
const dataTypes = {
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
const headerParser = new binary_parser.Parser()
    .endianess("little")
    .uint8('type')
    .uint8('routingLength')
    .uint16('payloadLength');
const routingParser = new binary_parser.Parser()
    .array('routing', { type: 'uint8', readUntil: 'eof' });
const rpcPayloadParser = (rpcPayload = false) => {
    const parser = new binary_parser.Parser()
        .endianess("little")
        .uint16('requestId')
        .uint16('methodId')
        .string('topic', { greedy: true });
    if (rpcPayload) {
        parser.uint32('rpcPayload');
    }
    return parser;
};
const payloadParser = (type, payloadLength, payload) => {
    switch (type) {
        case TL_PTYPE_NONE:
            break;
        case TL_PTYPE_LOG:
            return defaultPacketParser(payloadLength).parse(payload);
        case TL_PTYPE_RPC_REQ:
            break;
        case TL_PTYPE_RPC_REP:
            return rpcReplyPacketParser(payloadLength).parse(payload);
        case TL_PTYPE_RPC_ERROR:
            break;
        case TL_PTYPE_HEARTBEAT:
            break;
        case TL_PTYPE_TIMEBASE:
            return timebasePacketParser.parse(payload);
        case TL_PTYPE_SOURCE:
            return sourcePacketParser.parse(payload);
        case TL_PTYPE_STREAM:
            return streamPacketParser.parse(payload);
        case TL_PTYPE_STREAM0:
            return publishedDataParser.parse(payload);
    }
};
const generateHeartbeat = (routing) => {
    const payload = Buffer.from('');
    const routingBuffer = routingParser.encode({
        routing: routing
    });
    const header = headerParser.encode({
        type: TL_PTYPE_HEARTBEAT,
        routingLength: routingBuffer.length,
        payloadLength: payload.length
    });
    const request = Buffer.concat([header, payload, routingBuffer]);
    return request;
};
// const logPacketParser = (payloadLength: number) => new Parser()
//   .string('value', { lengthInBytes: payloadLength })
const rpcReplyPacketParser = (payloadLength) => {
    const parser = new binary_parser.Parser()
        .uint16('requestId');
    if (payloadLength > 2) {
        parser.buffer('value', { length: payloadLength - 2 });
    }
    return parser;
};
const defaultPacketParser = (payloadLength) => new binary_parser.Parser()
    .endianess('little')
    .buffer('value', { length: payloadLength });
const sourcePacketParser = new binary_parser.Parser()
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
const streamPacketParser = new binary_parser.Parser()
    .endianess('little')
    .uint16le('streamId')
    .uint16le('streamTimebaseId')
    .uint32le('streamPeriod')
    .uint32le('streamOffset')
    .uint64le('streamSampleNumber')
    .uint16le('streamTotalComponents')
    .uint16le('streamFlags')
    .array('streamDescription', {
    type: new binary_parser.Parser()
        .uint16le('streamSourceId')
        .uint16le('streamFlags')
        .uint32le('streamPeriod')
        .uint32le('streamOffset'),
    length: 'streamTotalComponents'
});
const timebasePacketParser = new binary_parser.Parser()
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
const float32Parser = new binary_parser.Parser()
    .floatle('value');
// Not all packets might contain only float32 values
const publishedDataParser = new binary_parser.Parser()
    .endianess('little')
    .int32le('sampleNumber', { lengthInBytes: 4 })
    .array('data', { type: float32Parser, readUntil: 'eof' });
const generateRequest = (requestId, methodId, topic, rpcPayload, routing) => {
    const payload = rpcPayloadParser(rpcPayload).encode({
        requestId: requestId,
        methodId: methodId,
        topic: topic,
        rpcPayload: rpcPayload
    });
    const routingBuffer = routingParser.encode({
        routing: routing
    });
    const header = headerParser.encode({
        type: TL_PTYPE_RPC_REQ,
        routingLength: routingBuffer.length,
        payloadLength: payload.length
    });
    const request = Buffer.concat([header, payload, routingBuffer]);
    return request;
};
class TIOProtocol {
    constructor() {
        this.routing = [];
    }
    parsePacket(rawPacket) {
        var _a;
        const header = headerParser.parse(rawPacket.slice(0, 4));
        const payload = payloadParser(header.type, header.payloadLength, rawPacket.slice(4, 4 + header.payloadLength));
        const routing = header.routingLength ? (_a = routingParser.parse(rawPacket.slice(4 + header.payloadLength, 4 + header.payloadLength + header.routingLength))) === null || _a === void 0 ? void 0 : _a.routing : undefined;
        return { header, payload, routing };
    }
    createRequest(topic, rpcPayload, payloadType, routing) {
        const requestId = Math.ceil(Math.random() * Math.pow(2, 16));
        const methodId = utf8.encode(topic).length + 0x8000;
        const payload = rpcPayloadParser(rpcPayload).encode({
            requestId: requestId,
            methodId: methodId,
            topic: topic,
            rpcPayload: rpcPayload
        });
        const routingBuffer = routingParser.encode({
            routing: routing
        });
        const header = headerParser.encode({
            type: TL_PTYPE_RPC_REQ,
            routingLength: routingBuffer.length,
            payloadLength: payload.length
        });
        const request = Buffer.concat([header, payload, routingBuffer]);
        return { request, requestId };
    }
}

class TIODevice {
    constructor({ session, routing }) {
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
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.description = yield this.session.rpc('dev.desc', undefined, undefined, this.routing);
            this.name = yield this.session.rpc('dev.name', undefined, undefined, this.routing);
            // await this.session.rpc('rpc.list', undefined, undefined, this.routing)
            this.connected = true;
            console.log(this.name, this.description);
            return { name: this.name, description: this.description };
        });
    }
    start() {
        return this.session.rpc('data.send_all', undefined, undefined, this.routing).then(() => {
            this.started = true;
        });
    }
    ready() {
        if (this.columns.length && this.started) {
            return true;
        }
        return false;
    }
    samplingPeriod() {
        var _a;
        const stream = this.streams[0];
        if (stream) {
            const timebase = (_a = this.timebases) === null || _a === void 0 ? void 0 : _a[stream.streamTimebaseId];
            if (timebase) {
                const timebasePeriod = timebase.timebasePeriodNumUs / timebase.timebasePeriodDenomUs / Math.pow(10, 6);
                return timebasePeriod * stream.streamPeriod;
            }
        }
    }
    generateColumns() {
        this.columns = [];
        if (this.streams[0]) {
            for (const streamIndex in this.streams[0].streamDescription) {
                const stream = this.streams[0].streamDescription[streamIndex];
                if (this.sources[stream.streamSourceId]) {
                    const description = this.sources[stream.streamSourceId].description.split('\t');
                    const sourceName = description[0];
                    const columnNames = description[1].split(',');
                    if (columnNames.length > 1) {
                        for (const columnName of columnNames) {
                            this.columns.push(`${sourceName}.${columnName}`);
                        }
                    }
                    else {
                        this.columns.push(sourceName);
                    }
                }
            }
        }
    }
    heartbeat() {
        const heartbeat = generateHeartbeat(this.routing);
        setTimeout(() => {
            this.session.socket.write(heartbeat);
            this.heartbeat();
        }, 1000);
    }
    mappedData() {
        if (this.columns.length) {
            const sampleNumber = Number(Object.keys(this.queue)[0]);
            const samplingPeriod = this.samplingPeriod();
            const mappedData = {
                time: samplingPeriod ? samplingPeriod * sampleNumber : undefined
            };
            this.columns.forEach((val, index) => {
                const subColumns = val.split('.');
                subColumns.reduce((p, c, i) => {
                    if (i === subColumns.length - 1) {
                        p[c] = this.queue[sampleNumber][index].value;
                    }
                    else {
                        p[c] = p[c] || {};
                    }
                    return p[c];
                }, mappedData);
            }, {});
            return mappedData;
        }
    }
}

const timeoutPromise = (timeout) => new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), timeout);
});
class TIOSession {
    constructor({ host = 'localhost', port = 7855, streamingDevices = ['proxy'] } = { host: 'localhost', port: 7855, streamingDevices: ['proxy'] }) {
        this.devices = {};
        this.packetEmitter = new EventEmitter();
        this.host = host;
        this.port = port;
        this.streamingDevices = streamingDevices;
        this.socket = new Socket();
        this.protocol = new TIOProtocol();
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.socket.connect(this.port, this.host);
            this.socket.on('connect', () => {
                this.setup();
            });
            const promise = new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                    if (this.streamingDevices.every(v => Object.keys(this.devices).includes(v))) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1000);
            });
            return Promise.race([
                promise,
                timeoutPromise(5000)
            ]);
        });
    }
    end() {
        return new Promise((resolve, reject) => {
            this.socket.end(() => resolve());
        });
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.socket.on('data', (rawPacket) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const packet = this.protocol.parsePacket(rawPacket);
                const route = (_a = packet.routing) === null || _a === void 0 ? void 0 : _a[0];
                let device = this.getDevice(route);
                if (!device) {
                    device = new TIODevice({ session: this, routing: packet.routing });
                    if (typeof route !== 'undefined') {
                        this.devices[route] = device;
                    }
                    else {
                        this.devices.proxy = device;
                    }
                    device.connect();
                }
                switch (packet.header.type) {
                    case TL_PTYPE_STREAM0:
                        this.packetEmitter.emit('publishedData', packet);
                        break;
                    case TL_PTYPE_LOG:
                        this.packetEmitter.emit('log', packet);
                        break;
                    case TL_PTYPE_RPC_REP:
                        this.packetEmitter.emit('rpcReply', packet);
                        break;
                    case TL_PTYPE_RPC_ERROR:
                        this.packetEmitter.emit('rpcError', packet);
                        break;
                    case TL_PTYPE_TIMEBASE:
                        this.packetEmitter.emit('timebase', packet);
                        break;
                    case TL_PTYPE_SOURCE:
                        this.packetEmitter.emit('source', packet);
                        break;
                    case TL_PTYPE_STREAM:
                        this.packetEmitter.emit('stream', packet);
                        break;
                }
            }));
            this.packetEmitter.on('publishedData', packet => {
                const device = this.getDevice(packet.routing);
                if (device && device.started) {
                    const sampleNumber = packet.payload.sampleNumber;
                    device.queue = { [sampleNumber]: packet.payload.data };
                    if (this.checkIfSynchronized(sampleNumber)) {
                        const synchronizedData = this.getSynchronizedSamples(sampleNumber);
                        if (synchronizedData) {
                            this.packetEmitter.emit('data', synchronizedData);
                        }
                    }
                }
            });
            this.packetEmitter.on('timebase', packet => {
                const device = this.getDevice(packet.routing);
                if (device) {
                    device.timebases[packet.payload.timebaseId] = packet.payload;
                }
            });
            this.packetEmitter.on('source', packet => {
                const device = this.getDevice(packet.routing);
                const sourceId = packet.payload.sourceId;
                if (device) {
                    device.sources[sourceId] = packet.payload;
                    device.generateColumns();
                }
            });
            this.packetEmitter.on('stream', packet => {
                const device = this.getDevice(packet.routing);
                const streamId = packet.payload.streamId;
                if (device) {
                    device.streams[streamId] = packet.payload;
                    device.generateColumns();
                }
            });
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (const deviceNr of this.streamingDevices) {
                const device = this.devices[deviceNr];
                if (device) {
                    promises.push(device.start());
                }
                else {
                    throw new Error(`${deviceNr} is not connected`);
                }
            }
            return Promise.all(promises);
        });
    }
    rpc(topic, rpcPayload, payloadType, routing) {
        const { request, requestId } = this.protocol.createRequest(topic, rpcPayload, payloadType, routing);
        if (!this.socket) {
            throw new Error('No socket connected');
        }
        const promise = new Promise((resolve, reject) => {
            this.packetEmitter.once('rpcReply', reply => {
                if (reply.payload.value) {
                    resolve(utf8.decode(reply.payload.value.toString()));
                }
                else {
                    resolve();
                }
            });
            this.socket.write(request);
        });
        return Promise.race([
            promise,
            timeoutPromise(5000)
        ]);
    }
    checkIfSynchronized(sampleNumber) {
        for (const device of Object.values(this.devices)) {
            if (device.ready() && !device.queue[sampleNumber]) {
                return false;
            }
        }
        return true;
    }
    getSynchronizedSamples(sampleNumber) {
        const samples = {};
        for (const [deviceKey, device] of Object.entries(this.devices)) {
            if (device.ready() && device.queue[sampleNumber]) {
                samples[deviceKey] = device.mappedData();
            }
        }
        return Object.keys(samples).length ? samples : undefined;
    }
    getDevice(route) {
        if (typeof route === "undefined") {
            return this.devices.proxy;
        }
        else {
            return this.devices[route];
        }
    }
    on(event, fn) {
        this.packetEmitter.on(event, data => fn(data));
    }
}

export { TIOProtocol, TIOSession, TL_PTYPE_HEARTBEAT, TL_PTYPE_INVALID, TL_PTYPE_LOG, TL_PTYPE_NONE, TL_PTYPE_OTHER_ROUTING, TL_PTYPE_RPC_ERROR, TL_PTYPE_RPC_REP, TL_PTYPE_RPC_REQ, TL_PTYPE_SOURCE, TL_PTYPE_STREAM, TL_PTYPE_STREAM0, TL_PTYPE_TIMEBASE, TL_PTYPE_USER, dataTypes, defaultPacketParser, generateHeartbeat, generateRequest, headerParser, payloadParser, publishedDataParser, routingParser, rpcPayloadParser, sourcePacketParser, streamPacketParser, timebasePacketParser };
