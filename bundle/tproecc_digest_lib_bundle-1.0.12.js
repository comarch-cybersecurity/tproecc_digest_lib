(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.TProEccDigest = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KupynaTransShort = require('./kupyna_trans_short');
var KupynaTransLong = require('./kupyna_trans_long');
var LongLongBuffer = require('./longlong_buffer');
//var KupynaTables = require('./kupyna_tables');

/**
 * Kupyna class allows for calculating Kupyna type digest as defined in 
 * Ukrainian DSTU 7564:2014 standard.
 * @private
 */

var Kupyna = function () {
    /**
     * Creates kupyna hashing object
     * @param {Number} hashBits - number of kupyna hash output bits
     * @public
     */
    function Kupyna(hashBits) {
        _classCallCheck(this, Kupyna);

        if (hashBits !== 256 && hashBits !== 384 && hashBits !== 512) {
            throw new Error("expected hash len: 512|384|256");
        }
        this.memStatePos = 0;
        this.total = 0;
        this.initialized = false;

        switch (hashBits) {
            case 256:
                this.memState = new LongLongBuffer(8);
                this.hashState = new LongLongBuffer(8);
                this.kupynaTrans = new KupynaTransShort();
                this.numRounds = 10;
                this.stateLen = 8;
                this.stateLenBytes = 64;
                this.hashBits = 256;
                break;
            case 384:
            case 512:
                this.memState = new LongLongBuffer(16);
                this.hashState = new LongLongBuffer(16);
                this.kupynaTrans = new KupynaTransLong();
                this.numRounds = 14;
                this.stateLen = 16;
                this.stateLenBytes = 128;
                this.hashBits = hashBits;
                break;
        }
    }

    /**
     * Calculates value of P transformation
     * @param {Number} x - first argument to transform
     * @param {Number} y - second argument to transform
     * @param {Number} round - number of transformation round
     * @private
     */


    _createClass(Kupyna, [{
        key: '_P',
        value: function _P(x, y, round) {
            for (var index = 0; index < this.stateLen; ++index) {
                x.lo[index] ^= index << 4 ^ round;
            }
            this.kupynaTrans.G1(x, y, round + 1);
            this.kupynaTrans.G(y, x);
        }

        /**
         * Calculates value of Q transformation
         * @param {Number} x - first argument to transform
         * @param {Number} y - second argument to transform
         * @param {Number} round - number of transformation round
         * @private
         */

    }, {
        key: '_Q',
        value: function _Q(x, y, round) {
            for (var index = 0; index < this.stateLen; index++) {
                var addHi = 0x00f0f0f0 ^ ((this.stateLen - 1 - index) * 16 ^ round) << 24;
                var result = this.kupynaTrans.addLongLong(x.hi[index], x.lo[index], addHi, 0xf0f0f0f3);
                x.hi[index] = result.hi;
                x.lo[index] = result.lo;
            }
            this.kupynaTrans.G2(x, y, round + 1);
            this.kupynaTrans.G(y, x);
        }

        /**
         * Applies internal state transformations
         * @private
         */

    }, {
        key: '_transform',
        value: function _transform() {
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
                this._P(AP1, tmp, r);
                this._Q(AQ1, tmp, r);
            }

            for (column = 0; column < this.stateLen; column++) {
                this.hashState.longArr.hi[column] ^= AP1.hi[column] ^ AQ1.hi[column];
                this.hashState.longArr.lo[column] ^= AP1.lo[column] ^ AQ1.lo[column];
            }
            this.hashState.notifyLongUpdated();
        }

        /**
         * Applies final state transformation.
         * @private
         */

    }, {
        key: '_outputTransform',
        value: function _outputTransform() {
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
                this._P(t1, t2, round);
            }
            for (var column = 0; column < this.stateLen; ++column) {
                this.hashState.longArr.hi[column] ^= t1.hi[column];
                this.hashState.longArr.lo[column] ^= t1.lo[column];
            }
            this.hashState.notifyLongUpdated();
        }

        /**
         * Extracts hash from internal state table.
         * @return {Array} extracted hash
         * @private
         */

    }, {
        key: '_extractHash',
        value: function _extractHash() {
            var hash = [];
            this.hashState.copyBytesFrom(this.stateLenBytes - this.hashBits / 8, hash, 0, this.hashBits / 8);
            return hash;
        }

        /**
         * Reinitialize hashing object to its clear state.
         * Allows to digest new data.
         * @public
         */

    }, {
        key: 'init',
        value: function init() {
            this.total = 0;
            this.memStatePos = 0;
            this.hashState.zeroAll();
            this.memState.zeroAll();
            this.hashState.setByte(0, this.stateLenBytes);
            this.initialized = true;
        }

        /**
         * Updates the digest with new piece of dat.
         * @param {Array} data - bunch of data to update hash with
         * @public
         */

    }, {
        key: 'update',
        value: function update(data) {
            if (!this.initialized) {
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
                this._transform();
                len -= this.stateLenBytes - this.memStatePos;
                dataPos += this.stateLenBytes - this.memStatePos;
                this.memStatePos = 0;
            }
            while (len >= this.stateLenBytes) {
                this.memState.copyBytesTo(data, dataPos, 0, this.stateLenBytes);
                this._transform();
                len -= this.stateLenBytes;
                dataPos += this.stateLenBytes;
            }
            if (len > 0) {
                this.memState.copyBytesTo(data, dataPos, this.memStatePos, len);
                this.memStatePos += len;
            }
            this.total += data.length * 8;
        }

        /**
         * Calculates final result of complete data provided to update method.
         * @return {Array} calculated final hash 
         * @public
         */

    }, {
        key: 'digest',
        value: function digest() {
            this.memState.setByte(this.memStatePos, 0x80);
            this.memStatePos++;
            if (this.memStatePos > this.stateLenBytes - 12) {
                this.memState.zeroBytes(this.memStatePos, this.stateLenBytes - this.memStatePos);
                this._transform();
                this.memStatePos = 0;
            }
            this.memState.zeroBytes(this.memStatePos, this.stateLenBytes - this.memStatePos);
            this.memState.setLongAsBytes(this.stateLenBytes - 12, this.total);
            this._transform();
            this._outputTransform();
            this.initialized = false;
            return this._extractHash();
        }
    }]);

    return Kupyna;
}();

module.exports = Kupyna;

},{"./kupyna_trans_long":3,"./kupyna_trans_short":4,"./longlong_buffer":5}],2:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

/**
 * Creates transformation object shared among different variations of Kupyna algorithms.
 * @private
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KupynaTrans = function () {
    function KupynaTrans() {
        _classCallCheck(this, KupynaTrans);
    }

    _createClass(KupynaTrans, [{
        key: 'addLongLong',


        /**
         * Add two 64 bits long each represented as two 32bit longs 
         * @param {Integer} num1Hi 
         * @param {Integer} num1Lo 
         * @param {Integer} num2Hi 
         * @param {Integer} num2Lo 
         */
        value: function addLongLong(num1Hi, num1Lo, num2Hi, num2Lo) {
            var a48 = num1Hi >>> 16;
            var a32 = num1Hi & 0xFFFF;
            var a16 = num1Lo >>> 16;
            var a00 = num1Lo & 0xFFFF;

            var b48 = num2Hi >>> 16;
            var b32 = num2Hi & 0xFFFF;
            var b16 = num2Lo >>> 16;
            var b00 = num2Lo & 0xFFFF;

            var c48 = 0,
                c32 = 0,
                c16 = 0,
                c00 = 0;
            c00 += a00 + b00;
            c16 += c00 >>> 16;
            c00 &= 0xFFFF;
            c16 += a16 + b16;
            c32 += c16 >>> 16;
            c16 &= 0xFFFF;
            c32 += a32 + b32;
            c48 += c32 >>> 16;
            c32 &= 0xFFFF;
            c48 += a48 + b48;
            c48 &= 0xFFFF;
            var result = {};
            result.hi = c48 << 16 | c32;
            result.lo = c16 << 16 | c00;

            return result;
        }
    }]);

    return KupynaTrans;
}();

KupynaTrans.T0L = [0xd77f9aa8, 0x97d41143, 0xdf80615f, 0x14121806, 0x670cb16b, 0x2356c975, 0x7519ad6c, 0xcb927959, 0x3b4ad971, 0xf8275bdf, 0x35b22687, 0x59cc6e95, 0x72655c17, 0x1aeae7f0, 0xea3247d8, 0x363f2409, 0x731ea96d, 0x10e3ebf3, 0x4e53741d, 0x804b0bcb, 0x8c4503c9, 0xb3fe294d, 0xe8c4b02c, 0xc56a86af, 0x0b72f979, 0x7a9aa7e0, 0x55c26697, 0x34c9d3fd, 0x7f10a16f, 0xa7ec314b, 0x83c60945, 0x96afe439, 0x84baf83e, 0xf42953dd, 0xed4eb6a3, 0xbff0214f, 0x9f2beab4, 0x9325e2b6, 0x7be1529a, 0x242a380e, 0x425d7c1f, 0xa51ac6bf, 0x7e6b5415, 0x7c9da3e1, 0xabe23949, 0xd6046fd2, 0x4dde7693, 0xae683fc6, 0x4bd97292, 0x3143d572, 0x63fd429e, 0x5b3a9961, 0xdc0d63d1, 0x57349163, 0x26dccffa, 0x5eb09fee, 0x02f6f7f4, 0x564f6419, 0xc41173d5, 0xc9648ead, 0xcd957d58, 0xff5baaa4, 0xbd06d6bb, 0xe140bea1, 0xf22e57dc, 0x16e4eff2, 0x2dae3683, 0xb285dc37, 0x91d31542, 0x6286b7e4, 0x017bf57a, 0xac9ec832, 0x6ff34a9c, 0x925e17cc, 0xdd7696ab, 0xa1eb354a, 0x058a068f, 0x7917a56e, 0x181c1004, 0xd2f59c27, 0xe4cab82e, 0x688fbbe7, 0x7694afe2, 0xc19b755a, 0x53c56296, 0x74625816, 0xcae98c23, 0xfad1ac2b, 0xb6742fc2, 0x43268965, 0x492f8566, 0x222d3c0f, 0xaf13cabc, 0xd1789ea9, 0x8fc80147, 0x9bda1941, 0xb88cd034, 0xade53d48, 0x32ced7fc, 0x9522e6b7, 0x610bb56a, 0x179f1a88, 0xf95caea5, 0xf7a45153, 0x33b52286, 0x2cd5c3f9, 0xc79c715b, 0xe03b4bdb, 0x90a8e038, 0x077cf17b, 0xb0732bc3, 0x445a781e, 0xccee8822, 0xaa99cc33, 0xd8fc9024, 0xf0d8a028, 0xb482d836, 0xa86f3bc7, 0x8b39f2b2, 0x9aa1ec3b, 0x038d028e, 0x2f58c177, 0xbb01d2ba, 0x04f1f3f5, 0x786c5014, 0x65fa469f, 0x30382008, 0xe3b64955, 0x7de6569b, 0xb5f92d4c, 0x3ec0dffe, 0x5d3d9d60, 0xd5896d5c, 0xe63c4fda, 0x50486018, 0x89cf0546, 0x945913cd, 0x136ee97d, 0xc6e78421, 0x8737fab0, 0x82bdfc3f, 0x5a416c1b, 0x11981e89, 0x38c7dbff, 0x40ab8beb, 0x3fbb2a84, 0x6b02b969, 0x9ca6e83a, 0x69f44e9d, 0xc81f7bd7, 0xd0036bd3, 0x3d4ddd70, 0x4f288167, 0x9ddd1d40, 0x992ceeb5, 0xfe205fde, 0xd38e695d, 0xa090c030, 0x41d07e91, 0x8130feb1, 0x0d75fd78, 0x66774411, 0x06070401, 0x6481b3e5, 0x00000000, 0x6d05bd68, 0x77ef5a98, 0xe747baa0, 0xa46133c5, 0x0c0e0802, 0xf355a2a6, 0x2551cd74, 0xeec3b42d, 0x3a312c0b, 0xeb49b2a2, 0x295fc576, 0x8d3ef6b3, 0xa31dc2be, 0x9e501fce, 0xa914cebd, 0xc36d82ae, 0x4ca583e9, 0x1b91128a, 0xa697c431, 0x4854701c, 0x52be97ec, 0x1cede3f1, 0x71e85e99, 0x5fcb6a94, 0xdb7192aa, 0x0ef8fff6, 0xd4f29826, 0xe2cdbc2f, 0x58b79bef, 0x4aa287e8, 0x0f830a8c, 0xbe8bd435, 0x0a090c03, 0xc21677d4, 0x1f60e17f, 0x20dbcbfb, 0x1e1b1405, 0xbc7d23c1, 0xd987655e, 0x47d77a90, 0xc0e08020, 0x8eb3f43d, 0x2ba93282, 0x08fffbf7, 0x46ac8fea, 0x3c36280a, 0x2e23340d, 0x1967e57e, 0x2ad2c7f8, 0xfdad5d50, 0x5c46681a, 0xa26637c4, 0x12151c07, 0xefb84157, 0xb70fdab8, 0x88b4f03c, 0x51339562, 0x7093abe3, 0x8a4207c8, 0xcf638aac, 0xf1a35552, 0x45218d64, 0x60704010, 0xda0a67d0, 0xec3543d9, 0x6a794c13, 0x2824300c, 0x6c7e4812, 0xf6dfa429, 0xfbaa5951, 0xb108deb9, 0x98571bcf, 0xce187fd6, 0x3744d173, 0x09840e8d, 0x21a03e81, 0xe5b14d54, 0xba7a27c0, 0x54b993ed, 0xb9f7254e, 0x85c10d44, 0xf552a6a7, 0xfcd6a82a, 0x39bc2e85, 0xdefb9425, 0x6e88bfe6, 0x864c0fca, 0x1569ed7c, 0x1d96168b, 0xe9bf4556, 0x27a73a80];

KupynaTrans.T0H = [0xa832a829, 0x43524322, 0x5f3e5fc2, 0x061e0630, 0x6bda6b7f, 0x75bc758f, 0x6cc16c47, 0x592059f2, 0x71a871af, 0xdf84dfb6, 0x87a1874c, 0x95fb95dc, 0x174b17b8, 0xf017f0d3, 0xd89fd88e, 0x092d0948, 0x6dc46d4f, 0xf318f3cb, 0x1d691de8, 0xcbc0cb16, 0xc9cac906, 0x4d644d52, 0x2c9c2c7d, 0xaf29af11, 0x798079ef, 0xe047e053, 0x97f197cc, 0xfd2efdbb, 0x6fce6f5f, 0x4b7a4b62, 0x454c4512, 0x39dd39d5, 0x3ec63eed, 0xdd8edda6, 0xa315a371, 0x4f6e4f42, 0xb45eb4c9, 0xb654b6d9, 0x9ac89aa4, 0x0e360e70, 0x1f631ff8, 0xbf79bf91, 0x154115a8, 0xe142e15b, 0x49704972, 0xd2bdd2de, 0x93e593ec, 0xc6f9c67e, 0x92e092e4, 0x72a772b7, 0x9edc9e84, 0x61f8612f, 0xd1b2d1c6, 0x63f2633f, 0xfa35fa83, 0xee71ee23, 0xf403f4f3, 0x197d19c8, 0xd5a6d5e6, 0xad23ad01, 0x582558fa, 0xa40ea449, 0xbb6dbbb1, 0xa11fa161, 0xdc8bdcae, 0xf21df2c3, 0x83b5836c, 0x37eb37a5, 0x4257422a, 0xe453e473, 0x7a8f7af7, 0x32fa328d, 0x9cd69c94, 0xccdbcc2e, 0xab3dab31, 0x4a7f4a6a, 0x8f898f0c, 0x6ecb6e57, 0x04140420, 0x27bb2725, 0x2e962e6d, 0xe75ce76b, 0xe24de243, 0x5a2f5aea, 0x96f496c4, 0x164e16b0, 0x23af2305, 0x2b872b45, 0xc2edc25e, 0x65ec650f, 0x66e36617, 0x0f330f78, 0xbc76bc89, 0xa937a921, 0x47464702, 0x41584132, 0x34e434bd, 0x4875487a, 0xfc2bfcb3, 0xb751b7d1, 0x6adf6a77, 0x88928834, 0xa50ba541, 0x530253a2, 0x86a48644, 0xf93af99b, 0x5b2a5be2, 0xdb90db96, 0x38d838dd, 0x7b8a7bff, 0xc3e8c356, 0x1e661ef0, 0x22aa220d, 0x33ff3385, 0x24b4243d, 0x2888285d, 0x36ee36ad, 0xc7fcc776, 0xb240b2f9, 0x3bd73bc5, 0x8e8c8e04, 0x77b6779f, 0xba68bab9, 0xf506f5fb, 0x144414a0, 0x9fd99f8c, 0x08280840, 0x551c5592, 0x9bcd9bac, 0x4c614c5a, 0xfe21fea3, 0x60fd6027, 0x5c315cda, 0xda95da9e, 0x187818c0, 0x4643460a, 0xcddecd26, 0x7d947dcf, 0x21a52115, 0xb04ab0e9, 0x3fc33fe5, 0x1b771bd8, 0x8997893c, 0xff24ffab, 0xeb60eb0b, 0x84ae8454, 0x69d0696f, 0x3ad23acd, 0x9dd39d9c, 0xd7acd7f6, 0xd3b8d3d6, 0x70ad70a7, 0x67e6671f, 0x405d403a, 0xb55bb5c1, 0xde81debe, 0x5d345dd2, 0x30f0309d, 0x91ef91fc, 0xb14fb1e1, 0x788578e7, 0x11551188, 0x01050108, 0xe556e57b, 0x00000000, 0x68d56867, 0x98c298b4, 0xa01aa069, 0xc5f6c566, 0x020a0210, 0xa604a659, 0x74b97487, 0x2d992d75, 0x0b270b58, 0xa210a279, 0x76b37697, 0xb345b3f1, 0xbe7cbe99, 0xced1ce3e, 0xbd73bd81, 0xae2cae19, 0xe96ae91b, 0x8a988a24, 0x31f53195, 0x1c6c1ce0, 0xec7bec33, 0xf112f1db, 0x99c799bc, 0x94fe94d4, 0xaa38aa39, 0xf609f6e3, 0x26be262d, 0x2f932f65, 0xef74ef2b, 0xe86fe813, 0x8c868c14, 0x35e135b5, 0x030f0318, 0xd4a3d4ee, 0x7f9e7fdf, 0xfb30fb8b, 0x05110528, 0xc1e2c146, 0x5e3b5eca, 0x90ea90f4, 0x20a0201d, 0x3dc93df5, 0x82b08264, 0xf70cf7eb, 0xea65ea03, 0x0a220a50, 0x0d390d68, 0x7e9b7ed7, 0xf83ff893, 0x500d50ba, 0x1a721ad0, 0xc4f3c46e, 0x071b0738, 0x57165782, 0xb862b8a9, 0x3ccc3cfd, 0x62f76237, 0xe348e34b, 0xc8cfc80e, 0xac26ac09, 0x520752aa, 0x64e96407, 0x10501080, 0xd0b7d0ce, 0xd99ad986, 0x135f1398, 0x0c3c0c60, 0x125a1290, 0x298d2955, 0x510851b2, 0xb967b9a1, 0xcfd4cf36, 0xd6a9d6fe, 0x73a273bf, 0x8d838d1c, 0x81bf817c, 0x5419549a, 0xc0e7c04e, 0xed7eed3b, 0x4e6b4e4a, 0x4449441a, 0xa701a751, 0x2a822a4d, 0x85ab855c, 0x25b12535, 0xe659e663, 0xcac5ca1e, 0x7c917cc7, 0x8b9d8b2c, 0x5613568a, 0x80ba8074];

