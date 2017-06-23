/*jslint node: true */
'use strict';

var KupynaTransShort = require('./kupyna_trans_short');
var KupynaTransLong = require('./kupyna_trans_long');
var LongArrBuffer = require('./longarr_buffer');
var KupynaTables = require('./kupyna_tables');

function _showHex(value) {
    if (value < 0) {
        value = 0xFFFFFFFF + value + 1;
    }
    var hex = Number(value).toString(16);
    hex = "00000000".substr(0, 8 - hex.length) + hex;
    process.stdout.write(hex);
}

function _showLongArray(arr) {
    for (var i = 0; i < arr.lo.length; i++) {
        _showHex(arr.hi[i]);
        _showHex(arr.lo[i]);
        process.stdout.write("\n");
    }
    process.stdout.write("\n");
}

function Kupyna(hashBits) {
    if (hashBits !== 256 && hashBits !== 384 && hashBits !== 512) {
        throw new Error("expected hash len: 512|384|256");
    }
    this.memStatePos = 0;
    this.total = 0;
    this.initialized = false;

    switch (hashBits) {
        case 256:
            this.memState = new LongArrBuffer(8);
            this.hashState = new LongArrBuffer(8);
            this.kupynaTrans = KupynaTransShort;
            this.numRounds = 10;
            this.stateLen = 8;
            this.stateLenBytes = 64;
            this.hashBits = 256;
            break;
        case 384:
        case 512:
            this.memState = new LongArrBuffer(16);
            this.hashState = new LongArrBuffer(16);
            this.kupynaTrans = KupynaTransLong;
            this.numRounds = 14;
            this.stateLen = 16;
            this.stateLenBytes = 128;
            this.hashBits = hashBits;
            break;
    }
}

Kupyna.prototype.P = function (x, y, round) {
    for (var index = 0; index < this.stateLen; ++index) {
        x.lo[index] ^= (index << 4) ^ round;
    }
    this.kupynaTrans.G1(x, y, round + 1);
    this.kupynaTrans.G(y, x);
};

Kupyna.prototype.Q = function (x, y, round) {
    for (var index = 0; index < this.stateLen; index++) {
        var addHi = 0x00f0f0f0 ^ ((((this.stateLen - 1 - index) * 16) ^ round) << 24);
        var result = KupynaTables.addLong(x.hi[index], x.lo[index], addHi, 0xf0f0f0f3);
        x.hi[index] = result.hi;
        x.lo[index] = result.lo;
    }
    this.kupynaTrans.G2(x, y, round + 1);
    this.kupynaTrans.G(y, x);
};

Kupyna.prototype.transform = function () {
    var AQ1 = {
        hi: [],
        lo: []
    };
    var AP1 = {
        hi: [],
        lo: []
    };
    var tmp = {
        hi: [],
        lo: []
    };

    for (var column = 0; column < this.stateLen; column++) {
        AP1.hi[column] = this.hashState.longArr.hi[column] ^ this.memState.longArr.hi[column];
        AP1.lo[column] = this.hashState.longArr.lo[column] ^ this.memState.longArr.lo[column];
        AQ1.hi[column] = this.memState.longArr.hi[column];
        AQ1.lo[column] = this.memState.longArr.lo[column];
    }

    for (var r = 0; r < this.numRounds; r += 2) {
        this.P(AP1, tmp, r);
        this.Q(AQ1, tmp, r);
    }

    for (column = 0; column < this.stateLen; column++) {
        this.hashState.longArr.hi[column] ^= AP1.hi[column] ^ AQ1.hi[column];
        this.hashState.longArr.lo[column] ^= AP1.lo[column] ^ AQ1.lo[column];
    }
    this.hashState.notifyLongUpdated();
};

Kupyna.prototype.init = function () {
    this.total = 0;
    this.memStatePos = 0;
    this.hashState.zeroAll();
    this.memState.zeroAll();
    this.hashState.setByte(0, this.stateLenBytes);
    this.initialized = true;
};

Kupyna.prototype.update = function (data) {
    if(!this.initialized)
    {
     throw new Error("need to call Kupyna.init() before");
    }
    if (data.constructor !== Array) {
        throw new Error("update expects array of bytes");
    }
    for (var index = 0; index < data.length; index++) {
        var temp = data[index];
        if (temp < 0 || temp > 255) {
            throw new Error("data must be byte array of utf8 elements");
        }
    }
    var len = data.length;
    var dataPos = 0;

    if (this.memStatePos > 0 && this.memStatePos + len >= this.stateLenBytes) {
        this.memState.copyBytesTo(data, dataPos, this.memStatePos, this.stateLenBytes - this.memStatePos);
        this.transform();
        len -= this.stateLenBytes - this.memStatePos;
        dataPos += this.stateLenBytes - this.memStatePos;
        this.memStatePos = 0;
    }
    while (len >= this.stateLenBytes) {
        this.memState.copyBytesTo(data, dataPos, 0, this.stateLenBytes);
        this.transform();
        len -= this.stateLenBytes;
        dataPos += this.stateLenBytes;
    }
    if (len > 0) {
        this.memState.copyBytesTo(data, dataPos, this.memStatePos, len);
        this.memStatePos += len;
    }
    this.total += data.length * 8;
};

Kupyna.prototype.extractHash = function () {
    var hash = [];
    this.hashState.copyBytesFrom(this.stateLenBytes - this.hashBits / 8, hash, 0, this.hashBits / 8);
    return hash;
};

Kupyna.prototype.digest = function () {
    this.memState.setByte(this.memStatePos, 0x80);
    this.memStatePos++;
    if (this.memStatePos > this.stateLenBytes - 12) {
        this.memState.zeroBytes(this.memStatePos, this.stateLenBytes - this.memStatePos);
        this.transform();
        this.memStatePos = 0;
    }
    this.memState.zeroBytes(this.memStatePos, this.stateLenBytes - this.memStatePos);
    this.memState.setLong(this.stateLenBytes - 12, this.total);
    this.transform();
    this.outputTransform();
    this.initialized = false;
    return this.extractHash();
};

Kupyna.prototype.outputTransform = function () {
    var t1 = {
            lo: [],
            hi: []
        },
        t2 = {
            lo: [],
            hi: []
        };
    for (var index = 0; index < this.stateLen; index++) {
        t1.hi[index] = this.hashState.longArr.hi[index];
        t1.lo[index] = this.hashState.longArr.lo[index];
    }
    for (var round = 0; round < this.numRounds; round += 2) {
        this.P(t1, t2, round);
    }
    for (var column = 0; column < this.stateLen; ++column) {
        this.hashState.longArr.hi[column] ^= t1.hi[column];
        this.hashState.longArr.lo[column] ^= t1.lo[column];
    }
    this.hashState.notifyLongUpdated();
};

module.exports = Kupyna;