/*jslint node: true, esversion:6 */
'use strict';

var sha3_lib = require('js-sha3');
var kupyna_lib = require('./kupyna/kupyna');

/**
 * Constructs digest object.
 * @public
 */
class TProEccDigest {
    /**
     * Creates TProEccDigest object
     * @public
     */
    constructor() {
        this._SUPPORTED_DIGESTS = ["SHA3_256", "SHA3_384", "SHA3_512", "KUPYNA_256", "KUPYNA_384", "KUPYNA_512"];
        this._DIGESTS_LEN = [32, 48, 64, 32, 48, 64];
    }

    /**
     * Converts byte array to hex string representation.
     * @param {Array} arr - array to be converted
     * @returns {String} - hex representation of array
     * @private
     */
    _arrToHex(arr) {
        var result = "";
        for (var i = 0; i < arr.length; i++) {
            var hex = Number(arr[i]).toString(16);
            if (hex.length === 1) {
                hex = "0" + hex;
            }
            result += hex;
        }
        return result;
    }

    /***
     * Gets supported digests.
     * @return supported digest list
     * @public
     */
    getSupportedDigests() {
        return this._SUPPORTED_DIGESTS;
    }

    /**
     * Checks if digest is supported
     * 
     * @param {String} digestType - name of digest
     * @return {Boolean} digest support state
     * @public
     */
    isDigestSupported(digestType) {
        for (var type in this._SUPPORTED_DIGESTS) {
            if (digestType === this._SUPPORTED_DIGESTS[type]) return true;
        }
        return false;
    };

    /**
     * Gets length (in bytes) of digest result.
     * This value is constant for chosen digest type.
     * 
     * @param {String} digestType - name of digest
     * @return {Number} len of digest result
     * @public
     */
    getDigestLen(digestType) {
        if (!this.isDigestSupported(digestType)) throw Error("unsupported digest type:" + digestType);
        for (var type in this._SUPPORTED_DIGESTS) {
            if (digestType === this._SUPPORTED_DIGESTS[type])
                return this._DIGESTS_LEN[type];
        }
    };

    /**
     * Calculates digest of the message provided as array of bytes.
     * 
     * @param {String} digestType - name of digest
     * @param {Array} messageArray - array of bytes to calculate digest of
     * @return {String} hexadecimal hash of the message 
     * @public
     */
    digest(digestType, messageArray) {
        if (messageArray.constructor !== Array) {
            throw new Error("message parameter must be array of bytes");
        }

        if (!this.isDigestSupported(digestType)) throw Error("unsupported digest type:" + digestType);
        var SHA3_PREFIX = "SHA3_";
        if (digestType.substring(0, SHA3_PREFIX.length) === SHA3_PREFIX) {
            var sha3 = null;
            switch (digestType) {
                case 'SHA3_256':
                    sha3 = sha3_lib.sha3_256.create();
                    break;
                case 'SHA3_384':
                    sha3 = sha3_lib.sha3_384.create();
                    break;
                case 'SHA3_512':
                    sha3 = sha3_lib.sha3_512.create();
                    break;
            }
            sha3.update(messageArray);
            return {
                digestType: digestType,
                digestValue: sha3.hex()
            };
        }
        var kupynaBits = 0;
        switch (digestType) {
            case 'KUPYNA_256':
                kupynaBits = 256;
                break;
            case 'KUPYNA_384':
                kupynaBits = 384;
                break;
            case 'KUPYNA_512':
                kupynaBits = 512;
                break;
        }
        var kupyna = new kupyna_lib(kupynaBits);
        kupyna.init();
        kupyna.update(messageArray);
        return {
            digestType: digestType,
            digestValue: this._arrToHex(kupyna.digest())
        };
    };

    /**
     * Calculates digest of the message provided as String. 
     * Internally message is converted into UTF8 array of bytes.
     * 
     * @param {String} digestType - name of digest
     * @param {String} message - message to calculate digest of
     * @return {String} hexadecimal hash of the message 
     * @public
     */
    digestUTF8(digestType, message) {
        var utf8 = unescape(encodeURIComponent(message));
        var arr = new Array(utf8.length);
        for (var i = 0; i < utf8.length; i++) {
            arr[i] = utf8.charCodeAt(i);
        }
        return this.digest(digestType, arr);
    }
}

module.exports = TProEccDigest;