KupynaTrans.T1L = [0x501fcece, 0x06d6bbbb, 0xab8bebeb, 0xd9729292, 0xac8feaea, 0x4b0bcbcb, 0x794c1313, 0x7d23c1c1, 0xa583e9e9, 0xa6e83a3a, 0x187fd6d6, 0x39f2b2b2, 0x046fd2d2, 0xd77a9090, 0x655c1717, 0xd2c7f8f8, 0xd3154242, 0x6b541515, 0xbf455656, 0x2beab4b4, 0x26896565, 0x54701c1c, 0x9f1a8888, 0xd4114343, 0x6133c5c5, 0x896d5c5c, 0x82d83636, 0x01d2baba, 0xf1f3f5f5, 0xb8415757, 0x28816767, 0x840e8d8d, 0x97c43131, 0xf8fff6f6, 0x218d6464, 0x957d5858, 0xfd429e9e, 0xf6f7f4f4, 0xee882222, 0x7192aaaa, 0x56c97575, 0x2d3c0f0f, 0x0e080202, 0x30feb1b1, 0x275bdfdf, 0x1ea96d6d, 0x44d17373, 0xfe294d4d, 0x69ed7c7c, 0xf2982626, 0xcab82e2e, 0xfffbf7f7, 0x38200808, 0x8e695d5d, 0xc10d4444, 0xbaf83e3e, 0xfa469f9f, 0x6c501414, 0x4207c8c8, 0x6d82aeae, 0xb14d5454, 0x70401010, 0x3247d8d8, 0x13cabcbc, 0x46681a1a, 0x0cb16b6b, 0x02b96969, 0xe3ebf3f3, 0x14cebdbd, 0x99cc3333, 0x7696abab, 0xdccffafa, 0x0d63d1d1, 0xe6569b9b, 0x05bd6868, 0xf7254e4e, 0x62581616, 0xcc6e9595, 0xd07e9191, 0xb09feeee, 0xf92d4c4c, 0x34916363, 0x8d028e8e, 0x9c715b5b, 0x5e17cccc, 0xb4f03c3c, 0x4f641919, 0x40bea1a1, 0xa03e8181, 0xe2394949, 0x7cf17b7b, 0x3543d9d9, 0x10a16f6f, 0x85dc3737, 0x3d9d6060, 0x4c0fcaca, 0x8fbbe7e7, 0xd1ac2b2b, 0xe53d4848, 0xc9d3fdfd, 0xc5629696, 0xc6094545, 0xced7fcfc, 0xda194141, 0x7e481212, 0x23340d0d, 0x72f97979, 0x81b3e5e5, 0x981e8989, 0x830a8c8c, 0x93abe3e3, 0xe0802020, 0x90c03030, 0x2e57dcdc, 0x22e6b7b7, 0x19ad6c6c, 0xeb354a4a, 0x2ceeb5b5, 0xbdfc3f3f, 0xc2669797, 0x1677d4d4, 0x33956262, 0xc3b42d2d, 0x12180606, 0x5baaa4a4, 0x5caea5a5, 0xae368383, 0x80615f5f, 0xd6a82a2a, 0x3c4fdada, 0x4503c9c9, 0x00000000, 0x67e57e7e, 0x49b2a2a2, 0xb6495555, 0x1ac6bfbf, 0x77441111, 0x1173d5d5, 0xf34a9c9c, 0x571bcfcf, 0x2a380e0e, 0x36280a0a, 0xb3f43d3d, 0xaa595151, 0x6ee97d7d, 0xde769393, 0x416c1b1b, 0xc0dffefe, 0x6637c4c4, 0xc8014747, 0x3f240909, 0xb5228686, 0x312c0b0b, 0x8a068f8f, 0xf44e9d9d, 0x0bb56a6a, 0x151c0707, 0x08deb9b9, 0x37fab0b0, 0xef5a9898, 0x48601818, 0x9ec83232, 0x4ad97171, 0xec314b4b, 0xb79befef, 0xa1ec3b3b, 0x4ddd7070, 0x47baa0a0, 0x86b7e4e4, 0xdd1d4040, 0xc7dbffff, 0x732bc3c3, 0x789ea9a9, 0x88bfe6e6, 0x75fd7878, 0xd5c3f9f9, 0x96168b8b, 0xcf054646, 0xa73a8080, 0x5a781e1e, 0xa8e03838, 0x9da3e1e1, 0x0fdab8b8, 0x7f9aa8a8, 0x9aa7e0e0, 0x24300c0c, 0xe98c2323, 0x5fc57676, 0x53741d1d, 0xfb942525, 0xfc902424, 0x1b140505, 0xede3f1f1, 0x17a56e6e, 0xcb6a9494, 0xd8a02828, 0xe1529a9a, 0xbb2a8484, 0xa287e8e8, 0x4eb6a3a3, 0xf0214f4f, 0x58c17777, 0x036bd3d3, 0xbc2e8585, 0x94afe2e2, 0xa3555252, 0xe4eff2f2, 0xa9328282, 0xad5d5050, 0x7bf57a7a, 0xcdbc2f2f, 0x51cd7474, 0xa4515353, 0x3ef6b3b3, 0x3a996161, 0x6a86afaf, 0xafe43939, 0x8bd43535, 0x205fdede, 0x5913cdcd, 0x5d7c1f1f, 0xe85e9999, 0x638aacac, 0x648eadad, 0x43d57272, 0xc4b02c2c, 0x2953dddd, 0x0a67d0d0, 0xb2268787, 0x1dc2bebe, 0x87655e5e, 0x55a2a6a6, 0xbe97ecec, 0x1c100404, 0x683fc6c6, 0x090c0303, 0x8cd03434, 0xdbcbfbfb, 0x3b4bdbdb, 0x92795959, 0x25e2b6b6, 0x742fc2c2, 0x07040101, 0xeae7f0f0, 0x9b755a5a, 0xb993eded, 0x52a6a7a7, 0x2f856666, 0xe7842121, 0x60e17f7f, 0x91128a8a, 0xf59c2727, 0x6f3bc7c7, 0x7a27c0c0, 0xdfa42929, 0x1f7bd7d7];

KupynaTrans.T1H = [0xd1ce3e9e, 0x6dbbb1bd, 0x60eb0b40, 0xe092e44b, 0x65ea0346, 0xc0cb1680, 0x5f13986a, 0xe2c146bc, 0x6ae91b4c, 0xd23acd9c, 0xa9d6fece, 0x40b2f98b, 0xbdd2ded6, 0xea90f447, 0x4b17b872, 0x3ff8932a, 0x57422a91, 0x4115a87e, 0x13568ae9, 0x5eb4c99f, 0xec650f43, 0x6c1ce048, 0x92883417, 0x52432297, 0xf6c566a4, 0x315cdad5, 0xee36adb4, 0x68bab9bb, 0x06f5fb04, 0x165782ef, 0xe6671f4f, 0x838d1c09, 0xf53195a6, 0x09f6e30e, 0xe9640745, 0x2558facd, 0xdc9e8463, 0x03f4f302, 0xaa220dcc, 0x38aa39db, 0xbc758f23, 0x330f7822, 0x0a02100c, 0x4fb1e181, 0x84dfb6f8, 0xc46d4f73, 0xa273bf37, 0x644d52b3, 0x917cc715, 0xbe262dd4, 0x962e6de4, 0x0cf7eb08, 0x28084030, 0x345dd2d3, 0x49441a85, 0xc63eed84, 0xd99f8c65, 0x4414a078, 0xcfc80e8a, 0x2cae19c3, 0x19549ae5, 0x50108060, 0x9fd88eea, 0x76bc89af, 0x721ad05c, 0xda6b7f67, 0xd0696f6b, 0x18f3cb10, 0x73bd81a9, 0xff3385aa, 0x3dab31dd, 0x35fa8326, 0xb2d1c6dc, 0xcd9bac7d, 0xd568676d, 0x6b4e4ab9, 0x4e16b074, 0xfb95dc59, 0xef91fc41, 0x71ee235e, 0x614c5ab5, 0xf2633f57, 0x8c8e0403, 0x2a5be2c7, 0xdbcc2e92, 0xcc3cfd88, 0x7d19c856, 0x1fa161e1, 0xbf817c21, 0x704972ab, 0x8a7bff07, 0x9ad986ec, 0xce6f5f7f, 0xeb37a5b2, 0xfd60275d, 0xc5ca1e86, 0x5ce76b68, 0x872b45fa, 0x75487aad, 0x2efdbb34, 0xf496c453, 0x4c451283, 0x2bfcb332, 0x5841329b, 0x5a12906c, 0x390d682e, 0x8079ef0b, 0x56e57b64, 0x97893c11, 0x868c140f, 0x48e34b70, 0xa0201dc0, 0xf0309da0, 0x8bdcaef2, 0x51b7d195, 0xc16c4775, 0x7f4a6aa1, 0x5bb5c199, 0xc33fe582, 0xf197cc55, 0xa3d4eec2, 0xf7623751, 0x992d75ee, 0x1e063014, 0x0ea449ff, 0x0ba541f9, 0xb5836c2d, 0x3e5fc2df, 0x822a4dfc, 0x95da9ee6, 0xcac9068c, 0x00000000, 0x9b7ed719, 0x10a279eb, 0x1c5592e3, 0x79bf91a5, 0x55118866, 0xa6d5e6c4, 0xd69c946f, 0xd4cf3698, 0x360e7024, 0x220a503c, 0xc93df58e, 0x0851b2fb, 0x947dcf13, 0xe593ec4d, 0x771bd85a, 0x21fea33e, 0xf3c46ea2, 0x4647028f, 0x2d094836, 0xa4864433, 0x270b583a, 0x898f0c05, 0xd39d9c69, 0xdf6a7761, 0x1b073812, 0x67b9a1b1, 0x4ab0e987, 0xc298b477, 0x7818c050, 0xfa328dac, 0xa871af3b, 0x7a4b62a7, 0x74ef2b58, 0xd73bc59a, 0xad70a73d, 0x1aa069e7, 0x53e47362, 0x5d403a9d, 0x24ffab38, 0xe8c356b0, 0x37a921d1, 0x59e6636e, 0x8578e70d, 0x3af99b2c, 0x9d8b2c1d, 0x43460a89, 0xba807427, 0x661ef044, 0xd838dd90, 0x42e15b7c, 0x62b8a9b7, 0x32a829d7, 0x47e0537a, 0x3c0c6028, 0xaf2305ca, 0xb3769729, 0x691de84e, 0xb12535de, 0xb4243dd8, 0x1105281e, 0x12f1db1c, 0xcb6e5779, 0xfe94d45f, 0x88285df0, 0xc89aa47b, 0xae84543f, 0x6fe8134a, 0x15a371ed, 0x6e4f42bf, 0xb6779f2f, 0xb8d3d6d0, 0xab855c39, 0x4de24376, 0x0752aaf1, 0x1df2c316, 0xb082642b, 0x0d50bafd, 0x8f7af701, 0x932f65e2, 0xb9748725, 0x0253a2f7, 0x45b3f18d, 0xf8612f5b, 0x29af11c5, 0xdd39d596, 0xe135b5be, 0x81debefe, 0xdecd2694, 0x631ff842, 0xc799bc71, 0x26ac09cf, 0x23ad01c9, 0xa772b731, 0x9c2c7de8, 0x8edda6f4, 0xb7d0ceda, 0xa1874c35, 0x7cbe99a3, 0x3b5ecad9, 0x04a659f3, 0x7bec3352, 0x14042018, 0xf9c67eae, 0x0f03180a, 0xe434bdb8, 0x30fb8b20, 0x90db96e0, 0x2059f2cb, 0x54b6d993, 0xedc25eb6, 0x05010806, 0x17f0d31a, 0x2f5aeac1, 0x7eed3b54, 0x01a751f5, 0xe3661749, 0xa52115c6, 0x9e7fdf1f, 0x988a241b, 0xbb2725d2, 0xfcc776a8, 0xe7c04eba, 0x8d2955f6, 0xacd7f6c8];

KupynaTrans.T2L = [0x769393e5, 0x43d9d99a, 0x529a9ac8, 0xeeb5b55b, 0x5a9898c2, 0x882222aa, 0x0945454c, 0xd7fcfc2b, 0xd2baba68, 0xb56a6adf, 0x5bdfdf84, 0x0802020a, 0x469f9fd9, 0x57dcdc8b, 0x59515108, 0x79595920, 0x354a4a7f, 0x5c17174b, 0xac2b2b87, 0x2fc2c2ed, 0x6a9494fe, 0xf7f4f403, 0xd6bbbb6d, 0xb6a3a315, 0x956262f7, 0xb7e4e453, 0xd97171a8, 0x77d4d4a3, 0x13cdcdde, 0xdd7070ad, 0x5816164e, 0xa3e1e142, 0x39494970, 0xf03c3ccc, 0x27c0c0e7, 0x47d8d89f, 0x6d5c5c31, 0x569b9bcd, 0x8eadad23, 0x2e8585ab, 0x51535302, 0xbea1a11f, 0xf57a7a8f, 0x07c8c8cf, 0xb42d2d99, 0xa7e0e047, 0x63d1d1b2, 0xd57272a7, 0xa2a6a604, 0xb02c2c9c, 0x37c4c4f3, 0xabe3e348, 0xc57676b3, 0xfd787885, 0xe6b7b751, 0xeab4b45e, 0x2409092d, 0xec3b3bd7, 0x380e0e36, 0x19414158, 0x2d4c4c61, 0x5fdede81, 0xf2b2b240, 0x7a9090ea, 0x942525b1, 0xaea5a50b, 0x7bd7d7ac, 0x0c03030f, 0x44111155, 0x00000000, 0x2bc3c3e8, 0xb82e2e96, 0x729292e0, 0x9befef74, 0x254e4e6b, 0x4812125a, 0x4e9d9dd3, 0xe97d7d94, 0x0bcbcbc0, 0xd43535e1, 0x40101050, 0x73d5d5a6, 0x214f4f6e, 0x429e9edc, 0x294d4d64, 0x9ea9a937, 0x4955551c, 0x3fc6c6f9, 0x67d0d0b7, 0xf17b7b8a, 0x60181878, 0x669797f1, 0x6bd3d3b8, 0xd83636ee, 0xbfe6e659, 0x3d484875, 0x45565613, 0x3e8181bf, 0x068f8f89, 0xc17777b6, 0x17ccccdb, 0x4a9c9cd6, 0xdeb9b967, 0xafe2e24d, 0x8aacac26, 0xdab8b862, 0xbc2f2f93, 0x54151541, 0xaaa4a40e, 0xed7c7c91, 0x4fdada95, 0xe03838d8, 0x781e1e66, 0x2c0b0b27, 0x14050511, 0x7fd6d6a9, 0x50141444, 0xa56e6ecb, 0xad6c6cc1, 0xe57e7e9b, 0x856666e3, 0xd3fdfd2e, 0xfeb1b14f, 0xb3e5e556, 0x9d6060fd, 0x86afaf29, 0x655e5e3b, 0xcc3333ff, 0x268787a1, 0x03c9c9ca, 0xe7f0f017, 0x695d5d34, 0xa96d6dc4, 0xfc3f3fc3, 0x1a888892, 0x0e8d8d83, 0x3bc7c7fc, 0xfbf7f70c, 0x741d1d69, 0x83e9e96a, 0x97ecec7b, 0x93eded7e, 0x3a8080ba, 0xa429298d, 0x9c2727bb, 0x1bcfcfd4, 0x5e9999c7, 0x9aa8a832, 0x5d50500d, 0x3c0f0f33, 0xdc3737eb, 0x902424b4, 0xa0282888, 0xc03030f0, 0x6e9595fb, 0x6fd2d2bd, 0xf83e3ec6, 0x715b5b2a, 0x1d40405d, 0x368383b5, 0xf6b3b345, 0xb96969d0, 0x41575716, 0x7c1f1f63, 0x1c07071b, 0x701c1c6c, 0x128a8a98, 0xcabcbc76, 0x802020a0, 0x8bebeb60, 0x1fceced1, 0x028e8e8c, 0x96abab3d, 0x9feeee71, 0xc43131f5, 0xb2a2a210, 0xd17373a2, 0xc3f9f93a, 0x0fcacac5, 0xe83a3ad2, 0x681a1a72, 0xcbfbfb30, 0x340d0d39, 0x23c1c1e2, 0xdffefe21, 0xcffafa35, 0xeff2f21d, 0xa16f6fce, 0xcebdbd73, 0x629696f4, 0x53dddd8e, 0x11434352, 0x55525207, 0xe2b6b654, 0x20080828, 0xebf3f318, 0x82aeae2c, 0xc2bebe7c, 0x6419197d, 0x1e898997, 0xc83232fa, 0x982626be, 0xfab0b04a, 0x8feaea65, 0x314b4b7a, 0x8d6464e9, 0x2a8484ae, 0x328282b0, 0xb16b6bda, 0xf3f5f506, 0xf9797980, 0xc6bfbf79, 0x04010105, 0x615f5f3e, 0xc97575bc, 0x916363f2, 0x6c1b1b77, 0x8c2323af, 0xf43d3dc9, 0xbd6868d5, 0xa82a2a82, 0x896565ec, 0x87e8e86f, 0x7e9191ef, 0xfff6f609, 0xdbffff24, 0x4c13135f, 0x7d585825, 0xe3f1f112, 0x01474746, 0x280a0a22, 0xe17f7f9e, 0x33c5c5f6, 0xa6a7a701, 0xbbe7e75c, 0x996161f8, 0x755a5a2f, 0x1806061e, 0x05464643, 0x0d444449, 0x15424257, 0x10040414, 0xbaa0a01a, 0x4bdbdb90, 0xe43939dd, 0x228686a4, 0x4d545419, 0x92aaaa38, 0x0a8c8c86, 0xd03434e4, 0x842121a5, 0x168b8b9d, 0xc7f8f83f, 0x300c0c3c, 0xcd7474b9, 0x816767e6];

