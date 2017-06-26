/*jslint node: true */
'use strict';

var sha3_lib = require('js-sha3');
var kupyna_lib = require('./kupyna/kupyna');

function TProEccDigest() {}

TProEccDigest._SUPPORTED_DIGESTS = ["SHA3_256", "SHA3_384", "SHA3_512", "KUPYNA_256", "KUPYNA_384", "KUPYNA_512"];
TProEccDigest._DIGESTS_LEN = [32, 48, 64, 32, 48, 64];

TProEccDigest.prototype._arrToHex = function (arr) {
    var result = "";
    for (var i = 0; i < arr.length; i++) {
        var hex = Number(arr[i]).toString(16);
        if (hex.length === 1) {
            hex = "0" + hex;
        }
        result += hex;
    }
    return result;
};

TProEccDigest.prototype.getSupportedDigests = function () {
    return TProEccDigest._SUPPORTED_DIGESTS;
};

TProEccDigest.prototype.isDigestSupported = function (digestType) {
    for (var type in TProEccDigest._SUPPORTED_DIGESTS) {
        if (digestType === TProEccDigest._SUPPORTED_DIGESTS[type]) return true;
    }
    return false;
};

TProEccDigest.prototype.getDigestLen = function (digestType) {
   if (!this.isDigestSupported(digestType)) throw Error("unsupported digest type:" + digestType);
   for (var type in TProEccDigest._SUPPORTED_DIGESTS) {
        if (digestType === TProEccDigest._SUPPORTED_DIGESTS[type]) 
        return TProEccDigest._DIGESTS_LEN[type];
    }
};

TProEccDigest.prototype.digest = function (type, message) {
    if (message.constructor !== Array) {
        throw new Error("message parameter must be array of bytes");
    }

    if (!this.isDigestSupported(type)) throw Error("unsupported digest type:" + type);
    var SHA3_PREFIX = "SHA3_";
    if (type.substring(0, SHA3_PREFIX.length) === SHA3_PREFIX) {
        var sha3 = null;
        switch (type) {
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
        sha3.update(message);
        return {
            digestType: type,
            digestValue: sha3.hex()
        };
    }
    var kupynaBits = 0;
    switch (type) {
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
    kupyna.update(message);
    return {
        digestType: type,
        digestValue: this._arrToHex(kupyna.digest())
    };
};

TProEccDigest.prototype.digestUTF8 = function (type, message) {
    var utf8 = unescape(encodeURIComponent(message));
    var arr = new Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
        arr[i] = utf8.charCodeAt(i);
    }
    return this.digest(type, arr);
};

module.exports = TProEccDigest;