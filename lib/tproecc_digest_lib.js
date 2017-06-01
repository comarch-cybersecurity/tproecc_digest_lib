var sha3_lib = require('js-sha3');
var kupyna_lib = require('./kupyna/kupyna');

var VERSION_NUM = "1.0.0";
var SHA3_PREFIX = "SHA3-";

arrToHex = function (arr) {
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

function throwUnsupportedDigests() {
    throw Error("unsupported digest:" + type + "allowed types: SHA3-256 SHA3-384 SHA3-512 KUPYNA-256 KUPYNA-384 KUPYNA-512");
}

function TProEccDigest() {
}

TProEccDigest.prototype.getVersion = function()
{
  return VERSION_NUM;
};

TProEccDigest.prototype.digest = function (type, message) {
    if (message.constructor !== Array) {
        throw new Error("message parameter must be array of bytes");
    }

    if (type.substring(0, SHA3_PREFIX.length) === SHA3_PREFIX) {
        var sha3 = null;
        switch (type) {
            case 'SHA3-256':
                sha3 = sha3_lib.sha3_256.create();
                break;
            case 'SHA3-384':
                sha3 = sha3_lib.sha3_384.create();
                break;
            case 'SHA3-512':
                sha3 = sha3_lib.sha3_512.create();
                break;
            default:
                throwUnsupportedDigests();
        }
        sha3.update(message);
        return { digestType: type, digestValue: sha3.hex() };
    }
    var kupynaBits = 0;
    switch (type) {
        case 'KUPYNA-256':
            kupynaBits = 256;
            break;
        case 'KUPYNA-384':
            kupynaBits = 384;
            break;
        case 'KUPYNA-512':
            kupynaBits = 512;
            break;
        default:
            throwUnsupportedDigests();
    }
    var kupyna = new kupyna_lib(kupynaBits);
    kupyna.init();
    kupyna.update(message);
    return { digestType: type, digestValue: arrToHex(kupyna.digest()) };
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