KupynaTrans.T2H = [0x93ec4dde, 0xd986ec35, 0x9aa47be1, 0xb5c1992c, 0x98b477ef, 0x220dccee, 0x451283c6, 0xfcb332ce, 0xbab9bb01, 0x6a77610b, 0xdfb6f827, 0x02100c0e, 0x9f8c65fa, 0xdcaef22e, 0x51b2fbaa, 0x59f2cb92, 0x4a6aa1eb, 0x17b87265, 0x2b45fad1, 0xc25eb674, 0x94d45fcb, 0xf4f302f6, 0xbbb1bd06, 0xa371ed4e, 0x62375133, 0xe4736286, 0x71af3b4a, 0xd4eec216, 0xcd269459, 0x70a73d4d, 0x16b07462, 0xe15b7c9d, 0x4972abe2, 0x3cfd88b4, 0xc04eba7a, 0xd88eea32, 0x5cdad589, 0x9bac7de6, 0xad01c964, 0x855c39bc, 0x53a2f7a4, 0xa161e140, 0x7af7017b, 0xc80e8a42, 0x2d75eec3, 0xe0537a9a, 0xd1c6dc0d, 0x72b73143, 0xa659f355, 0x2c7de8c4, 0xc46ea266, 0xe34b7093, 0x7697295f, 0x78e70d75, 0xb7d19522, 0xb4c99f2b, 0x0948363f, 0x3bc59aa1, 0x0e70242a, 0x41329bda, 0x4c5ab5f9, 0xdebefe20, 0xb2f98b39, 0x90f447d7, 0x2535defb, 0xa541f95c, 0xd7f6c81f, 0x03180a09, 0x11886677, 0x00000000, 0xc356b073, 0x2e6de4ca, 0x92e44bd9, 0xef2b58b7, 0x4e4ab9f7, 0x12906c7e, 0x9d9c69f4, 0x7dcf136e, 0xcb16804b, 0x35b5be8b, 0x10806070, 0xd5e6c411, 0x4f42bff0, 0x9e8463fd, 0x4d52b3fe, 0xa921d178, 0x5592e3b6, 0xc67eae68, 0xd0ceda0a, 0x7bff077c, 0x18c05048, 0x97cc55c2, 0xd3d6d003, 0x36adb482, 0xe6636e88, 0x487aade5, 0x568ae9bf, 0x817c21a0, 0x8f0c058a, 0x779f2f58, 0xcc2e925e, 0x9c946ff3, 0xb9a1b108, 0xe2437694, 0xac09cf63, 0xb8a9b70f, 0x2f65e2cd, 0x15a87e6b, 0xa449ff5b, 0x7cc71569, 0xda9ee63c, 0x38dd90a8, 0x1ef0445a, 0x0b583a31, 0x05281e1b, 0xd6fece18, 0x14a0786c, 0x6e577917, 0x6c477519, 0x7ed71967, 0x6617492f, 0xfdbb34c9, 0xb1e18130, 0xe57b6481, 0x60275d3d, 0xaf11c56a, 0x5ecad987, 0x3385aa99, 0x874c35b2, 0xc9068c45, 0xf0d31aea, 0x5dd2d38e, 0x6d4f731e, 0x3fe582bd, 0x8834179f, 0x8d1c0984, 0xc776a86f, 0xf7eb08ff, 0x1de84e53, 0xe91b4ca5, 0xec3352be, 0xed3b54b9, 0x807427a7, 0x2955f6df, 0x2725d2f5, 0xcf369857, 0x99bc71e8, 0xa829d77f, 0x50bafdad, 0x0f78222d, 0x37a5b285, 0x243dd8fc, 0x285df0d8, 0x309da090, 0x95dc59cc, 0xd2ded604, 0x3eed84ba, 0x5be2c79c, 0x403a9ddd, 0x836c2dae, 0xb3f18d3e, 0x696f6b02, 0x5782efb8, 0x1ff8425d, 0x07381215, 0x1ce04854, 0x8a241b91, 0xbc89af13, 0x201dc0e0, 0xeb0b40ab, 0xce3e9e50, 0x8e04038d, 0xab31dd76, 0xee235eb0, 0x3195a697, 0xa279eb49, 0x73bf3744, 0xf99b2cd5, 0xca1e864c, 0x3acd9ca6, 0x1ad05c46, 0xfb8b20db, 0x0d682e23, 0xc146bc7d, 0xfea33ec0, 0xfa8326dc, 0xf2c316e4, 0x6f5f7f10, 0xbd81a914, 0x96c453c5, 0xdda6f429, 0x432297d4, 0x52aaf1a3, 0xb6d99325, 0x08403038, 0xf3cb10e3, 0xae19c36d, 0xbe99a31d, 0x19c8564f, 0x893c1198, 0x328dac9e, 0x262dd4f2, 0xb0e98737, 0xea0346ac, 0x4b62a7ec, 0x64074521, 0x84543fbb, 0x82642ba9, 0x6b7f670c, 0xf5fb04f1, 0x79ef0b72, 0xbf91a51a, 0x01080607, 0x5fc2df80, 0x758f2356, 0x633f5734, 0x1bd85a41, 0x2305cae9, 0x3df58eb3, 0x68676d05, 0x2a4dfcd6, 0x650f4326, 0xe8134aa2, 0x91fc41d0, 0xf6e30ef8, 0xffab38c7, 0x13986a79, 0x58facd95, 0xf1db1ced, 0x47028fc8, 0x0a503c36, 0x7fdf1f60, 0xc566a461, 0xa751f552, 0xe76b688f, 0x612f5b3a, 0x5aeac19b, 0x06301412, 0x460a89cf, 0x441a85c1, 0x422a91d3, 0x0420181c, 0xa069e747, 0xdb96e03b, 0x39d596af, 0x864433b5, 0x549ae5b1, 0xaa39db71, 0x8c140f83, 0x34bdb88c, 0x2115c6e7, 0x8b2c1d96, 0xf8932ad2, 0x0c602824, 0x74872551, 0x671f4f28];

KupynaTrans.T3L = [0x6868d568, 0x8d8d838d, 0xcacac5ca, 0x4d4d644d, 0x7373a273, 0x4b4b7a4b, 0x4e4e6b4e, 0x2a2a822a, 0xd4d4a3d4, 0x52520752, 0x2626be26, 0xb3b345b3, 0x54541954, 0x1e1e661e, 0x19197d19, 0x1f1f631f, 0x2222aa22, 0x03030f03, 0x46464346, 0x3d3dc93d, 0x2d2d992d, 0x4a4a7f4a, 0x53530253, 0x8383b583, 0x13135f13, 0x8a8a988a, 0xb7b751b7, 0xd5d5a6d5, 0x2525b125, 0x79798079, 0xf5f506f5, 0xbdbd73bd, 0x58582558, 0x2f2f932f, 0x0d0d390d, 0x02020a02, 0xeded7eed, 0x51510851, 0x9e9edc9e, 0x11115511, 0xf2f21df2, 0x3e3ec63e, 0x55551c55, 0x5e5e3b5e, 0xd1d1b2d1, 0x16164e16, 0x3c3ccc3c, 0x6666e366, 0x7070ad70, 0x5d5d345d, 0xf3f318f3, 0x45454c45, 0x40405d40, 0xccccdbcc, 0xe8e86fe8, 0x9494fe94, 0x56561356, 0x08082808, 0xceced1ce, 0x1a1a721a, 0x3a3ad23a, 0xd2d2bdd2, 0xe1e142e1, 0xdfdf84df, 0xb5b55bb5, 0x3838d838, 0x6e6ecb6e, 0x0e0e360e, 0xe5e556e5, 0xf4f403f4, 0xf9f93af9, 0x8686a486, 0xe9e96ae9, 0x4f4f6e4f, 0xd6d6a9d6, 0x8585ab85, 0x2323af23, 0xcfcfd4cf, 0x3232fa32, 0x9999c799, 0x3131f531, 0x14144414, 0xaeae2cae, 0xeeee71ee, 0xc8c8cfc8, 0x48487548, 0xd3d3b8d3, 0x3030f030, 0xa1a11fa1, 0x9292e092, 0x41415841, 0xb1b14fb1, 0x18187818, 0xc4c4f3c4, 0x2c2c9c2c, 0x7171a871, 0x7272a772, 0x44444944, 0x15154115, 0xfdfd2efd, 0x3737eb37, 0xbebe7cbe, 0x5f5f3e5f, 0xaaaa38aa, 0x9b9bcd9b, 0x88889288, 0xd8d89fd8, 0xabab3dab, 0x89899789, 0x9c9cd69c, 0xfafa35fa, 0x6060fd60, 0xeaea65ea, 0xbcbc76bc, 0x6262f762, 0x0c0c3c0c, 0x2424b424, 0xa6a604a6, 0xa8a832a8, 0xecec7bec, 0x6767e667, 0x2020a020, 0xdbdb90db, 0x7c7c917c, 0x28288828, 0xdddd8edd, 0xacac26ac, 0x5b5b2a5b, 0x3434e434, 0x7e7e9b7e, 0x10105010, 0xf1f112f1, 0x7b7b8a7b, 0x8f8f898f, 0x6363f263, 0xa0a01aa0, 0x05051105, 0x9a9ac89a, 0x43435243, 0x7777b677, 0x2121a521, 0xbfbf79bf, 0x2727bb27, 0x09092d09, 0xc3c3e8c3, 0x9f9fd99f, 0xb6b654b6, 0xd7d7acd7, 0x29298d29, 0xc2c2edc2, 0xebeb60eb, 0xc0c0e7c0, 0xa4a40ea4, 0x8b8b9d8b, 0x8c8c868c, 0x1d1d691d, 0xfbfb30fb, 0xffff24ff, 0xc1c1e2c1, 0xb2b240b2, 0x9797f197, 0x2e2e962e, 0xf8f83ff8, 0x6565ec65, 0xf6f609f6, 0x7575bc75, 0x07071b07, 0x04041404, 0x49497049, 0x3333ff33, 0xe4e453e4, 0xd9d99ad9, 0xb9b967b9, 0xd0d0b7d0, 0x42425742, 0xc7c7fcc7, 0x6c6cc16c, 0x9090ea90, 0x00000000, 0x8e8e8c8e, 0x6f6fce6f, 0x50500d50, 0x01010501, 0xc5c5f6c5, 0xdada95da, 0x47474647, 0x3f3fc33f, 0xcdcddecd, 0x6969d069, 0xa2a210a2, 0xe2e24de2, 0x7a7a8f7a, 0xa7a701a7, 0xc6c6f9c6, 0x9393e593, 0x0f0f330f, 0x0a0a220a, 0x06061e06, 0xe6e659e6, 0x2b2b872b, 0x9696f496, 0xa3a315a3, 0x1c1c6c1c, 0xafaf29af, 0x6a6adf6a, 0x12125a12, 0x8484ae84, 0x3939dd39, 0xe7e75ce7, 0xb0b04ab0, 0x8282b082, 0xf7f70cf7, 0xfefe21fe, 0x9d9dd39d, 0x8787a187, 0x5c5c315c, 0x8181bf81, 0x3535e135, 0xdede81de, 0xb4b45eb4, 0xa5a50ba5, 0xfcfc2bfc, 0x8080ba80, 0xefef74ef, 0xcbcbc0cb, 0xbbbb6dbb, 0x6b6bda6b, 0x7676b376, 0xbaba68ba, 0x5a5a2f5a, 0x7d7d947d, 0x78788578, 0x0b0b270b, 0x9595fb95, 0xe3e348e3, 0xadad23ad, 0x7474b974, 0x9898c298, 0x3b3bd73b, 0x3636ee36, 0x6464e964, 0x6d6dc46d, 0xdcdc8bdc, 0xf0f017f0, 0x59592059, 0xa9a937a9, 0x4c4c614c, 0x17174b17, 0x7f7f9e7f, 0x9191ef91, 0xb8b862b8, 0xc9c9cac9, 0x57571657, 0x1b1b771b, 0xe0e047e0, 0x6161f861];

KupynaTrans.T3H = [0x676d05bd, 0x1c09840e, 0x1e864c0f, 0x52b3fe29, 0xbf3744d1, 0x62a7ec31, 0x4ab9f725, 0x4dfcd6a8, 0xeec21677, 0xaaf1a355, 0x2dd4f298, 0xf18d3ef6, 0x9ae5b14d, 0xf0445a78, 0xc8564f64, 0xf8425d7c, 0x0dccee88, 0x180a090c, 0x0a89cf05, 0xf58eb3f4, 0x75eec3b4, 0x6aa1eb35, 0xa2f7a451, 0x6c2dae36, 0x986a794c, 0x241b9112, 0xd19522e6, 0xe6c41173, 0x35defb94, 0xef0b72f9, 0xfb04f1f3, 0x81a914ce, 0xfacd957d, 0x65e2cdbc, 0x682e2334, 0x100c0e08, 0x3b54b993, 0xb2fbaa59, 0x8463fd42, 0x88667744, 0xc316e4ef, 0xed84baf8, 0x92e3b649, 0xcad98765, 0xc6dc0d63, 0xb0746258, 0xfd88b4f0, 0x17492f85, 0xa73d4ddd, 0xd2d38e69, 0xcb10e3eb, 0x1283c609, 0x3a9ddd1d, 0x2e925e17, 0x134aa287, 0xd45fcb6a, 0x8ae9bf45, 0x40303820, 0x3e9e501f, 0xd05c4668, 0xcd9ca6e8, 0xded6046f, 0x5b7c9da3, 0xb6f8275b, 0xc1992cee, 0xdd90a8e0, 0x577917a5, 0x70242a38, 0x7b6481b3, 0xf302f6f7, 0x9b2cd5c3, 0x4433b522, 0x1b4ca583, 0x42bff021, 0xfece187f, 0x5c39bc2e, 0x05cae98c, 0x3698571b, 0x8dac9ec8, 0xbc71e85e, 0x95a697c4, 0xa0786c50, 0x19c36d82, 0x235eb09f, 0x0e8a4207, 0x7aade53d, 0xd6d0036b, 0x9da090c0, 0x61e140be, 0xe44bd972, 0x329bda19, 0xe18130fe, 0xc0504860, 0x6ea26637, 0x7de8c4b0, 0xaf3b4ad9, 0xb73143d5, 0x1a85c10d, 0xa87e6b54, 0xbb34c9d3, 0xa5b285dc, 0x99a31dc2, 0xc2df8061, 0x39db7192, 0xac7de656, 0x34179f1a, 0x8eea3247, 0x31dd7696, 0x3c11981e, 0x946ff34a, 0x8326dccf, 0x275d3d9d, 0x0346ac8f, 0x89af13ca, 0x37513395, 0x60282430, 0x3dd8fc90, 0x59f355a2, 0x29d77f9a, 0x3352be97, 0x1f4f2881, 0x1dc0e080, 0x96e03b4b, 0xc71569ed, 0x5df0d8a0, 0xa6f42953, 0x09cf638a, 0xe2c79c71, 0xbdb88cd0, 0xd71967e5, 0x80607040, 0xdb1cede3, 0xff077cf1, 0x0c058a06, 0x3f573491, 0x69e747ba, 0x281e1b14, 0xa47be152, 0x2297d411, 0x9f2f58c1, 0x15c6e784, 0x91a51ac6, 0x25d2f59c, 0x48363f24, 0x56b0732b, 0x8c65fa46, 0xd99325e2, 0xf6c81f7b, 0x55f6dfa4, 0x5eb6742f, 0x0b40ab8b, 0x4eba7a27, 0x49ff5baa, 0x2c1d9616, 0x140f830a, 0xe84e5374, 0x8b20dbcb, 0xab38c7db, 0x46bc7d23, 0xf98b39f2, 0xcc55c266, 0x6de4cab8, 0x932ad2c7, 0x0f432689, 0xe30ef8ff, 0x8f2356c9, 0x3812151c, 0x20181c10, 0x72abe239, 0x85aa99cc, 0x736286b7, 0x86ec3543, 0xa1b108de, 0xceda0a67, 0x2a91d315, 0x76a86f3b, 0x477519ad, 0xf447d77a, 0x00000000, 0x04038d02, 0x5f7f10a1, 0xbafdad5d, 0x08060704, 0x66a46133, 0x9ee63c4f, 0x028fc801, 0xe582bdfc, 0x26945913, 0x6f6b02b9, 0x79eb49b2, 0x437694af, 0xf7017bf5, 0x51f552a6, 0x7eae683f, 0xec4dde76, 0x78222d3c, 0x503c3628, 0x30141218, 0x636e88bf, 0x45fad1ac, 0xc453c562, 0x71ed4eb6, 0xe0485470, 0x11c56a86, 0x77610bb5, 0x906c7e48, 0x543fbb2a, 0xd596afe4, 0x6b688fbb, 0xe98737fa, 0x642ba932, 0xeb08fffb, 0xa33ec0df, 0x9c69f44e, 0x4c35b226, 0xdad5896d, 0x7c21a03e, 0xb5be8bd4, 0xbefe205f, 0xc99f2bea, 0x41f95cae, 0xb332ced7, 0x7427a73a, 0x2b58b79b, 0x16804b0b, 0xb1bd06d6, 0x7f670cb1, 0x97295fc5, 0xb9bb01d2, 0xeac19b75, 0xcf136ee9, 0xe70d75fd, 0x583a312c, 0xdc59cc6e, 0x4b7093ab, 0x01c9648e, 0x872551cd, 0xb477ef5a, 0xc59aa1ec, 0xadb482d8, 0x0745218d, 0x4f731ea9, 0xaef22e57, 0xd31aeae7, 0xf2cb9279, 0x21d1789e, 0x5ab5f92d, 0xb872655c, 0xdf1f60e1, 0xfc41d07e, 0xa9b70fda, 0x068c4503, 0x82efb841, 0xd85a416c, 0x537a9aa7, 0x2f5b3a99];

KupynaTrans.T4L = [0xa832a829, 0x43524322, 0x5f3e5fc2, 0x061e0630, 0x6bda6b7f, 0x75bc758f, 0x6cc16c47, 0x592059f2, 0x71a871af, 0xdf84dfb6, 0x87a1874c, 0x95fb95dc, 0x174b17b8, 0xf017f0d3, 0xd89fd88e, 0x092d0948, 0x6dc46d4f, 0xf318f3cb, 0x1d691de8, 0xcbc0cb16, 0xc9cac906, 0x4d644d52, 0x2c9c2c7d, 0xaf29af11, 0x798079ef, 0xe047e053, 0x97f197cc, 0xfd2efdbb, 0x6fce6f5f, 0x4b7a4b62, 0x454c4512, 0x39dd39d5, 0x3ec63eed, 0xdd8edda6, 0xa315a371, 0x4f6e4f42, 0xb45eb4c9, 0xb654b6d9, 0x9ac89aa4, 0x0e360e70, 0x1f631ff8, 0xbf79bf91, 0x154115a8, 0xe142e15b, 0x49704972, 0xd2bdd2de, 0x93e593ec, 0xc6f9c67e, 0x92e092e4, 0x72a772b7, 0x9edc9e84, 0x61f8612f, 0xd1b2d1c6, 0x63f2633f, 0xfa35fa83, 0xee71ee23, 0xf403f4f3, 0x197d19c8, 0xd5a6d5e6, 0xad23ad01, 0x582558fa, 0xa40ea449, 0xbb6dbbb1, 0xa11fa161, 0xdc8bdcae, 0xf21df2c3, 0x83b5836c, 0x37eb37a5, 0x4257422a, 0xe453e473, 0x7a8f7af7, 0x32fa328d, 0x9cd69c94, 0xccdbcc2e, 0xab3dab31, 0x4a7f4a6a, 0x8f898f0c, 0x6ecb6e57, 0x04140420, 0x27bb2725, 0x2e962e6d, 0xe75ce76b, 0xe24de243, 0x5a2f5aea, 0x96f496c4, 0x164e16b0, 0x23af2305, 0x2b872b45, 0xc2edc25e, 0x65ec650f, 0x66e36617, 0x0f330f78, 0xbc76bc89, 0xa937a921, 0x47464702, 0x41584132, 0x34e434bd, 0x4875487a, 0xfc2bfcb3, 0xb751b7d1, 0x6adf6a77, 0x88928834, 0xa50ba541, 0x530253a2, 0x86a48644, 0xf93af99b, 0x5b2a5be2, 0xdb90db96, 0x38d838dd, 0x7b8a7bff, 0xc3e8c356, 0x1e661ef0, 0x22aa220d, 0x33ff3385, 0x24b4243d, 0x2888285d, 0x36ee36ad, 0xc7fcc776, 0xb240b2f9, 0x3bd73bc5, 0x8e8c8e04, 0x77b6779f, 0xba68bab9, 0xf506f5fb, 0x144414a0, 0x9fd99f8c, 0x08280840, 0x551c5592, 0x9bcd9bac, 0x4c614c5a, 0xfe21fea3, 0x60fd6027, 0x5c315cda, 0xda95da9e, 0x187818c0, 0x4643460a, 0xcddecd26, 0x7d947dcf, 0x21a52115, 0xb04ab0e9, 0x3fc33fe5, 0x1b771bd8, 0x8997893c, 0xff24ffab, 0xeb60eb0b, 0x84ae8454, 0x69d0696f, 0x3ad23acd, 0x9dd39d9c, 0xd7acd7f6, 0xd3b8d3d6, 0x70ad70a7, 0x67e6671f, 0x405d403a, 0xb55bb5c1, 0xde81debe, 0x5d345dd2, 0x30f0309d, 0x91ef91fc, 0xb14fb1e1, 0x788578e7, 0x11551188, 0x01050108, 0xe556e57b, 0x00000000, 0x68d56867, 0x98c298b4, 0xa01aa069, 0xc5f6c566, 0x020a0210, 0xa604a659, 0x74b97487, 0x2d992d75, 0x0b270b58, 0xa210a279, 0x76b37697, 0xb345b3f1, 0xbe7cbe99, 0xced1ce3e, 0xbd73bd81, 0xae2cae19, 0xe96ae91b, 0x8a988a24, 0x31f53195, 0x1c6c1ce0, 0xec7bec33, 0xf112f1db, 0x99c799bc, 0x94fe94d4, 0xaa38aa39, 0xf609f6e3, 0x26be262d, 0x2f932f65, 0xef74ef2b, 0xe86fe813, 0x8c868c14, 0x35e135b5, 0x030f0318, 0xd4a3d4ee, 0x7f9e7fdf, 0xfb30fb8b, 0x05110528, 0xc1e2c146, 0x5e3b5eca, 0x90ea90f4, 0x20a0201d, 0x3dc93df5, 0x82b08264, 0xf70cf7eb, 0xea65ea03, 0x0a220a50, 0x0d390d68, 0x7e9b7ed7, 0xf83ff893, 0x500d50ba, 0x1a721ad0, 0xc4f3c46e, 0x071b0738, 0x57165782, 0xb862b8a9, 0x3ccc3cfd, 0x62f76237, 0xe348e34b, 0xc8cfc80e, 0xac26ac09, 0x520752aa, 0x64e96407, 0x10501080, 0xd0b7d0ce, 0xd99ad986, 0x135f1398, 0x0c3c0c60, 0x125a1290, 0x298d2955, 0x510851b2, 0xb967b9a1, 0xcfd4cf36, 0xd6a9d6fe, 0x73a273bf, 0x8d838d1c, 0x81bf817c, 0x5419549a, 0xc0e7c04e, 0xed7eed3b, 0x4e6b4e4a, 0x4449441a, 0xa701a751, 0x2a822a4d, 0x85ab855c, 0x25b12535, 0xe659e663, 0xcac5ca1e, 0x7c917cc7, 0x8b9d8b2c, 0x5613568a, 0x80ba8074];

KupynaTrans.T4H = [0xd77f9aa8, 0x97d41143, 0xdf80615f, 0x14121806, 0x670cb16b, 0x2356c975, 0x7519ad6c, 0xcb927959, 0x3b4ad971, 0xf8275bdf, 0x35b22687, 0x59cc6e95, 0x72655c17, 0x1aeae7f0, 0xea3247d8, 0x363f2409, 0x731ea96d, 0x10e3ebf3, 0x4e53741d, 0x804b0bcb, 0x8c4503c9, 0xb3fe294d, 0xe8c4b02c, 0xc56a86af, 0x0b72f979, 0x7a9aa7e0, 0x55c26697, 0x34c9d3fd, 0x7f10a16f, 0xa7ec314b, 0x83c60945, 0x96afe439, 0x84baf83e, 0xf42953dd, 0xed4eb6a3, 0xbff0214f, 0x9f2beab4, 0x9325e2b6, 0x7be1529a, 0x242a380e, 0x425d7c1f, 0xa51ac6bf, 0x7e6b5415, 0x7c9da3e1, 0xabe23949, 0xd6046fd2, 0x4dde7693, 0xae683fc6, 0x4bd97292, 0x3143d572, 0x63fd429e, 0x5b3a9961, 0xdc0d63d1, 0x57349163, 0x26dccffa, 0x5eb09fee, 0x02f6f7f4, 0x564f6419, 0xc41173d5, 0xc9648ead, 0xcd957d58, 0xff5baaa4, 0xbd06d6bb, 0xe140bea1, 0xf22e57dc, 0x16e4eff2, 0x2dae3683, 0xb285dc37, 0x91d31542, 0x6286b7e4, 0x017bf57a, 0xac9ec832, 0x6ff34a9c, 0x925e17cc, 0xdd7696ab, 0xa1eb354a, 0x058a068f, 0x7917a56e, 0x181c1004, 0xd2f59c27, 0xe4cab82e, 0x688fbbe7, 0x7694afe2, 0xc19b755a, 0x53c56296, 0x74625816, 0xcae98c23, 0xfad1ac2b, 0xb6742fc2, 0x43268965, 0x492f8566, 0x222d3c0f, 0xaf13cabc, 0xd1789ea9, 0x8fc80147, 0x9bda1941, 0xb88cd034, 0xade53d48, 0x32ced7fc, 0x9522e6b7, 0x610bb56a, 0x179f1a88, 0xf95caea5, 0xf7a45153, 0x33b52286, 0x2cd5c3f9, 0xc79c715b, 0xe03b4bdb, 0x90a8e038, 0x077cf17b, 0xb0732bc3, 0x445a781e, 0xccee8822, 0xaa99cc33, 0xd8fc9024, 0xf0d8a028, 0xb482d836, 0xa86f3bc7, 0x8b39f2b2, 0x9aa1ec3b, 0x038d028e, 0x2f58c177, 0xbb01d2ba, 0x04f1f3f5, 0x786c5014, 0x65fa469f, 0x30382008, 0xe3b64955, 0x7de6569b, 0xb5f92d4c, 0x3ec0dffe, 0x5d3d9d60, 0xd5896d5c, 0xe63c4fda, 0x50486018, 0x89cf0546, 0x945913cd, 0x136ee97d, 0xc6e78421, 0x8737fab0, 0x82bdfc3f, 0x5a416c1b, 0x11981e89, 0x38c7dbff, 0x40ab8beb, 0x3fbb2a84, 0x6b02b969, 0x9ca6e83a, 0x69f44e9d, 0xc81f7bd7, 0xd0036bd3, 0x3d4ddd70, 0x4f288167, 0x9ddd1d40, 0x992ceeb5, 0xfe205fde, 0xd38e695d, 0xa090c030, 0x41d07e91, 0x8130feb1, 0x0d75fd78, 0x66774411, 0x06070401, 0x6481b3e5, 0x00000000, 0x6d05bd68, 0x77ef5a98, 0xe747baa0, 0xa46133c5, 0x0c0e0802, 0xf355a2a6, 0x2551cd74, 0xeec3b42d, 0x3a312c0b, 0xeb49b2a2, 0x295fc576, 0x8d3ef6b3, 0xa31dc2be, 0x9e501fce, 0xa914cebd, 0xc36d82ae, 0x4ca583e9, 0x1b91128a, 0xa697c431, 0x4854701c, 0x52be97ec, 0x1cede3f1, 0x71e85e99, 0x5fcb6a94, 0xdb7192aa, 0x0ef8fff6, 0xd4f29826, 0xe2cdbc2f, 0x58b79bef, 0x4aa287e8, 0x0f830a8c, 0xbe8bd435, 0x0a090c03, 0xc21677d4, 0x1f60e17f, 0x20dbcbfb, 0x1e1b1405, 0xbc7d23c1, 0xd987655e, 0x47d77a90, 0xc0e08020, 0x8eb3f43d, 0x2ba93282, 0x08fffbf7, 0x46ac8fea, 0x3c36280a, 0x2e23340d, 0x1967e57e, 0x2ad2c7f8, 0xfdad5d50, 0x5c46681a, 0xa26637c4, 0x12151c07, 0xefb84157, 0xb70fdab8, 0x88b4f03c, 0x51339562, 0x7093abe3, 0x8a4207c8, 0xcf638aac, 0xf1a35552, 0x45218d64, 0x60704010, 0xda0a67d0, 0xec3543d9, 0x6a794c13, 0x2824300c, 0x6c7e4812, 0xf6dfa429, 0xfbaa5951, 0xb108deb9, 0x98571bcf, 0xce187fd6, 0x3744d173, 0x09840e8d, 0x21a03e81, 0xe5b14d54, 0xba7a27c0, 0x54b993ed, 0xb9f7254e, 0x85c10d44, 0xf552a6a7, 0xfcd6a82a, 0x39bc2e85, 0xdefb9425, 0x6e88bfe6, 0x864c0fca, 0x1569ed7c, 0x1d96168b, 0xe9bf4556, 0x27a73a80];

KupynaTrans.T5L = [0xd1ce3e9e, 0x6dbbb1bd, 0x60eb0b40, 0xe092e44b, 0x65ea0346, 0xc0cb1680, 0x5f13986a, 0xe2c146bc, 0x6ae91b4c, 0xd23acd9c, 0xa9d6fece, 0x40b2f98b, 0xbdd2ded6, 0xea90f447, 0x4b17b872, 0x3ff8932a, 0x57422a91, 0x4115a87e, 0x13568ae9, 0x5eb4c99f, 0xec650f43, 0x6c1ce048, 0x92883417, 0x52432297, 0xf6c566a4, 0x315cdad5, 0xee36adb4, 0x68bab9bb, 0x06f5fb04, 0x165782ef, 0xe6671f4f, 0x838d1c09, 0xf53195a6, 0x09f6e30e, 0xe9640745, 0x2558facd, 0xdc9e8463, 0x03f4f302, 0xaa220dcc, 0x38aa39db, 0xbc758f23, 0x330f7822, 0x0a02100c, 0x4fb1e181, 0x84dfb6f8, 0xc46d4f73, 0xa273bf37, 0x644d52b3, 0x917cc715, 0xbe262dd4, 0x962e6de4, 0x0cf7eb08, 0x28084030, 0x345dd2d3, 0x49441a85, 0xc63eed84, 0xd99f8c65, 0x4414a078, 0xcfc80e8a, 0x2cae19c3, 0x19549ae5, 0x50108060, 0x9fd88eea, 0x76bc89af, 0x721ad05c, 0xda6b7f67, 0xd0696f6b, 0x18f3cb10, 0x73bd81a9, 0xff3385aa, 0x3dab31dd, 0x35fa8326, 0xb2d1c6dc, 0xcd9bac7d, 0xd568676d, 0x6b4e4ab9, 0x4e16b074, 0xfb95dc59, 0xef91fc41, 0x71ee235e, 0x614c5ab5, 0xf2633f57, 0x8c8e0403, 0x2a5be2c7, 0xdbcc2e92, 0xcc3cfd88, 0x7d19c856, 0x1fa161e1, 0xbf817c21, 0x704972ab, 0x8a7bff07, 0x9ad986ec, 0xce6f5f7f, 0xeb37a5b2, 0xfd60275d, 0xc5ca1e86, 0x5ce76b68, 0x872b45fa, 0x75487aad, 0x2efdbb34, 0xf496c453, 0x4c451283, 0x2bfcb332, 0x5841329b, 0x5a12906c, 0x390d682e, 0x8079ef0b, 0x56e57b64, 0x97893c11, 0x868c140f, 0x48e34b70, 0xa0201dc0, 0xf0309da0, 0x8bdcaef2, 0x51b7d195, 0xc16c4775, 0x7f4a6aa1, 0x5bb5c199, 0xc33fe582, 0xf197cc55, 0xa3d4eec2, 0xf7623751, 0x992d75ee, 0x1e063014, 0x0ea449ff, 0x0ba541f9, 0xb5836c2d, 0x3e5fc2df, 0x822a4dfc, 0x95da9ee6, 0xcac9068c, 0x00000000, 0x9b7ed719, 0x10a279eb, 0x1c5592e3, 0x79bf91a5, 0x55118866, 0xa6d5e6c4, 0xd69c946f, 0xd4cf3698, 0x360e7024, 0x220a503c, 0xc93df58e, 0x0851b2fb, 0x947dcf13, 0xe593ec4d, 0x771bd85a, 0x21fea33e, 0xf3c46ea2, 0x4647028f, 0x2d094836, 0xa4864433, 0x270b583a, 0x898f0c05, 0xd39d9c69, 0xdf6a7761, 0x1b073812, 0x67b9a1b1, 0x4ab0e987, 0xc298b477, 0x7818c050, 0xfa328dac, 0xa871af3b, 0x7a4b62a7, 0x74ef2b58, 0xd73bc59a, 0xad70a73d, 0x1aa069e7, 0x53e47362, 0x5d403a9d, 0x24ffab38, 0xe8c356b0, 0x37a921d1, 0x59e6636e, 0x8578e70d, 0x3af99b2c, 0x9d8b2c1d, 0x43460a89, 0xba807427, 0x661ef044, 0xd838dd90, 0x42e15b7c, 0x62b8a9b7, 0x32a829d7, 0x47e0537a, 0x3c0c6028, 0xaf2305ca, 0xb3769729, 0x691de84e, 0xb12535de, 0xb4243dd8, 0x1105281e, 0x12f1db1c, 0xcb6e5779, 0xfe94d45f, 0x88285df0, 0xc89aa47b, 0xae84543f, 0x6fe8134a, 0x15a371ed, 0x6e4f42bf, 0xb6779f2f, 0xb8d3d6d0, 0xab855c39, 0x4de24376, 0x0752aaf1, 0x1df2c316, 0xb082642b, 0x0d50bafd, 0x8f7af701, 0x932f65e2, 0xb9748725, 0x0253a2f7, 0x45b3f18d, 0xf8612f5b, 0x29af11c5, 0xdd39d596, 0xe135b5be, 0x81debefe, 0xdecd2694, 0x631ff842, 0xc799bc71, 0x26ac09cf, 0x23ad01c9, 0xa772b731, 0x9c2c7de8, 0x8edda6f4, 0xb7d0ceda, 0xa1874c35, 0x7cbe99a3, 0x3b5ecad9, 0x04a659f3, 0x7bec3352, 0x14042018, 0xf9c67eae, 0x0f03180a, 0xe434bdb8, 0x30fb8b20, 0x90db96e0, 0x2059f2cb, 0x54b6d993, 0xedc25eb6, 0x05010806, 0x17f0d31a, 0x2f5aeac1, 0x7eed3b54, 0x01a751f5, 0xe3661749, 0xa52115c6, 0x9e7fdf1f, 0x988a241b, 0xbb2725d2, 0xfcc776a8, 0xe7c04eba, 0x8d2955f6, 0xacd7f6c8];

KupynaTrans.T5H = [0x501fcece, 0x06d6bbbb, 0xab8bebeb, 0xd9729292, 0xac8feaea, 0x4b0bcbcb, 0x794c1313, 0x7d23c1c1, 0xa583e9e9, 0xa6e83a3a, 0x187fd6d6, 0x39f2b2b2, 0x046fd2d2, 0xd77a9090, 0x655c1717, 0xd2c7f8f8, 0xd3154242, 0x6b541515, 0xbf455656, 0x2beab4b4, 0x26896565, 0x54701c1c, 0x9f1a8888, 0xd4114343, 0x6133c5c5, 0x896d5c5c, 0x82d83636, 0x01d2baba, 0xf1f3f5f5, 0xb8415757, 0x28816767, 0x840e8d8d, 0x97c43131, 0xf8fff6f6, 0x218d6464, 0x957d5858, 0xfd429e9e, 0xf6f7f4f4, 0xee882222, 0x7192aaaa, 0x56c97575, 0x2d3c0f0f, 0x0e080202, 0x30feb1b1, 0x275bdfdf, 0x1ea96d6d, 0x44d17373, 0xfe294d4d, 0x69ed7c7c, 0xf2982626, 0xcab82e2e, 0xfffbf7f7, 0x38200808, 0x8e695d5d, 0xc10d4444, 0xbaf83e3e, 0xfa469f9f, 0x6c501414, 0x4207c8c8, 0x6d82aeae, 0xb14d5454, 0x70401010, 0x3247d8d8, 0x13cabcbc, 0x46681a1a, 0x0cb16b6b, 0x02b96969, 0xe3ebf3f3, 0x14cebdbd, 0x99cc3333, 0x7696abab, 0xdccffafa, 0x0d63d1d1, 0xe6569b9b, 0x05bd6868, 0xf7254e4e, 0x62581616, 0xcc6e9595, 0xd07e9191, 0xb09feeee, 0xf92d4c4c, 0x34916363, 0x8d028e8e, 0x9c715b5b, 0x5e17cccc, 0xb4f03c3c, 0x4f641919, 0x40bea1a1, 0xa03e8181, 0xe2394949, 0x7cf17b7b, 0x3543d9d9, 0x10a16f6f, 0x85dc3737, 0x3d9d6060, 0x4c0fcaca, 0x8fbbe7e7, 0xd1ac2b2b, 0xe53d4848, 0xc9d3fdfd, 0xc5629696, 0xc6094545, 0xced7fcfc, 0xda194141, 0x7e481212, 0x23340d0d, 0x72f97979, 0x81b3e5e5, 0x981e8989, 0x830a8c8c, 0x93abe3e3, 0xe0802020, 0x90c03030, 0x2e57dcdc, 0x22e6b7b7, 0x19ad6c6c, 0xeb354a4a, 0x2ceeb5b5, 0xbdfc3f3f, 0xc2669797, 0x1677d4d4, 0x33956262, 0xc3b42d2d, 0x12180606, 0x5baaa4a4, 0x5caea5a5, 0xae368383, 0x80615f5f, 0xd6a82a2a, 0x3c4fdada, 0x4503c9c9, 0x00000000, 0x67e57e7e, 0x49b2a2a2, 0xb6495555, 0x1ac6bfbf, 0x77441111, 0x1173d5d5, 0xf34a9c9c, 0x571bcfcf, 0x2a380e0e, 0x36280a0a, 0xb3f43d3d, 0xaa595151, 0x6ee97d7d, 0xde769393, 0x416c1b1b, 0xc0dffefe, 0x6637c4c4, 0xc8014747, 0x3f240909, 0xb5228686, 0x312c0b0b, 0x8a068f8f, 0xf44e9d9d, 0x0bb56a6a, 0x151c0707, 0x08deb9b9, 0x37fab0b0, 0xef5a9898, 0x48601818, 0x9ec83232, 0x4ad97171, 0xec314b4b, 0xb79befef, 0xa1ec3b3b, 0x4ddd7070, 0x47baa0a0, 0x86b7e4e4, 0xdd1d4040, 0xc7dbffff, 0x732bc3c3, 0x789ea9a9, 0x88bfe6e6, 0x75fd7878, 0xd5c3f9f9, 0x96168b8b, 0xcf054646, 0xa73a8080, 0x5a781e1e, 0xa8e03838, 0x9da3e1e1, 0x0fdab8b8, 0x7f9aa8a8, 0x9aa7e0e0, 0x24300c0c, 0xe98c2323, 0x5fc57676, 0x53741d1d, 0xfb942525, 0xfc902424, 0x1b140505, 0xede3f1f1, 0x17a56e6e, 0xcb6a9494, 0xd8a02828, 0xe1529a9a, 0xbb2a8484, 0xa287e8e8, 0x4eb6a3a3, 0xf0214f4f, 0x58c17777, 0x036bd3d3, 0xbc2e8585, 0x94afe2e2, 0xa3555252, 0xe4eff2f2, 0xa9328282, 0xad5d5050, 0x7bf57a7a, 0xcdbc2f2f, 0x51cd7474, 0xa4515353, 0x3ef6b3b3, 0x3a996161, 0x6a86afaf, 0xafe43939, 0x8bd43535, 0x205fdede, 0x5913cdcd, 0x5d7c1f1f, 0xe85e9999, 0x638aacac, 0x648eadad, 0x43d57272, 0xc4b02c2c, 0x2953dddd, 0x0a67d0d0, 0xb2268787, 0x1dc2bebe, 0x87655e5e, 0x55a2a6a6, 0xbe97ecec, 0x1c100404, 0x683fc6c6, 0x090c0303, 0x8cd03434, 0xdbcbfbfb, 0x3b4bdbdb, 0x92795959, 0x25e2b6b6, 0x742fc2c2, 0x07040101, 0xeae7f0f0, 0x9b755a5a, 0xb993eded, 0x52a6a7a7, 0x2f856666, 0xe7842121, 0x60e17f7f, 0x91128a8a, 0xf59c2727, 0x6f3bc7c7, 0x7a27c0c0, 0xdfa42929, 0x1f7bd7d7];

KupynaTrans.T6L = [0x93ec4dde, 0xd986ec35, 0x9aa47be1, 0xb5c1992c, 0x98b477ef, 0x220dccee, 0x451283c6, 0xfcb332ce, 0xbab9bb01, 0x6a77610b, 0xdfb6f827, 0x02100c0e, 0x9f8c65fa, 0xdcaef22e, 0x51b2fbaa, 0x59f2cb92, 0x4a6aa1eb, 0x17b87265, 0x2b45fad1, 0xc25eb674, 0x94d45fcb, 0xf4f302f6, 0xbbb1bd06, 0xa371ed4e, 0x62375133, 0xe4736286, 0x71af3b4a, 0xd4eec216, 0xcd269459, 0x70a73d4d, 0x16b07462, 0xe15b7c9d, 0x4972abe2, 0x3cfd88b4, 0xc04eba7a, 0xd88eea32, 0x5cdad589, 0x9bac7de6, 0xad01c964, 0x855c39bc, 0x53a2f7a4, 0xa161e140, 0x7af7017b, 0xc80e8a42, 0x2d75eec3, 0xe0537a9a, 0xd1c6dc0d, 0x72b73143, 0xa659f355, 0x2c7de8c4, 0xc46ea266, 0xe34b7093, 0x7697295f, 0x78e70d75, 0xb7d19522, 0xb4c99f2b, 0x0948363f, 0x3bc59aa1, 0x0e70242a, 0x41329bda, 0x4c5ab5f9, 0xdebefe20, 0xb2f98b39, 0x90f447d7, 0x2535defb, 0xa541f95c, 0xd7f6c81f, 0x03180a09, 0x11886677, 0x00000000, 0xc356b073, 0x2e6de4ca, 0x92e44bd9, 0xef2b58b7, 0x4e4ab9f7, 0x12906c7e, 0x9d9c69f4, 0x7dcf136e, 0xcb16804b, 0x35b5be8b, 0x10806070, 0xd5e6c411, 0x4f42bff0, 0x9e8463fd, 0x4d52b3fe, 0xa921d178, 0x5592e3b6, 0xc67eae68, 0xd0ceda0a, 0x7bff077c, 0x18c05048, 0x97cc55c2, 0xd3d6d003, 0x36adb482, 0xe6636e88, 0x487aade5, 0x568ae9bf, 0x817c21a0, 0x8f0c058a, 0x779f2f58, 0xcc2e925e, 0x9c946ff3, 0xb9a1b108, 0xe2437694, 0xac09cf63, 0xb8a9b70f, 0x2f65e2cd, 0x15a87e6b, 0xa449ff5b, 0x7cc71569, 0xda9ee63c, 0x38dd90a8, 0x1ef0445a, 0x0b583a31, 0x05281e1b, 0xd6fece18, 0x14a0786c, 0x6e577917, 0x6c477519, 0x7ed71967, 0x6617492f, 0xfdbb34c9, 0xb1e18130, 0xe57b6481, 0x60275d3d, 0xaf11c56a, 0x5ecad987, 0x3385aa99, 0x874c35b2, 0xc9068c45, 0xf0d31aea, 0x5dd2d38e, 0x6d4f731e, 0x3fe582bd, 0x8834179f, 0x8d1c0984, 0xc776a86f, 0xf7eb08ff, 0x1de84e53, 0xe91b4ca5, 0xec3352be, 0xed3b54b9, 0x807427a7, 0x2955f6df, 0x2725d2f5, 0xcf369857, 0x99bc71e8, 0xa829d77f, 0x50bafdad, 0x0f78222d, 0x37a5b285, 0x243dd8fc, 0x285df0d8, 0x309da090, 0x95dc59cc, 0xd2ded604, 0x3eed84ba, 0x5be2c79c, 0x403a9ddd, 0x836c2dae, 0xb3f18d3e, 0x696f6b02, 0x5782efb8, 0x1ff8425d, 0x07381215, 0x1ce04854, 0x8a241b91, 0xbc89af13, 0x201dc0e0, 0xeb0b40ab, 0xce3e9e50, 0x8e04038d, 0xab31dd76, 0xee235eb0, 0x3195a697, 0xa279eb49, 0x73bf3744, 0xf99b2cd5, 0xca1e864c, 0x3acd9ca6, 0x1ad05c46, 0xfb8b20db, 0x0d682e23, 0xc146bc7d, 0xfea33ec0, 0xfa8326dc, 0xf2c316e4, 0x6f5f7f10, 0xbd81a914, 0x96c453c5, 0xdda6f429, 0x432297d4, 0x52aaf1a3, 0xb6d99325, 0x08403038, 0xf3cb10e3, 0xae19c36d, 0xbe99a31d, 0x19c8564f, 0x893c1198, 0x328dac9e, 0x262dd4f2, 0xb0e98737, 0xea0346ac, 0x4b62a7ec, 0x64074521, 0x84543fbb, 0x82642ba9, 0x6b7f670c, 0xf5fb04f1, 0x79ef0b72, 0xbf91a51a, 0x01080607, 0x5fc2df80, 0x758f2356, 0x633f5734, 0x1bd85a41, 0x2305cae9, 0x3df58eb3, 0x68676d05, 0x2a4dfcd6, 0x650f4326, 0xe8134aa2, 0x91fc41d0, 0xf6e30ef8, 0xffab38c7, 0x13986a79, 0x58facd95, 0xf1db1ced, 0x47028fc8, 0x0a503c36, 0x7fdf1f60, 0xc566a461, 0xa751f552, 0xe76b688f, 0x612f5b3a, 0x5aeac19b, 0x06301412, 0x460a89cf, 0x441a85c1, 0x422a91d3, 0x0420181c, 0xa069e747, 0xdb96e03b, 0x39d596af, 0x864433b5, 0x549ae5b1, 0xaa39db71, 0x8c140f83, 0x34bdb88c, 0x2115c6e7, 0x8b2c1d96, 0xf8932ad2, 0x0c602824, 0x74872551, 0x671f4f28];

KupynaTrans.T6H = [0x769393e5, 0x43d9d99a, 0x529a9ac8, 0xeeb5b55b, 0x5a9898c2, 0x882222aa, 0x0945454c, 0xd7fcfc2b, 0xd2baba68, 0xb56a6adf, 0x5bdfdf84, 0x0802020a, 0x469f9fd9, 0x57dcdc8b, 0x59515108, 0x79595920, 0x354a4a7f, 0x5c17174b, 0xac2b2b87, 0x2fc2c2ed, 0x6a9494fe, 0xf7f4f403, 0xd6bbbb6d, 0xb6a3a315, 0x956262f7, 0xb7e4e453, 0xd97171a8, 0x77d4d4a3, 0x13cdcdde, 0xdd7070ad, 0x5816164e, 0xa3e1e142, 0x39494970, 0xf03c3ccc, 0x27c0c0e7, 0x47d8d89f, 0x6d5c5c31, 0x569b9bcd, 0x8eadad23, 0x2e8585ab, 0x51535302, 0xbea1a11f, 0xf57a7a8f, 0x07c8c8cf, 0xb42d2d99, 0xa7e0e047, 0x63d1d1b2, 0xd57272a7, 0xa2a6a604, 0xb02c2c9c, 0x37c4c4f3, 0xabe3e348, 0xc57676b3, 0xfd787885, 0xe6b7b751, 0xeab4b45e, 0x2409092d, 0xec3b3bd7, 0x380e0e36, 0x19414158, 0x2d4c4c61, 0x5fdede81, 0xf2b2b240, 0x7a9090ea, 0x942525b1, 0xaea5a50b, 0x7bd7d7ac, 0x0c03030f, 0x44111155, 0x00000000, 0x2bc3c3e8, 0xb82e2e96, 0x729292e0, 0x9befef74, 0x254e4e6b, 0x4812125a, 0x4e9d9dd3, 0xe97d7d94, 0x0bcbcbc0, 0xd43535e1, 0x40101050, 0x73d5d5a6, 0x214f4f6e, 0x429e9edc, 0x294d4d64, 0x9ea9a937, 0x4955551c, 0x3fc6c6f9, 0x67d0d0b7, 0xf17b7b8a, 0x60181878, 0x669797f1, 0x6bd3d3b8, 0xd83636ee, 0xbfe6e659, 0x3d484875, 0x45565613, 0x3e8181bf, 0x068f8f89, 0xc17777b6, 0x17ccccdb, 0x4a9c9cd6, 0xdeb9b967, 0xafe2e24d, 0x8aacac26, 0xdab8b862, 0xbc2f2f93, 0x54151541, 0xaaa4a40e, 0xed7c7c91, 0x4fdada95, 0xe03838d8, 0x781e1e66, 0x2c0b0b27, 0x14050511, 0x7fd6d6a9, 0x50141444, 0xa56e6ecb, 0xad6c6cc1, 0xe57e7e9b, 0x856666e3, 0xd3fdfd2e, 0xfeb1b14f, 0xb3e5e556, 0x9d6060fd, 0x86afaf29, 0x655e5e3b, 0xcc3333ff, 0x268787a1, 0x03c9c9ca, 0xe7f0f017, 0x695d5d34, 0xa96d6dc4, 0xfc3f3fc3, 0x1a888892, 0x0e8d8d83, 0x3bc7c7fc, 0xfbf7f70c, 0x741d1d69, 0x83e9e96a, 0x97ecec7b, 0x93eded7e, 0x3a8080ba, 0xa429298d, 0x9c2727bb, 0x1bcfcfd4, 0x5e9999c7, 0x9aa8a832, 0x5d50500d, 0x3c0f0f33, 0xdc3737eb, 0x902424b4, 0xa0282888, 0xc03030f0, 0x6e9595fb, 0x6fd2d2bd, 0xf83e3ec6, 0x715b5b2a, 0x1d40405d, 0x368383b5, 0xf6b3b345, 0xb96969d0, 0x41575716, 0x7c1f1f63, 0x1c07071b, 0x701c1c6c, 0x128a8a98, 0xcabcbc76, 0x802020a0, 0x8bebeb60, 0x1fceced1, 0x028e8e8c, 0x96abab3d, 0x9feeee71, 0xc43131f5, 0xb2a2a210, 0xd17373a2, 0xc3f9f93a, 0x0fcacac5, 0xe83a3ad2, 0x681a1a72, 0xcbfbfb30, 0x340d0d39, 0x23c1c1e2, 0xdffefe21, 0xcffafa35, 0xeff2f21d, 0xa16f6fce, 0xcebdbd73, 0x629696f4, 0x53dddd8e, 0x11434352, 0x55525207, 0xe2b6b654, 0x20080828, 0xebf3f318, 0x82aeae2c, 0xc2bebe7c, 0x6419197d, 0x1e898997, 0xc83232fa, 0x982626be, 0xfab0b04a, 0x8feaea65, 0x314b4b7a, 0x8d6464e9, 0x2a8484ae, 0x328282b0, 0xb16b6bda, 0xf3f5f506, 0xf9797980, 0xc6bfbf79, 0x04010105, 0x615f5f3e, 0xc97575bc, 0x916363f2, 0x6c1b1b77, 0x8c2323af, 0xf43d3dc9, 0xbd6868d5, 0xa82a2a82, 0x896565ec, 0x87e8e86f, 0x7e9191ef, 0xfff6f609, 0xdbffff24, 0x4c13135f, 0x7d585825, 0xe3f1f112, 0x01474746, 0x280a0a22, 0xe17f7f9e, 0x33c5c5f6, 0xa6a7a701, 0xbbe7e75c, 0x996161f8, 0x755a5a2f, 0x1806061e, 0x05464643, 0x0d444449, 0x15424257, 0x10040414, 0xbaa0a01a, 0x4bdbdb90, 0xe43939dd, 0x228686a4, 0x4d545419, 0x92aaaa38, 0x0a8c8c86, 0xd03434e4, 0x842121a5, 0x168b8b9d, 0xc7f8f83f, 0x300c0c3c, 0xcd7474b9, 0x816767e6];

KupynaTrans.T7L = [0x676d05bd, 0x1c09840e, 0x1e864c0f, 0x52b3fe29, 0xbf3744d1, 0x62a7ec31, 0x4ab9f725, 0x4dfcd6a8, 0xeec21677, 0xaaf1a355, 0x2dd4f298, 0xf18d3ef6, 0x9ae5b14d, 0xf0445a78, 0xc8564f64, 0xf8425d7c, 0x0dccee88, 0x180a090c, 0x0a89cf05, 0xf58eb3f4, 0x75eec3b4, 0x6aa1eb35, 0xa2f7a451, 0x6c2dae36, 0x986a794c, 0x241b9112, 0xd19522e6, 0xe6c41173, 0x35defb94, 0xef0b72f9, 0xfb04f1f3, 0x81a914ce, 0xfacd957d, 0x65e2cdbc, 0x682e2334, 0x100c0e08, 0x3b54b993, 0xb2fbaa59, 0x8463fd42, 0x88667744, 0xc316e4ef, 0xed84baf8, 0x92e3b649, 0xcad98765, 0xc6dc0d63, 0xb0746258, 0xfd88b4f0, 0x17492f85, 0xa73d4ddd, 0xd2d38e69, 0xcb10e3eb, 0x1283c609, 0x3a9ddd1d, 0x2e925e17, 0x134aa287, 0xd45fcb6a, 0x8ae9bf45, 0x40303820, 0x3e9e501f, 0xd05c4668, 0xcd9ca6e8, 0xded6046f, 0x5b7c9da3, 0xb6f8275b, 0xc1992cee, 0xdd90a8e0, 0x577917a5, 0x70242a38, 0x7b6481b3, 0xf302f6f7, 0x9b2cd5c3, 0x4433b522, 0x1b4ca583, 0x42bff021, 0xfece187f, 0x5c39bc2e, 0x05cae98c, 0x3698571b, 0x8dac9ec8, 0xbc71e85e, 0x95a697c4, 0xa0786c50, 0x19c36d82, 0x235eb09f, 0x0e8a4207, 0x7aade53d, 0xd6d0036b, 0x9da090c0, 0x61e140be, 0xe44bd972, 0x329bda19, 0xe18130fe, 0xc0504860, 0x6ea26637, 0x7de8c4b0, 0xaf3b4ad9, 0xb73143d5, 0x1a85c10d, 0xa87e6b54, 0xbb34c9d3, 0xa5b285dc, 0x99a31dc2, 0xc2df8061, 0x39db7192, 0xac7de656, 0x34179f1a, 0x8eea3247, 0x31dd7696, 0x3c11981e, 0x946ff34a, 0x8326dccf, 0x275d3d9d, 0x0346ac8f, 0x89af13ca, 0x37513395, 0x60282430, 0x3dd8fc90, 0x59f355a2, 0x29d77f9a, 0x3352be97, 0x1f4f2881, 0x1dc0e080, 0x96e03b4b, 0xc71569ed, 0x5df0d8a0, 0xa6f42953, 0x09cf638a, 0xe2c79c71, 0xbdb88cd0, 0xd71967e5, 0x80607040, 0xdb1cede3, 0xff077cf1, 0x0c058a06, 0x3f573491, 0x69e747ba, 0x281e1b14, 0xa47be152, 0x2297d411, 0x9f2f58c1, 0x15c6e784, 0x91a51ac6, 0x25d2f59c, 0x48363f24, 0x56b0732b, 0x8c65fa46, 0xd99325e2, 0xf6c81f7b, 0x55f6dfa4, 0x5eb6742f, 0x0b40ab8b, 0x4eba7a27, 0x49ff5baa, 0x2c1d9616, 0x140f830a, 0xe84e5374, 0x8b20dbcb, 0xab38c7db, 0x46bc7d23, 0xf98b39f2, 0xcc55c266, 0x6de4cab8, 0x932ad2c7, 0x0f432689, 0xe30ef8ff, 0x8f2356c9, 0x3812151c, 0x20181c10, 0x72abe239, 0x85aa99cc, 0x736286b7, 0x86ec3543, 0xa1b108de, 0xceda0a67, 0x2a91d315, 0x76a86f3b, 0x477519ad, 0xf447d77a, 0x00000000, 0x04038d02, 0x5f7f10a1, 0xbafdad5d, 0x08060704, 0x66a46133, 0x9ee63c4f, 0x028fc801, 0xe582bdfc, 0x26945913, 0x6f6b02b9, 0x79eb49b2, 0x437694af, 0xf7017bf5, 0x51f552a6, 0x7eae683f, 0xec4dde76, 0x78222d3c, 0x503c3628, 0x30141218, 0x636e88bf, 0x45fad1ac, 0xc453c562, 0x71ed4eb6, 0xe0485470, 0x11c56a86, 0x77610bb5, 0x906c7e48, 0x543fbb2a, 0xd596afe4, 0x6b688fbb, 0xe98737fa, 0x642ba932, 0xeb08fffb, 0xa33ec0df, 0x9c69f44e, 0x4c35b226, 0xdad5896d, 0x7c21a03e, 0xb5be8bd4, 0xbefe205f, 0xc99f2bea, 0x41f95cae, 0xb332ced7, 0x7427a73a, 0x2b58b79b, 0x16804b0b, 0xb1bd06d6, 0x7f670cb1, 0x97295fc5, 0xb9bb01d2, 0xeac19b75, 0xcf136ee9, 0xe70d75fd, 0x583a312c, 0xdc59cc6e, 0x4b7093ab, 0x01c9648e, 0x872551cd, 0xb477ef5a, 0xc59aa1ec, 0xadb482d8, 0x0745218d, 0x4f731ea9, 0xaef22e57, 0xd31aeae7, 0xf2cb9279, 0x21d1789e, 0x5ab5f92d, 0xb872655c, 0xdf1f60e1, 0xfc41d07e, 0xa9b70fda, 0x068c4503, 0x82efb841, 0xd85a416c, 0x537a9aa7, 0x2f5b3a99];

KupynaTrans.T7H = [0x6868d568, 0x8d8d838d, 0xcacac5ca, 0x4d4d644d, 0x7373a273, 0x4b4b7a4b, 0x4e4e6b4e, 0x2a2a822a, 0xd4d4a3d4, 0x52520752, 0x2626be26, 0xb3b345b3, 0x54541954, 0x1e1e661e, 0x19197d19, 0x1f1f631f, 0x2222aa22, 0x03030f03, 0x46464346, 0x3d3dc93d, 0x2d2d992d, 0x4a4a7f4a, 0x53530253, 0x8383b583, 0x13135f13, 0x8a8a988a, 0xb7b751b7, 0xd5d5a6d5, 0x2525b125, 0x79798079, 0xf5f506f5, 0xbdbd73bd, 0x58582558, 0x2f2f932f, 0x0d0d390d, 0x02020a02, 0xeded7eed, 0x51510851, 0x9e9edc9e, 0x11115511, 0xf2f21df2, 0x3e3ec63e, 0x55551c55, 0x5e5e3b5e, 0xd1d1b2d1, 0x16164e16, 0x3c3ccc3c, 0x6666e366, 0x7070ad70, 0x5d5d345d, 0xf3f318f3, 0x45454c45, 0x40405d40, 0xccccdbcc, 0xe8e86fe8, 0x9494fe94, 0x56561356, 0x08082808, 0xceced1ce, 0x1a1a721a, 0x3a3ad23a, 0xd2d2bdd2, 0xe1e142e1, 0xdfdf84df, 0xb5b55bb5, 0x3838d838, 0x6e6ecb6e, 0x0e0e360e, 0xe5e556e5, 0xf4f403f4, 0xf9f93af9, 0x8686a486, 0xe9e96ae9, 0x4f4f6e4f, 0xd6d6a9d6, 0x8585ab85, 0x2323af23, 0xcfcfd4cf, 0x3232fa32, 0x9999c799, 0x3131f531, 0x14144414, 0xaeae2cae, 0xeeee71ee, 0xc8c8cfc8, 0x48487548, 0xd3d3b8d3, 0x3030f030, 0xa1a11fa1, 0x9292e092, 0x41415841, 0xb1b14fb1, 0x18187818, 0xc4c4f3c4, 0x2c2c9c2c, 0x7171a871, 0x7272a772, 0x44444944, 0x15154115, 0xfdfd2efd, 0x3737eb37, 0xbebe7cbe, 0x5f5f3e5f, 0xaaaa38aa, 0x9b9bcd9b, 0x88889288, 0xd8d89fd8, 0xabab3dab, 0x89899789, 0x9c9cd69c, 0xfafa35fa, 0x6060fd60, 0xeaea65ea, 0xbcbc76bc, 0x6262f762, 0x0c0c3c0c, 0x2424b424, 0xa6a604a6, 0xa8a832a8, 0xecec7bec, 0x6767e667, 0x2020a020, 0xdbdb90db, 0x7c7c917c, 0x28288828, 0xdddd8edd, 0xacac26ac, 0x5b5b2a5b, 0x3434e434, 0x7e7e9b7e, 0x10105010, 0xf1f112f1, 0x7b7b8a7b, 0x8f8f898f, 0x6363f263, 0xa0a01aa0, 0x05051105, 0x9a9ac89a, 0x43435243, 0x7777b677, 0x2121a521, 0xbfbf79bf, 0x2727bb27, 0x09092d09, 0xc3c3e8c3, 0x9f9fd99f, 0xb6b654b6, 0xd7d7acd7, 0x29298d29, 0xc2c2edc2, 0xebeb60eb, 0xc0c0e7c0, 0xa4a40ea4, 0x8b8b9d8b, 0x8c8c868c, 0x1d1d691d, 0xfbfb30fb, 0xffff24ff, 0xc1c1e2c1, 0xb2b240b2, 0x9797f197, 0x2e2e962e, 0xf8f83ff8, 0x6565ec65, 0xf6f609f6, 0x7575bc75, 0x07071b07, 0x04041404, 0x49497049, 0x3333ff33, 0xe4e453e4, 0xd9d99ad9, 0xb9b967b9, 0xd0d0b7d0, 0x42425742, 0xc7c7fcc7, 0x6c6cc16c, 0x9090ea90, 0x00000000, 0x8e8e8c8e, 0x6f6fce6f, 0x50500d50, 0x01010501, 0xc5c5f6c5, 0xdada95da, 0x47474647, 0x3f3fc33f, 0xcdcddecd, 0x6969d069, 0xa2a210a2, 0xe2e24de2, 0x7a7a8f7a, 0xa7a701a7, 0xc6c6f9c6, 0x9393e593, 0x0f0f330f, 0x0a0a220a, 0x06061e06, 0xe6e659e6, 0x2b2b872b, 0x9696f496, 0xa3a315a3, 0x1c1c6c1c, 0xafaf29af, 0x6a6adf6a, 0x12125a12, 0x8484ae84, 0x3939dd39, 0xe7e75ce7, 0xb0b04ab0, 0x8282b082, 0xf7f70cf7, 0xfefe21fe, 0x9d9dd39d, 0x8787a187, 0x5c5c315c, 0x8181bf81, 0x3535e135, 0xdede81de, 0xb4b45eb4, 0xa5a50ba5, 0xfcfc2bfc, 0x8080ba80, 0xefef74ef, 0xcbcbc0cb, 0xbbbb6dbb, 0x6b6bda6b, 0x7676b376, 0xbaba68ba, 0x5a5a2f5a, 0x7d7d947d, 0x78788578, 0x0b0b270b, 0x9595fb95, 0xe3e348e3, 0xadad23ad, 0x7474b974, 0x9898c298, 0x3b3bd73b, 0x3636ee36, 0x6464e964, 0x6d6dc46d, 0xdcdc8bdc, 0xf0f017f0, 0x59592059, 0xa9a937a9, 0x4c4c614c, 0x17174b17, 0x7f7f9e7f, 0x9191ef91, 0xb8b862b8, 0xc9c9cac9, 0x57571657, 0x1b1b771b, 0xe0e047e0, 0x6161f861];

module.exports = KupynaTrans;

},{}],3:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var KupynaTrans = require("./kupyna_trans");

/**
 * Creates transformation object for Kupyna-384 and Kupyna-512 algorithm
 * @private
 */

var KupynaTransLong = function (_KupynaTrans) {
    _inherits(KupynaTransLong, _KupynaTrans);

    function KupynaTransLong() {
        _classCallCheck(this, KupynaTransLong);

        return _possibleConstructorReturn(this, (KupynaTransLong.__proto__ || Object.getPrototypeOf(KupynaTransLong)).apply(this, arguments));
    }

    _createClass(KupynaTransLong, [{
        key: "G2",
        value: function G2(x, y, round) {
            this.G(x, y);

            for (var index = 0; index < 16; index++) {
                var addHi = 0x00f0f0f0 ^ ((15 - index) * 16 ^ round) << 24;
                var result = this.addLongLong(y.hi[index], y.lo[index], addHi, 0xf0f0f0f3);
                y.hi[index] = result.hi;
                y.lo[index] = result.lo;
            }
        }
    }, {
        key: "G",
        value: function G(x, y) {

            y.hi[0] = KupynaTrans.T0H[x.lo[0] & 0xff] ^ KupynaTrans.T1H[x.lo[15] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[14] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[13] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[12] & 0xff] ^ KupynaTrans.T5H[x.hi[11] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[10] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[5] >> 24 & 0xff];

            y.lo[0] = KupynaTrans.T0L[x.lo[0] & 0xff] ^ KupynaTrans.T1L[x.lo[15] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[14] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[13] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[12] & 0xff] ^ KupynaTrans.T5L[x.hi[11] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[10] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[5] >> 24 & 0xff];

            y.hi[1] = KupynaTrans.T0H[x.lo[1] & 0xff] ^ KupynaTrans.T1H[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[15] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[14] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[13] & 0xff] ^ KupynaTrans.T5H[x.hi[12] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[11] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[6] >> 24 & 0xff];

            y.lo[1] = KupynaTrans.T0L[x.lo[1] & 0xff] ^ KupynaTrans.T1L[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[15] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[14] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[13] & 0xff] ^ KupynaTrans.T5L[x.hi[12] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[11] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[6] >> 24 & 0xff];

            y.hi[2] = KupynaTrans.T0H[x.lo[2] & 0xff] ^ KupynaTrans.T1H[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[15] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[14] & 0xff] ^ KupynaTrans.T5H[x.hi[13] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[12] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[7] >> 24 & 0xff];

            y.lo[2] = KupynaTrans.T0L[x.lo[2] & 0xff] ^ KupynaTrans.T1L[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[15] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[14] & 0xff] ^ KupynaTrans.T5L[x.hi[13] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[12] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[7] >> 24 & 0xff];

            y.hi[3] = KupynaTrans.T0H[x.lo[3] & 0xff] ^ KupynaTrans.T1H[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[15] & 0xff] ^ KupynaTrans.T5H[x.hi[14] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[13] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[8] >> 24 & 0xff];

            y.lo[3] = KupynaTrans.T0L[x.lo[3] & 0xff] ^ KupynaTrans.T1L[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[15] & 0xff] ^ KupynaTrans.T5L[x.hi[14] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[13] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[8] >> 24 & 0xff];

            y.hi[4] = KupynaTrans.T0H[x.lo[4] & 0xff] ^ KupynaTrans.T1H[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[0] & 0xff] ^ KupynaTrans.T5H[x.hi[15] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[14] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[9] >> 24 & 0xff];

            y.lo[4] = KupynaTrans.T0L[x.lo[4] & 0xff] ^ KupynaTrans.T1L[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[0] & 0xff] ^ KupynaTrans.T5L[x.hi[15] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[14] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[9] >> 24 & 0xff];

            y.hi[5] = KupynaTrans.T0H[x.lo[5] & 0xff] ^ KupynaTrans.T1H[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[1] & 0xff] ^ KupynaTrans.T5H[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[15] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[10] >> 24 & 0xff];

            y.lo[5] = KupynaTrans.T0L[x.lo[5] & 0xff] ^ KupynaTrans.T1L[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[1] & 0xff] ^ KupynaTrans.T5L[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[15] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[10] >> 24 & 0xff];

            y.hi[6] = KupynaTrans.T0H[x.lo[6] & 0xff] ^ KupynaTrans.T1H[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[2] & 0xff] ^ KupynaTrans.T5H[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[11] >> 24 & 0xff];

            y.lo[6] = KupynaTrans.T0L[x.lo[6] & 0xff] ^ KupynaTrans.T1L[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[2] & 0xff] ^ KupynaTrans.T5L[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[11] >> 24 & 0xff];

            y.hi[7] = KupynaTrans.T0H[x.lo[7] & 0xff] ^ KupynaTrans.T1H[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[3] & 0xff] ^ KupynaTrans.T5H[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[12] >> 24 & 0xff];

            y.lo[7] = KupynaTrans.T0L[x.lo[7] & 0xff] ^ KupynaTrans.T1L[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[3] & 0xff] ^ KupynaTrans.T5L[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[12] >> 24 & 0xff];

            y.hi[8] = KupynaTrans.T0H[x.lo[8] & 0xff] ^ KupynaTrans.T1H[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[4] & 0xff] ^ KupynaTrans.T5H[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[13] >> 24 & 0xff];

            y.lo[8] = KupynaTrans.T0L[x.lo[8] & 0xff] ^ KupynaTrans.T1L[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[4] & 0xff] ^ KupynaTrans.T5L[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[13] >> 24 & 0xff];

            y.hi[9] = KupynaTrans.T0H[x.lo[9] & 0xff] ^ KupynaTrans.T1H[x.lo[8] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[5] & 0xff] ^ KupynaTrans.T5H[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[14] >> 24 & 0xff];

            y.lo[9] = KupynaTrans.T0L[x.lo[9] & 0xff] ^ KupynaTrans.T1L[x.lo[8] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[5] & 0xff] ^ KupynaTrans.T5L[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[14] >> 24 & 0xff];

            y.hi[10] = KupynaTrans.T0H[x.lo[10] & 0xff] ^ KupynaTrans.T1H[x.lo[9] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[8] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[6] & 0xff] ^ KupynaTrans.T5H[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[15] >> 24 & 0xff];

            y.lo[10] = KupynaTrans.T0L[x.lo[10] & 0xff] ^ KupynaTrans.T1L[x.lo[9] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[8] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[6] & 0xff] ^ KupynaTrans.T5L[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[15] >> 24 & 0xff];

            y.hi[11] = KupynaTrans.T0H[x.lo[11] & 0xff] ^ KupynaTrans.T1H[x.lo[10] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[9] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[8] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[7] & 0xff] ^ KupynaTrans.T5H[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[0] >> 24 & 0xff];

            y.lo[11] = KupynaTrans.T0L[x.lo[11] & 0xff] ^ KupynaTrans.T1L[x.lo[10] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[9] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[8] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[7] & 0xff] ^ KupynaTrans.T5L[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[0] >> 24 & 0xff];

            y.hi[12] = KupynaTrans.T0H[x.lo[12] & 0xff] ^ KupynaTrans.T1H[x.lo[11] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[10] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[9] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[8] & 0xff] ^ KupynaTrans.T5H[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[1] >> 24 & 0xff];

            y.lo[12] = KupynaTrans.T0L[x.lo[12] & 0xff] ^ KupynaTrans.T1L[x.lo[11] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[10] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[9] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[8] & 0xff] ^ KupynaTrans.T5L[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[1] >> 24 & 0xff];

            y.hi[13] = KupynaTrans.T0H[x.lo[13] & 0xff] ^ KupynaTrans.T1H[x.lo[12] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[11] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[10] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[9] & 0xff] ^ KupynaTrans.T5H[x.hi[8] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[2] >> 24 & 0xff];

            y.lo[13] = KupynaTrans.T0L[x.lo[13] & 0xff] ^ KupynaTrans.T1L[x.lo[12] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[11] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[10] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[9] & 0xff] ^ KupynaTrans.T5L[x.hi[8] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[2] >> 24 & 0xff];

            y.hi[14] = KupynaTrans.T0H[x.lo[14] & 0xff] ^ KupynaTrans.T1H[x.lo[13] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[12] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[11] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[10] & 0xff] ^ KupynaTrans.T5H[x.hi[9] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[8] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[3] >> 24 & 0xff];

            y.lo[14] = KupynaTrans.T0L[x.lo[14] & 0xff] ^ KupynaTrans.T1L[x.lo[13] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[12] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[11] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[10] & 0xff] ^ KupynaTrans.T5L[x.hi[9] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[8] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[3] >> 24 & 0xff];

            y.hi[15] = KupynaTrans.T0H[x.lo[15] & 0xff] ^ KupynaTrans.T1H[x.lo[14] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[13] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[12] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[11] & 0xff] ^ KupynaTrans.T5H[x.hi[10] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[9] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[4] >> 24 & 0xff];

            y.lo[15] = KupynaTrans.T0L[x.lo[15] & 0xff] ^ KupynaTrans.T1L[x.lo[14] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[13] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[12] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[11] & 0xff] ^ KupynaTrans.T5L[x.hi[10] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[9] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[4] >> 24 & 0xff];
        }
    }, {
        key: "G1",
        value: function G1(x, y, round) {
            y.hi[0] = KupynaTrans.T0H[x.lo[0] & 0xff] ^ KupynaTrans.T1H[x.lo[15] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[14] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[13] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[12] & 0xff] ^ KupynaTrans.T5H[x.hi[11] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[10] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[5] >> 24 & 0xff];

            y.lo[0] = KupynaTrans.T0L[x.lo[0] & 0xff] ^ KupynaTrans.T1L[x.lo[15] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[14] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[13] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[12] & 0xff] ^ KupynaTrans.T5L[x.hi[11] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[10] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[5] >> 24 & 0xff] ^ 0 << 4 ^ round;

            y.hi[1] = KupynaTrans.T0H[x.lo[1] & 0xff] ^ KupynaTrans.T1H[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[15] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[14] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[13] & 0xff] ^ KupynaTrans.T5H[x.hi[12] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[11] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[6] >> 24 & 0xff];

            y.lo[1] = KupynaTrans.T0L[x.lo[1] & 0xff] ^ KupynaTrans.T1L[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[15] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[14] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[13] & 0xff] ^ KupynaTrans.T5L[x.hi[12] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[11] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[6] >> 24 & 0xff] ^ 1 << 4 ^ round;

            y.hi[2] = KupynaTrans.T0H[x.lo[2] & 0xff] ^ KupynaTrans.T1H[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[15] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[14] & 0xff] ^ KupynaTrans.T5H[x.hi[13] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[12] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[7] >> 24 & 0xff];

            y.lo[2] = KupynaTrans.T0L[x.lo[2] & 0xff] ^ KupynaTrans.T1L[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[15] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[14] & 0xff] ^ KupynaTrans.T5L[x.hi[13] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[12] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[7] >> 24 & 0xff] ^ 2 << 4 ^ round;

            y.hi[3] = KupynaTrans.T0H[x.lo[3] & 0xff] ^ KupynaTrans.T1H[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[15] & 0xff] ^ KupynaTrans.T5H[x.hi[14] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[13] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[8] >> 24 & 0xff];

            y.lo[3] = KupynaTrans.T0L[x.lo[3] & 0xff] ^ KupynaTrans.T1L[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[15] & 0xff] ^ KupynaTrans.T5L[x.hi[14] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[13] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[8] >> 24 & 0xff] ^ 3 << 4 ^ round;

            y.hi[4] = KupynaTrans.T0H[x.lo[4] & 0xff] ^ KupynaTrans.T1H[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[0] & 0xff] ^ KupynaTrans.T5H[x.hi[15] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[14] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[9] >> 24 & 0xff];

            y.lo[4] = KupynaTrans.T0L[x.lo[4] & 0xff] ^ KupynaTrans.T1L[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[0] & 0xff] ^ KupynaTrans.T5L[x.hi[15] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[14] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[9] >> 24 & 0xff] ^ 4 << 4 ^ round;

            y.hi[5] = KupynaTrans.T0H[x.lo[5] & 0xff] ^ KupynaTrans.T1H[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[1] & 0xff] ^ KupynaTrans.T5H[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[15] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[10] >> 24 & 0xff];

            y.lo[5] = KupynaTrans.T0L[x.lo[5] & 0xff] ^ KupynaTrans.T1L[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[1] & 0xff] ^ KupynaTrans.T5L[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[15] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[10] >> 24 & 0xff] ^ 5 << 4 ^ round;

            y.hi[6] = KupynaTrans.T0H[x.lo[6] & 0xff] ^ KupynaTrans.T1H[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[2] & 0xff] ^ KupynaTrans.T5H[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[11] >> 24 & 0xff];

            y.lo[6] = KupynaTrans.T0L[x.lo[6] & 0xff] ^ KupynaTrans.T1L[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[2] & 0xff] ^ KupynaTrans.T5L[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[11] >> 24 & 0xff] ^ 6 << 4 ^ round;

            y.hi[7] = KupynaTrans.T0H[x.lo[7] & 0xff] ^ KupynaTrans.T1H[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[3] & 0xff] ^ KupynaTrans.T5H[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[12] >> 24 & 0xff];

            y.lo[7] = KupynaTrans.T0L[x.lo[7] & 0xff] ^ KupynaTrans.T1L[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[3] & 0xff] ^ KupynaTrans.T5L[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[12] >> 24 & 0xff] ^ 7 << 4 ^ round;

            y.hi[8] = KupynaTrans.T0H[x.lo[8] & 0xff] ^ KupynaTrans.T1H[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[4] & 0xff] ^ KupynaTrans.T5H[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[13] >> 24 & 0xff];

            y.lo[8] = KupynaTrans.T0L[x.lo[8] & 0xff] ^ KupynaTrans.T1L[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[4] & 0xff] ^ KupynaTrans.T5L[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[13] >> 24 & 0xff] ^ 8 << 4 ^ round;

            y.hi[9] = KupynaTrans.T0H[x.lo[9] & 0xff] ^ KupynaTrans.T1H[x.lo[8] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[5] & 0xff] ^ KupynaTrans.T5H[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[14] >> 24 & 0xff];

            y.lo[9] = KupynaTrans.T0L[x.lo[9] & 0xff] ^ KupynaTrans.T1L[x.lo[8] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[5] & 0xff] ^ KupynaTrans.T5L[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[14] >> 24 & 0xff] ^ 9 << 4 ^ round;

            y.hi[10] = KupynaTrans.T0H[x.lo[10] & 0xff] ^ KupynaTrans.T1H[x.lo[9] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[8] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[6] & 0xff] ^ KupynaTrans.T5H[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[15] >> 24 & 0xff];

            y.lo[10] = KupynaTrans.T0L[x.lo[10] & 0xff] ^ KupynaTrans.T1L[x.lo[9] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[8] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[6] & 0xff] ^ KupynaTrans.T5L[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[15] >> 24 & 0xff] ^ 10 << 4 ^ round;

            y.hi[11] = KupynaTrans.T0H[x.lo[11] & 0xff] ^ KupynaTrans.T1H[x.lo[10] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[9] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[8] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[7] & 0xff] ^ KupynaTrans.T5H[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[0] >> 24 & 0xff];

            y.lo[11] = KupynaTrans.T0L[x.lo[11] & 0xff] ^ KupynaTrans.T1L[x.lo[10] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[9] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[8] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[7] & 0xff] ^ KupynaTrans.T5L[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[0] >> 24 & 0xff] ^ 11 << 4 ^ round;

            y.hi[12] = KupynaTrans.T0H[x.lo[12] & 0xff] ^ KupynaTrans.T1H[x.lo[11] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[10] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[9] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[8] & 0xff] ^ KupynaTrans.T5H[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[1] >> 24 & 0xff];

            y.lo[12] = KupynaTrans.T0L[x.lo[12] & 0xff] ^ KupynaTrans.T1L[x.lo[11] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[10] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[9] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[8] & 0xff] ^ KupynaTrans.T5L[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[1] >> 24 & 0xff] ^ 12 << 4 ^ round;

            y.hi[13] = KupynaTrans.T0H[x.lo[13] & 0xff] ^ KupynaTrans.T1H[x.lo[12] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[11] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[10] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[9] & 0xff] ^ KupynaTrans.T5H[x.hi[8] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[2] >> 24 & 0xff];

            y.lo[13] = KupynaTrans.T0L[x.lo[13] & 0xff] ^ KupynaTrans.T1L[x.lo[12] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[11] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[10] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[9] & 0xff] ^ KupynaTrans.T5L[x.hi[8] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[2] >> 24 & 0xff] ^ 13 << 4 ^ round;

            y.hi[14] = KupynaTrans.T0H[x.lo[14] & 0xff] ^ KupynaTrans.T1H[x.lo[13] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[12] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[11] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[10] & 0xff] ^ KupynaTrans.T5H[x.hi[9] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[8] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[3] >> 24 & 0xff];

            y.lo[14] = KupynaTrans.T0L[x.lo[14] & 0xff] ^ KupynaTrans.T1L[x.lo[13] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[12] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[11] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[10] & 0xff] ^ KupynaTrans.T5L[x.hi[9] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[8] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[3] >> 24 & 0xff] ^ 14 << 4 ^ round;

            y.hi[15] = KupynaTrans.T0H[x.lo[15] & 0xff] ^ KupynaTrans.T1H[x.lo[14] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[13] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[12] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[11] & 0xff] ^ KupynaTrans.T5H[x.hi[10] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[9] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[4] >> 24 & 0xff];

            y.lo[15] = KupynaTrans.T0L[x.lo[15] & 0xff] ^ KupynaTrans.T1L[x.lo[14] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[13] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[12] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[11] & 0xff] ^ KupynaTrans.T5L[x.hi[10] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[9] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[4] >> 24 & 0xff] ^ 15 << 4 ^ round;
        }
    }]);

    return KupynaTransLong;
}(KupynaTrans);

module.exports = KupynaTransLong;

},{"./kupyna_trans":2}],4:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var KupynaTrans = require("./kupyna_trans");
/**
 * Creates transformation object for Kupyna-256 algorithm.
 * @private
 */

var KupynaTransShort = function (_KupynaTrans) {
    _inherits(KupynaTransShort, _KupynaTrans);

    function KupynaTransShort() {
        _classCallCheck(this, KupynaTransShort);

        return _possibleConstructorReturn(this, (KupynaTransShort.__proto__ || Object.getPrototypeOf(KupynaTransShort)).apply(this, arguments));
    }

    _createClass(KupynaTransShort, [{
        key: "G2",
        value: function G2(x, y, round) {
            this.G(x, y);
            for (var index = 0; index < 8; index++) {
                var addHi = 0x00f0f0f0 ^ ((7 - index) * 16 ^ round) << 24;
                var result = this.addLongLong(y.hi[index], y.lo[index], addHi, 0xf0f0f0f3);
                y.hi[index] = result.hi;
                y.lo[index] = result.lo;
            }
        }
    }, {
        key: "G",
        value: function G(x, y) {
            y.hi[0] = KupynaTrans.T0H[x.lo[0] & 0xff] ^ KupynaTrans.T1H[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[4] & 0xff] ^ KupynaTrans.T5H[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[1] >> 24 & 0xff];

            y.lo[0] = KupynaTrans.T0L[x.lo[0] & 0xff] ^ KupynaTrans.T1L[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[4] & 0xff] ^ KupynaTrans.T5L[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[1] >> 24 & 0xff];

            y.hi[1] = KupynaTrans.T0H[x.lo[1] & 0xff] ^ KupynaTrans.T1H[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[5] & 0xff] ^ KupynaTrans.T5H[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[2] >> 24 & 0xff];

            y.lo[1] = KupynaTrans.T0L[x.lo[1] & 0xff] ^ KupynaTrans.T1L[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[5] & 0xff] ^ KupynaTrans.T5L[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[2] >> 24 & 0xff];

            y.hi[2] = KupynaTrans.T0H[x.lo[2] & 0xff] ^ KupynaTrans.T1H[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[6] & 0xff] ^ KupynaTrans.T5H[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[3] >> 24 & 0xff];

            y.lo[2] = KupynaTrans.T0L[x.lo[2] & 0xff] ^ KupynaTrans.T1L[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[6] & 0xff] ^ KupynaTrans.T5L[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[3] >> 24 & 0xff];

            y.hi[3] = KupynaTrans.T0H[x.lo[3] & 0xff] ^ KupynaTrans.T1H[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[7] & 0xff] ^ KupynaTrans.T5H[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[4] >> 24 & 0xff];

            y.lo[3] = KupynaTrans.T0L[x.lo[3] & 0xff] ^ KupynaTrans.T1L[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[7] & 0xff] ^ KupynaTrans.T5L[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[4] >> 24 & 0xff];

            y.hi[4] = KupynaTrans.T0H[x.lo[4] & 0xff] ^ KupynaTrans.T1H[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[0] & 0xff] ^ KupynaTrans.T5H[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[5] >> 24 & 0xff];

            y.lo[4] = KupynaTrans.T0L[x.lo[4] & 0xff] ^ KupynaTrans.T1L[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[0] & 0xff] ^ KupynaTrans.T5L[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[5] >> 24 & 0xff];

            y.hi[5] = KupynaTrans.T0H[x.lo[5] & 0xff] ^ KupynaTrans.T1H[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[1] & 0xff] ^ KupynaTrans.T5H[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[6] >> 24 & 0xff];

            y.lo[5] = KupynaTrans.T0L[x.lo[5] & 0xff] ^ KupynaTrans.T1L[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[1] & 0xff] ^ KupynaTrans.T5L[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[6] >> 24 & 0xff];

            y.hi[6] = KupynaTrans.T0H[x.lo[6] & 0xff] ^ KupynaTrans.T1H[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[2] & 0xff] ^ KupynaTrans.T5H[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[7] >> 24 & 0xff];

            y.lo[6] = KupynaTrans.T0L[x.lo[6] & 0xff] ^ KupynaTrans.T1L[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[2] & 0xff] ^ KupynaTrans.T5L[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[7] >> 24 & 0xff];

            y.hi[7] = KupynaTrans.T0H[x.lo[7] & 0xff] ^ KupynaTrans.T1H[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[3] & 0xff] ^ KupynaTrans.T5H[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[0] >> 24 & 0xff];

            y.lo[7] = KupynaTrans.T0L[x.lo[7] & 0xff] ^ KupynaTrans.T1L[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[3] & 0xff] ^ KupynaTrans.T5L[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[0] >> 24 & 0xff];
        }
    }, {
        key: "G1",
        value: function G1(x, y, round) {
            y.hi[0] = KupynaTrans.T0H[x.lo[0] & 0xff] ^ KupynaTrans.T1H[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[4] & 0xff] ^ KupynaTrans.T5H[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[1] >> 24 & 0xff];

            y.lo[0] = KupynaTrans.T0L[x.lo[0] & 0xff] ^ KupynaTrans.T1L[x.lo[7] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[6] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[5] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[4] & 0xff] ^ KupynaTrans.T5L[x.hi[3] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[2] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[1] >> 24 & 0xff] ^ 0 << 4 ^ round;

            y.hi[1] = KupynaTrans.T0H[x.lo[1] & 0xff] ^ KupynaTrans.T1H[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[5] & 0xff] ^ KupynaTrans.T5H[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[2] >> 24 & 0xff];

            y.lo[1] = KupynaTrans.T0L[x.lo[1] & 0xff] ^ KupynaTrans.T1L[x.lo[0] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[7] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[6] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[5] & 0xff] ^ KupynaTrans.T5L[x.hi[4] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[3] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[2] >> 24 & 0xff] ^ 1 << 4 ^ round;

            y.hi[2] = KupynaTrans.T0H[x.lo[2] & 0xff] ^ KupynaTrans.T1H[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[6] & 0xff] ^ KupynaTrans.T5H[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[3] >> 24 & 0xff];

            y.lo[2] = KupynaTrans.T0L[x.lo[2] & 0xff] ^ KupynaTrans.T1L[x.lo[1] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[0] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[7] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[6] & 0xff] ^ KupynaTrans.T5L[x.hi[5] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[4] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[3] >> 24 & 0xff] ^ 2 << 4 ^ round;

            y.hi[3] = KupynaTrans.T0H[x.lo[3] & 0xff] ^ KupynaTrans.T1H[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[7] & 0xff] ^ KupynaTrans.T5H[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[4] >> 24 & 0xff];

            y.lo[3] = KupynaTrans.T0L[x.lo[3] & 0xff] ^ KupynaTrans.T1L[x.lo[2] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[1] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[0] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[7] & 0xff] ^ KupynaTrans.T5L[x.hi[6] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[5] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[4] >> 24 & 0xff] ^ 3 << 4 ^ round;

            y.hi[4] = KupynaTrans.T0H[x.lo[4] & 0xff] ^ KupynaTrans.T1H[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[0] & 0xff] ^ KupynaTrans.T5H[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[5] >> 24 & 0xff];

            y.lo[4] = KupynaTrans.T0L[x.lo[4] & 0xff] ^ KupynaTrans.T1L[x.lo[3] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[2] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[1] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[0] & 0xff] ^ KupynaTrans.T5L[x.hi[7] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[6] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[5] >> 24 & 0xff] ^ 4 << 4 ^ round;

            y.hi[5] = KupynaTrans.T0H[x.lo[5] & 0xff] ^ KupynaTrans.T1H[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[1] & 0xff] ^ KupynaTrans.T5H[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[6] >> 24 & 0xff];

            y.lo[5] = KupynaTrans.T0L[x.lo[5] & 0xff] ^ KupynaTrans.T1L[x.lo[4] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[3] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[2] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[1] & 0xff] ^ KupynaTrans.T5L[x.hi[0] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[7] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[6] >> 24 & 0xff] ^ 5 << 4 ^ round;

            y.hi[6] = KupynaTrans.T0H[x.lo[6] & 0xff] ^ KupynaTrans.T1H[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[2] & 0xff] ^ KupynaTrans.T5H[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[7] >> 24 & 0xff];

            y.lo[6] = KupynaTrans.T0L[x.lo[6] & 0xff] ^ KupynaTrans.T1L[x.lo[5] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[4] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[3] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[2] & 0xff] ^ KupynaTrans.T5L[x.hi[1] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[0] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[7] >> 24 & 0xff] ^ 6 << 4 ^ round;

            y.hi[7] = KupynaTrans.T0H[x.lo[7] & 0xff] ^ KupynaTrans.T1H[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2H[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3H[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4H[x.hi[3] & 0xff] ^ KupynaTrans.T5H[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6H[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7H[x.hi[0] >> 24 & 0xff];

            y.lo[7] = KupynaTrans.T0L[x.lo[7] & 0xff] ^ KupynaTrans.T1L[x.lo[6] >> 8 & 0xff] ^ KupynaTrans.T2L[x.lo[5] >> 16 & 0xff] ^ KupynaTrans.T3L[x.lo[4] >> 24 & 0xff] ^ KupynaTrans.T4L[x.hi[3] & 0xff] ^ KupynaTrans.T5L[x.hi[2] >> 8 & 0xff] ^ KupynaTrans.T6L[x.hi[1] >> 16 & 0xff] ^ KupynaTrans.T7L[x.hi[0] >> 24 & 0xff] ^ 7 << 4 ^ round;
        }
    }]);

    return KupynaTransShort;
}(KupynaTrans);

module.exports = KupynaTransShort;

},{"./kupyna_trans":2}],5:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

/**
 * LongLongBuffer implements fixed size buffer (size defined at construction time), 
 * which allows to access data in form of both byte and 64-bit long values simultanously.
 * Any changes done by byte oriented access methods are reflected in 64 bit long representation.
 * 
 * If you want to read/set long data directly - use longArr property. 
 * Each 64 bit value is divided into 32 MSB longArr.hi subarray and 32 LSB longArr.lo subarrays.
 * This is done to the fact, that precise representation of integer value in javascript is limited to number up to 2^51.
 * If this value is exceeded, integer is switched to non precise double representation.
 * 
 * In case of having access to data casted to bytes, please use object methods.
 *  
 * @private
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LongLongBuffer = function () {

  /**
   * Constructs LongArrBuffer object
   * @param {Number} sizeInLongs - size of long array buffer - number of long elements in the array
   * @public
   */
  function LongLongBuffer(sizeInLongs) {
    _classCallCheck(this, LongLongBuffer);

    this.longArr = {
      lo: [],
      hi: []
    };
    for (var index = 0; index < sizeInLongs; index++) {
      this.longArr.lo[index] = 0;
      this.longArr.hi[index] = 0;
    }
    this._byteArr = [];
    this.sizeInLongs = sizeInLongs;
    this.longArrUpdated = true;
    this._longArr2ByteArr();
  }

  /**
   * Converts byte array representation into internal 64bit long array representation.
   * @private
   */


  _createClass(LongLongBuffer, [{
    key: "_byteArr2LongArr",
    value: function _byteArr2LongArr() {
      var start = 0;
      for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
        this.longArr.lo[longIndex] = this._byteArr[start + 3] << 24 | this._byteArr[start + 2] << 16 | this._byteArr[start + 1] << 8 | this._byteArr[start];
        this.longArr.hi[longIndex] = this._byteArr[start + 7] << 24 | this._byteArr[start + 6] << 16 | this._byteArr[start + 5] << 8 | this._byteArr[start + 4];
        start += 8;
      }
    }

    /**
     * Converts internal long array representation into byte array representation.
     * @private
     */

  }, {
    key: "_longArr2ByteArr",
    value: function _longArr2ByteArr() {
      if (this.longArr.lo.length > this.sizeInLongs || this.longArr.hi.length > this.sizeInLongs) throw Error("modified initial length of long long array");

      if (!this.longArrUpdated) {
        return;
      }
      var start = 0;
      for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
        var tempLo = this.longArr.lo[longIndex];
        var tempHi = this.longArr.hi[longIndex];
        for (var byteIndex = 0; byteIndex < 4; byteIndex++) {
          this._byteArr[start] = tempLo & 0xff;
          this._byteArr[start + 4] = tempHi & 0xff;
          start++;
          tempLo >>= 8;
          tempHi >>= 8;
        }
        start += 4;
      }
      this.longArrUpdated = false;
    }

    /**
     * Converts single long value into array of bytes.
     * @param {Number} longValue - long number to be converted into byte array
     * @returns {Array} - converted number
     * @private
     */

  }, {
    key: "_long2ByteArr",
    value: function _long2ByteArr(longValue) {
      var tempArr = [];
      tempArr[0] = longValue & 0xff;
      tempArr[1] = longValue >> 8 & 0xff;
      tempArr[2] = longValue >> 16 & 0xff;
      tempArr[3] = longValue >> 24 & 0xff;
      return tempArr;
    }

    /**
     * Notifies, that long array content has been updated.
     * If you changed 64 bit long data accessing longArr object property,
     * this methods needs to be called to ensure internal integrity between
     * byte and 64-bit long representation. 
     * @public
     */

  }, {
    key: "notifyLongUpdated",
    value: function notifyLongUpdated() {
      this.longArrUpdated = true;
    }

    /**
     * Copies bytes array into long array buffer.
     * @param {Array} src - source array to copy from
     * @param {Integer} srcPos - souce location to start copy from (in bytes)
     * @param {Integer} dstPos - destination location (in bytes) of buffer to copy data to
     * @param {Integer} len - length of data to be copied (in bytes)
     * @public
     */

  }, {
    key: "copyBytesTo",
    value: function copyBytesTo(src, srcPos, dstPos, len) {
      this._longArr2ByteArr();
      for (var index = 0; index < len; index++) {
        var srcByte = src[srcPos + index];
        if (srcByte < 0 || srcByte > 255) throw new Error("array should contain only bytes - pos:" + index + " value:" + srcByte);
        this._byteArr[dstPos + index] = src[srcPos + index];
      }
      this._byteArr2LongArr();
    }

    /**
     * Copies bytes subarray from the long array buffer
     * @param {Integer} srcPos - location of long array buffer to copy from (indexed in bytes)
     * @param {Array} dst - destination array to copy data to
     * @param {Integer} dstPos - start index of destination array
     * @param {Integer} len - length of data to be copied (in bytes)
     * @public
     */

  }, {
    key: "copyBytesFrom",
    value: function copyBytesFrom(srcPos, dst, dstPos, len) {
      this._longArr2ByteArr();
      for (var index = 0; index < len; index++) {
        dst[index + dstPos] = this._byteArr[index + srcPos];
      }
    }

    /**
     * Sets value of particular byte in the buffer
     * @param {Integer} bytePos - location of buffer to be change (indexed in bytes)
     * @param {Integer} byteValue - value to be set
     * @public
     */

  }, {
    key: "setByte",
    value: function setByte(bytePos, byteValue) {
      this._longArr2ByteArr();
      if (byteValue < 0 || byteValue > 255) throw new Error("byteValue is not byte");

      this._byteArr[bytePos] = byteValue;
      this._byteArr2LongArr();
    }

    /**
     * Zeroes buffer.
     * @public
     */

  }, {
    key: "zeroAll",
    value: function zeroAll() {
      for (var index = 0; index < this.longArr.lo.length; index++) {
        this.longArr.lo[index] = this.longArr.hi[index] = 0;
      }
      this.notifyLongUpdated();
      this._longArr2ByteArr();
    }

    /**
     * Zeroes range of bytes inside buffer.
     * @param {Integer} startPos - location of first byte to be zeroed
     * @param {Integer} len - length of bytes to be zeroed
     * @public
     */

  }, {
    key: "zeroBytes",
    value: function zeroBytes(startPos, len) {
      this._longArr2ByteArr();
      for (var index = 0; index < len; index++) {
        this._byteArr[index + startPos] = 0;
      }
      this._byteArr2LongArr();
    }

    /**
     * Sets long (32 bit) value inside buffer. Four bytes starting from pos location will be set.
     * @param {Number} pos - start location of 32-bit long value to be changed (indexed in bytes)
     * @param {Number} longValue - 32-bit long value to be set
     */

  }, {
    key: "setLongAsBytes",
    value: function setLongAsBytes(pos, longValue) {
      if (longValue < 0 || longValue > 0xffff) throw new Error("invalid 32 bit long value:" + longValue);
      var tempArr = this._long2ByteArr(longValue);
      this.copyBytesTo(tempArr, 0, pos, tempArr.length);
    }
  }]);

  return LongLongBuffer;
}();

module.exports = LongLongBuffer;

},{}],6:[function(require,module,exports){
/*jslint node: true, esversion:6 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sha3_lib = require('js-sha3');
var kupyna_lib = require('./kupyna/kupyna');

/**
 * Constructs digest object.
 * @public
 */

var TProEccDigest = function () {
    /**
     * Creates TProEccDigest object
     * @public
     */
    function TProEccDigest() {
        _classCallCheck(this, TProEccDigest);

        this._SUPPORTED_DIGESTS = ["SHA3_256", "SHA3_384", "SHA3_512", "KUPYNA_256", "KUPYNA_384", "KUPYNA_512"];
        this._DIGESTS_LEN = [32, 48, 64, 32, 48, 64];
    }

    /**
     * Converts byte array to hex string representation.
     * @param {Array} arr - array to be converted
     * @returns {String} - hex representation of array
     * @private
     */


    _createClass(TProEccDigest, [{
        key: '_arrToHex',
        value: function _arrToHex(arr) {
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

    }, {
        key: 'getSupportedDigests',
        value: function getSupportedDigests() {
            return this._SUPPORTED_DIGESTS;
        }

        /**
         * Checks if digest is supported
         * 
         * @param {String} digestType - name of digest
         * @return {Boolean} digest support state
         * @public
         */

    }, {
        key: 'isDigestSupported',
        value: function isDigestSupported(digestType) {
            for (var type in this._SUPPORTED_DIGESTS) {
                if (digestType === this._SUPPORTED_DIGESTS[type]) return true;
            }
            return false;
        }
    }, {
        key: 'getDigestLen',


        /**
         * Gets length (in bytes) of digest result.
         * This value is constant for chosen digest type.
         * 
         * @param {String} digestType - name of digest
         * @return {Number} len of digest result
         * @public
         */
        value: function getDigestLen(digestType) {
            if (!this.isDigestSupported(digestType)) throw Error("unsupported digest type:" + digestType);
            for (var type in this._SUPPORTED_DIGESTS) {
                if (digestType === this._SUPPORTED_DIGESTS[type]) return this._DIGESTS_LEN[type];
            }
        }
    }, {
        key: 'digest',


        /**
         * Calculates digest of the message provided as array of bytes.
         * 
         * @param {String} digestType - name of digest
         * @param {Array} messageArray - array of bytes to calculate digest of
         * @return {String} hexadecimal hash of the message 
         * @public
         */
        value: function digest(digestType, messageArray) {
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
        }
    }, {
        key: 'digestUTF8',


        /**
         * Calculates digest of the message provided as String. 
         * Internally message is converted into UTF8 array of bytes.
         * 
         * @param {String} digestType - name of digest
         * @param {String} message - message to calculate digest of
         * @return {String} hexadecimal hash of the message 
         * @public
         */
        value: function digestUTF8(digestType, message) {
            var utf8 = unescape(encodeURIComponent(message));
            var arr = new Array(utf8.length);
            for (var i = 0; i < utf8.length; i++) {
                arr[i] = utf8.charCodeAt(i);
            }
            return this.digest(digestType, arr);
        }
    }]);

    return TProEccDigest;
}();

module.exports = TProEccDigest;

},{"./kupyna/kupyna":1,"js-sha3":7}],7:[function(require,module,exports){
(function (process,global){
/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.5.7
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2016
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var root = typeof window === 'object' ? window : {};
  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  }
  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var HEX_CHARS = '0123456789abcdef'.split('');
  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
  var KECCAK_PADDING = [1, 256, 65536, 16777216];
  var PADDING = [6, 1536, 393216, 100663296];
  var SHIFT = [0, 8, 16, 24];
  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
            0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
            2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
            2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
            2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
  var BITS = [224, 256, 384, 512];
  var SHAKE_BITS = [128, 256];
  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array'];

  var createOutputMethod = function (bits, padding, outputType) {
    return function (message) {
      return new Keccak(bits, padding, bits).update(message)[outputType]();
    };
  };

  var createShakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits) {
      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
    };
  };

  var createMethod = function (bits, padding) {
    var method = createOutputMethod(bits, padding, 'hex');
    method.create = function () {
      return new Keccak(bits, padding, bits);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(bits, padding, type);
    }
    return method;
  };

  var createShakeMethod = function (bits, padding) {
    var method = createShakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits) {
      return new Keccak(bits, padding, outputBits);
    };
    method.update = function (message, outputBits) {
      return method.create(outputBits).update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createShakeOutputMethod(bits, padding, type);
    }
    return method;
  };

  var algorithms = [
    {name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod},
    {name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod},
    {name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod}
  ];

  var methods = {}, methodNames = [];

  for (var i = 0; i < algorithms.length; ++i) {
    var algorithm = algorithms[i];
    var bits  = algorithm.bits;
    for (var j = 0; j < bits.length; ++j) {
      var methodName = algorithm.name +'_' + bits[j];
      methodNames.push(methodName);
      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
    }
  }

  function Keccak(bits, padding, outputBits) {
    this.blocks = [];
    this.s = [];
    this.padding = padding;
    this.outputBits = outputBits;
    this.reset = true;
    this.block = 0;
    this.start = 0;
    this.blockCount = (1600 - (bits << 1)) >> 5;
    this.byteCount = this.blockCount << 2;
    this.outputBlocks = outputBits >> 5;
    this.extraBytes = (outputBits & 31) >> 3;

    for (var i = 0; i < 50; ++i) {
      this.s[i] = 0;
    }
  }

  Keccak.prototype.update = function (message) {
    var notString = typeof message !== 'string';
    if (notString && message.constructor === ArrayBuffer) {
      message = new Uint8Array(message);
    }
    var length = message.length, blocks = this.blocks, byteCount = this.byteCount,
      blockCount = this.blockCount, index = 0, s = this.s, i, code;

    while (index < length) {
      if (this.reset) {
        this.reset = false;
        blocks[0] = this.block;
        for (i = 1; i < blockCount + 1; ++i) {
          blocks[i] = 0;
        }
      }
      if (notString) {
        for (i = this.start; index < length && i < byteCount; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < byteCount; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }
      this.lastByteIndex = i;
      if (i >= byteCount) {
        this.start = i - byteCount;
        this.block = blocks[blockCount];
        for (i = 0; i < blockCount; ++i) {
          s[i] ^= blocks[i];
        }
        f(s);
        this.reset = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Keccak.prototype.finalize = function () {
    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
    blocks[i >> 2] |= this.padding[i & 3];
    if (this.lastByteIndex === this.byteCount) {
      blocks[0] = blocks[blockCount];
      for (i = 1; i < blockCount + 1; ++i) {
        blocks[i] = 0;
      }
    }
    blocks[blockCount - 1] |= 0x80000000;
    for (i = 0; i < blockCount; ++i) {
      s[i] ^= blocks[i];
    }
    f(s);
  };

  Keccak.prototype.toString = Keccak.prototype.hex = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var hex = '', block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        block = s[i];
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
               HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
               HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
               HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
      }
      if (j % blockCount === 0) {
        f(s);
        i = 0;
      }
    }
    if (extraBytes) {
      block = s[i];
      if (extraBytes > 0) {
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
      }
      if (extraBytes > 1) {
        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
      }
      if (extraBytes > 2) {
        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
      }
    }
    return hex;
  };

  Keccak.prototype.arrayBuffer = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var bytes = this.outputBits >> 3;
    var buffer;
    if (extraBytes) {
      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
    } else {
      buffer = new ArrayBuffer(bytes);
    }
    var array = new Uint32Array(buffer);
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        array[j] = s[i];
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      array[i] = s[i];
      buffer = buffer.slice(0, bytes);
    }
    return buffer;
  };

  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

  Keccak.prototype.digest = Keccak.prototype.array = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var array = [], offset, block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;
        array[offset + 1] = (block >> 8) & 0xFF;
        array[offset + 2] = (block >> 16) & 0xFF;
        array[offset + 3] = (block >> 24) & 0xFF;
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      offset = j << 2;
      block = s[i];
      if (extraBytes > 0) {
        array[offset] = block & 0xFF;
      }
      if (extraBytes > 1) {
        array[offset + 1] = (block >> 8) & 0xFF;
      }
      if (extraBytes > 2) {
        array[offset + 2] = (block >> 16) & 0xFF;
      }
    }
    return array;
  };

  var f = function (s) {
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
        b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
        b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
        b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for (n = 0; n < 48; n += 2) {
      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
      s[0] ^= h;
      s[1] ^= l;
      s[10] ^= h;
      s[11] ^= l;
      s[20] ^= h;
      s[21] ^= l;
      s[30] ^= h;
      s[31] ^= l;
      s[40] ^= h;
      s[41] ^= l;
      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
      s[2] ^= h;
      s[3] ^= l;
      s[12] ^= h;
      s[13] ^= l;
      s[22] ^= h;
      s[23] ^= l;
      s[32] ^= h;
      s[33] ^= l;
      s[42] ^= h;
      s[43] ^= l;
      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
      s[4] ^= h;
      s[5] ^= l;
      s[14] ^= h;
      s[15] ^= l;
      s[24] ^= h;
      s[25] ^= l;
      s[34] ^= h;
      s[35] ^= l;
      s[44] ^= h;
      s[45] ^= l;
      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
      s[6] ^= h;
      s[7] ^= l;
      s[16] ^= h;
      s[17] ^= l;
      s[26] ^= h;
      s[27] ^= l;
      s[36] ^= h;
      s[37] ^= l;
      s[46] ^= h;
      s[47] ^= l;
      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
      s[8] ^= h;
      s[9] ^= l;
      s[18] ^= h;
      s[19] ^= l;
      s[28] ^= h;
      s[29] ^= l;
      s[38] ^= h;
      s[39] ^= l;
      s[48] ^= h;
      s[49] ^= l;

      b0 = s[0];
      b1 = s[1];
      b32 = (s[11] << 4) | (s[10] >>> 28);
      b33 = (s[10] << 4) | (s[11] >>> 28);
      b14 = (s[20] << 3) | (s[21] >>> 29);
      b15 = (s[21] << 3) | (s[20] >>> 29);
      b46 = (s[31] << 9) | (s[30] >>> 23);
      b47 = (s[30] << 9) | (s[31] >>> 23);
      b28 = (s[40] << 18) | (s[41] >>> 14);
      b29 = (s[41] << 18) | (s[40] >>> 14);
      b20 = (s[2] << 1) | (s[3] >>> 31);
      b21 = (s[3] << 1) | (s[2] >>> 31);
      b2 = (s[13] << 12) | (s[12] >>> 20);
      b3 = (s[12] << 12) | (s[13] >>> 20);
      b34 = (s[22] << 10) | (s[23] >>> 22);
      b35 = (s[23] << 10) | (s[22] >>> 22);
      b16 = (s[33] << 13) | (s[32] >>> 19);
      b17 = (s[32] << 13) | (s[33] >>> 19);
      b48 = (s[42] << 2) | (s[43] >>> 30);
      b49 = (s[43] << 2) | (s[42] >>> 30);
      b40 = (s[5] << 30) | (s[4] >>> 2);
      b41 = (s[4] << 30) | (s[5] >>> 2);
      b22 = (s[14] << 6) | (s[15] >>> 26);
      b23 = (s[15] << 6) | (s[14] >>> 26);
      b4 = (s[25] << 11) | (s[24] >>> 21);
      b5 = (s[24] << 11) | (s[25] >>> 21);
      b36 = (s[34] << 15) | (s[35] >>> 17);
      b37 = (s[35] << 15) | (s[34] >>> 17);
      b18 = (s[45] << 29) | (s[44] >>> 3);
      b19 = (s[44] << 29) | (s[45] >>> 3);
      b10 = (s[6] << 28) | (s[7] >>> 4);
      b11 = (s[7] << 28) | (s[6] >>> 4);
      b42 = (s[17] << 23) | (s[16] >>> 9);
      b43 = (s[16] << 23) | (s[17] >>> 9);
      b24 = (s[26] << 25) | (s[27] >>> 7);
      b25 = (s[27] << 25) | (s[26] >>> 7);
      b6 = (s[36] << 21) | (s[37] >>> 11);
      b7 = (s[37] << 21) | (s[36] >>> 11);
      b38 = (s[47] << 24) | (s[46] >>> 8);
      b39 = (s[46] << 24) | (s[47] >>> 8);
      b30 = (s[8] << 27) | (s[9] >>> 5);
      b31 = (s[9] << 27) | (s[8] >>> 5);
      b12 = (s[18] << 20) | (s[19] >>> 12);
      b13 = (s[19] << 20) | (s[18] >>> 12);
      b44 = (s[29] << 7) | (s[28] >>> 25);
      b45 = (s[28] << 7) | (s[29] >>> 25);
      b26 = (s[38] << 8) | (s[39] >>> 24);
      b27 = (s[39] << 8) | (s[38] >>> 24);
      b8 = (s[48] << 14) | (s[49] >>> 18);
      b9 = (s[49] << 14) | (s[48] >>> 18);

      s[0] = b0 ^ (~b2 & b4);
      s[1] = b1 ^ (~b3 & b5);
      s[10] = b10 ^ (~b12 & b14);
      s[11] = b11 ^ (~b13 & b15);
      s[20] = b20 ^ (~b22 & b24);
      s[21] = b21 ^ (~b23 & b25);
      s[30] = b30 ^ (~b32 & b34);
      s[31] = b31 ^ (~b33 & b35);
      s[40] = b40 ^ (~b42 & b44);
      s[41] = b41 ^ (~b43 & b45);
      s[2] = b2 ^ (~b4 & b6);
      s[3] = b3 ^ (~b5 & b7);
      s[12] = b12 ^ (~b14 & b16);
      s[13] = b13 ^ (~b15 & b17);
      s[22] = b22 ^ (~b24 & b26);
      s[23] = b23 ^ (~b25 & b27);
      s[32] = b32 ^ (~b34 & b36);
      s[33] = b33 ^ (~b35 & b37);
      s[42] = b42 ^ (~b44 & b46);
      s[43] = b43 ^ (~b45 & b47);
      s[4] = b4 ^ (~b6 & b8);
      s[5] = b5 ^ (~b7 & b9);
      s[14] = b14 ^ (~b16 & b18);
      s[15] = b15 ^ (~b17 & b19);
      s[24] = b24 ^ (~b26 & b28);
      s[25] = b25 ^ (~b27 & b29);
      s[34] = b34 ^ (~b36 & b38);
      s[35] = b35 ^ (~b37 & b39);
      s[44] = b44 ^ (~b46 & b48);
      s[45] = b45 ^ (~b47 & b49);
      s[6] = b6 ^ (~b8 & b0);
      s[7] = b7 ^ (~b9 & b1);
      s[16] = b16 ^ (~b18 & b10);
      s[17] = b17 ^ (~b19 & b11);
      s[26] = b26 ^ (~b28 & b20);
      s[27] = b27 ^ (~b29 & b21);
      s[36] = b36 ^ (~b38 & b30);
      s[37] = b37 ^ (~b39 & b31);
      s[46] = b46 ^ (~b48 & b40);
      s[47] = b47 ^ (~b49 & b41);
      s[8] = b8 ^ (~b0 & b2);
      s[9] = b9 ^ (~b1 & b3);
      s[18] = b18 ^ (~b10 & b12);
      s[19] = b19 ^ (~b11 & b13);
      s[28] = b28 ^ (~b20 & b22);
      s[29] = b29 ^ (~b21 & b23);
      s[38] = b38 ^ (~b30 & b32);
      s[39] = b39 ^ (~b31 & b33);
      s[48] = b48 ^ (~b40 & b42);
      s[49] = b49 ^ (~b41 & b43);

      s[0] ^= RC[n];
      s[1] ^= RC[n + 1];
    }
  };

  if (COMMON_JS) {
    module.exports = methods;
  } else {
    for (var i = 0; i < methodNames.length; ++i) {
      root[methodNames[i]] = methods[methodNames[i]];
    }
  }
})();

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":8}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[6])(6)
});