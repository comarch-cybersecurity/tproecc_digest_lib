/*jslint node: true */
'use strict';

var TAB = require("./kupyna_tables");

function KupynaTransLong() {}

KupynaTransLong.G2 = function (x, y, round) {
    KupynaTransLong.G(x, y);

    for (var index = 0; index < 16; index++) {
        var addHi = 0x00f0f0f0 ^ ((((15 - index) * 16) ^ round) << 24);
        var result = TAB.addLongLong(y.hi[index], y.lo[index], addHi, 0xf0f0f0f3);
        y.hi[index] = result.hi;
        y.lo[index] = result.lo;
    }
};

KupynaTransLong.G = function (x, y) {

    y.hi[0] = TAB.T0H[x.lo[0] & 0xff] ^ TAB.T1H[(x.lo[15] >> 8) & 0xff] ^ TAB.T2H[(x.lo[14] >> 16) & 0xff] ^ TAB.T3H[(x.lo[13] >> 24) & 0xff] ^
        TAB.T4H[x.hi[12] & 0xff] ^ TAB.T5H[(x.hi[11] >> 8) & 0xff] ^ TAB.T6H[(x.hi[10] >> 16) & 0xff] ^ TAB.T7H[(x.hi[5] >> 24) & 0xff];

    y.lo[0] = TAB.T0L[x.lo[0] & 0xff] ^ TAB.T1L[(x.lo[15] >> 8) & 0xff] ^ TAB.T2L[(x.lo[14] >> 16) & 0xff] ^ TAB.T3L[(x.lo[13] >> 24) & 0xff] ^
        TAB.T4L[x.hi[12] & 0xff] ^ TAB.T5L[(x.hi[11] >> 8) & 0xff] ^ TAB.T6L[(x.hi[10] >> 16) & 0xff] ^ TAB.T7L[(x.hi[5] >> 24) & 0xff];

    y.hi[1] = TAB.T0H[x.lo[1] & 0xff] ^ TAB.T1H[(x.lo[0] >> 8) & 0xff] ^ TAB.T2H[(x.lo[15] >> 16) & 0xff] ^ TAB.T3H[(x.lo[14] >> 24) & 0xff] ^
        TAB.T4H[x.hi[13] & 0xff] ^ TAB.T5H[(x.hi[12] >> 8) & 0xff] ^ TAB.T6H[(x.hi[11] >> 16) & 0xff] ^ TAB.T7H[(x.hi[6] >> 24) & 0xff];

    y.lo[1] = TAB.T0L[x.lo[1] & 0xff] ^ TAB.T1L[(x.lo[0] >> 8) & 0xff] ^ TAB.T2L[(x.lo[15] >> 16) & 0xff] ^ TAB.T3L[(x.lo[14] >> 24) & 0xff] ^
        TAB.T4L[x.hi[13] & 0xff] ^ TAB.T5L[(x.hi[12] >> 8) & 0xff] ^ TAB.T6L[(x.hi[11] >> 16) & 0xff] ^ TAB.T7L[(x.hi[6] >> 24) & 0xff];

    y.hi[2] = TAB.T0H[x.lo[2] & 0xff] ^ TAB.T1H[(x.lo[1] >> 8) & 0xff] ^ TAB.T2H[(x.lo[0] >> 16) & 0xff] ^ TAB.T3H[(x.lo[15] >> 24) & 0xff] ^
        TAB.T4H[x.hi[14] & 0xff] ^ TAB.T5H[(x.hi[13] >> 8) & 0xff] ^ TAB.T6H[(x.hi[12] >> 16) & 0xff] ^ TAB.T7H[(x.hi[7] >> 24) & 0xff];

    y.lo[2] = TAB.T0L[x.lo[2] & 0xff] ^ TAB.T1L[(x.lo[1] >> 8) & 0xff] ^ TAB.T2L[(x.lo[0] >> 16) & 0xff] ^ TAB.T3L[(x.lo[15] >> 24) & 0xff] ^
        TAB.T4L[x.hi[14] & 0xff] ^ TAB.T5L[(x.hi[13] >> 8) & 0xff] ^ TAB.T6L[(x.hi[12] >> 16) & 0xff] ^ TAB.T7L[(x.hi[7] >> 24) & 0xff];

    y.hi[3] = TAB.T0H[x.lo[3] & 0xff] ^ TAB.T1H[(x.lo[2] >> 8) & 0xff] ^ TAB.T2H[(x.lo[1] >> 16) & 0xff] ^ TAB.T3H[(x.lo[0] >> 24) & 0xff] ^
        TAB.T4H[x.hi[15] & 0xff] ^ TAB.T5H[(x.hi[14] >> 8) & 0xff] ^ TAB.T6H[(x.hi[13] >> 16) & 0xff] ^ TAB.T7H[(x.hi[8] >> 24) & 0xff];

    y.lo[3] = TAB.T0L[x.lo[3] & 0xff] ^ TAB.T1L[(x.lo[2] >> 8) & 0xff] ^ TAB.T2L[(x.lo[1] >> 16) & 0xff] ^ TAB.T3L[(x.lo[0] >> 24) & 0xff] ^
        TAB.T4L[x.hi[15] & 0xff] ^ TAB.T5L[(x.hi[14] >> 8) & 0xff] ^ TAB.T6L[(x.hi[13] >> 16) & 0xff] ^ TAB.T7L[(x.hi[8] >> 24) & 0xff];

    y.hi[4] = TAB.T0H[x.lo[4] & 0xff] ^ TAB.T1H[(x.lo[3] >> 8) & 0xff] ^ TAB.T2H[(x.lo[2] >> 16) & 0xff] ^ TAB.T3H[(x.lo[1] >> 24) & 0xff] ^
        TAB.T4H[x.hi[0] & 0xff] ^ TAB.T5H[(x.hi[15] >> 8) & 0xff] ^ TAB.T6H[(x.hi[14] >> 16) & 0xff] ^ TAB.T7H[(x.hi[9] >> 24) & 0xff];

    y.lo[4] = TAB.T0L[x.lo[4] & 0xff] ^ TAB.T1L[(x.lo[3] >> 8) & 0xff] ^ TAB.T2L[(x.lo[2] >> 16) & 0xff] ^ TAB.T3L[(x.lo[1] >> 24) & 0xff] ^
        TAB.T4L[x.hi[0] & 0xff] ^ TAB.T5L[(x.hi[15] >> 8) & 0xff] ^ TAB.T6L[(x.hi[14] >> 16) & 0xff] ^ TAB.T7L[(x.hi[9] >> 24) & 0xff];

    y.hi[5] = TAB.T0H[x.lo[5] & 0xff] ^ TAB.T1H[(x.lo[4] >> 8) & 0xff] ^ TAB.T2H[(x.lo[3] >> 16) & 0xff] ^ TAB.T3H[(x.lo[2] >> 24) & 0xff] ^
        TAB.T4H[x.hi[1] & 0xff] ^ TAB.T5H[(x.hi[0] >> 8) & 0xff] ^ TAB.T6H[(x.hi[15] >> 16) & 0xff] ^ TAB.T7H[(x.hi[10] >> 24) & 0xff];

    y.lo[5] = TAB.T0L[x.lo[5] & 0xff] ^ TAB.T1L[(x.lo[4] >> 8) & 0xff] ^ TAB.T2L[(x.lo[3] >> 16) & 0xff] ^ TAB.T3L[(x.lo[2] >> 24) & 0xff] ^
        TAB.T4L[x.hi[1] & 0xff] ^ TAB.T5L[(x.hi[0] >> 8) & 0xff] ^ TAB.T6L[(x.hi[15] >> 16) & 0xff] ^ TAB.T7L[(x.hi[10] >> 24) & 0xff];

    y.hi[6] = TAB.T0H[x.lo[6] & 0xff] ^ TAB.T1H[(x.lo[5] >> 8) & 0xff] ^ TAB.T2H[(x.lo[4] >> 16) & 0xff] ^ TAB.T3H[(x.lo[3] >> 24) & 0xff] ^
        TAB.T4H[x.hi[2] & 0xff] ^ TAB.T5H[(x.hi[1] >> 8) & 0xff] ^ TAB.T6H[(x.hi[0] >> 16) & 0xff] ^ TAB.T7H[(x.hi[11] >> 24) & 0xff];

    y.lo[6] = TAB.T0L[x.lo[6] & 0xff] ^ TAB.T1L[(x.lo[5] >> 8) & 0xff] ^ TAB.T2L[(x.lo[4] >> 16) & 0xff] ^ TAB.T3L[(x.lo[3] >> 24) & 0xff] ^
        TAB.T4L[x.hi[2] & 0xff] ^ TAB.T5L[(x.hi[1] >> 8) & 0xff] ^ TAB.T6L[(x.hi[0] >> 16) & 0xff] ^ TAB.T7L[(x.hi[11] >> 24) & 0xff];

    y.hi[7] = TAB.T0H[x.lo[7] & 0xff] ^ TAB.T1H[(x.lo[6] >> 8) & 0xff] ^ TAB.T2H[(x.lo[5] >> 16) & 0xff] ^ TAB.T3H[(x.lo[4] >> 24) & 0xff] ^
        TAB.T4H[x.hi[3] & 0xff] ^ TAB.T5H[(x.hi[2] >> 8) & 0xff] ^ TAB.T6H[(x.hi[1] >> 16) & 0xff] ^ TAB.T7H[(x.hi[12] >> 24) & 0xff];

    y.lo[7] = TAB.T0L[x.lo[7] & 0xff] ^ TAB.T1L[(x.lo[6] >> 8) & 0xff] ^ TAB.T2L[(x.lo[5] >> 16) & 0xff] ^ TAB.T3L[(x.lo[4] >> 24) & 0xff] ^
        TAB.T4L[x.hi[3] & 0xff] ^ TAB.T5L[(x.hi[2] >> 8) & 0xff] ^ TAB.T6L[(x.hi[1] >> 16) & 0xff] ^ TAB.T7L[(x.hi[12] >> 24) & 0xff];

    y.hi[8] = TAB.T0H[x.lo[8] & 0xff] ^ TAB.T1H[(x.lo[7] >> 8) & 0xff] ^ TAB.T2H[(x.lo[6] >> 16) & 0xff] ^ TAB.T3H[(x.lo[5] >> 24) & 0xff] ^
        TAB.T4H[x.hi[4] & 0xff] ^ TAB.T5H[(x.hi[3] >> 8) & 0xff] ^ TAB.T6H[(x.hi[2] >> 16) & 0xff] ^ TAB.T7H[(x.hi[13] >> 24) & 0xff];

    y.lo[8] = TAB.T0L[x.lo[8] & 0xff] ^ TAB.T1L[(x.lo[7] >> 8) & 0xff] ^ TAB.T2L[(x.lo[6] >> 16) & 0xff] ^ TAB.T3L[(x.lo[5] >> 24) & 0xff] ^
        TAB.T4L[x.hi[4] & 0xff] ^ TAB.T5L[(x.hi[3] >> 8) & 0xff] ^ TAB.T6L[(x.hi[2] >> 16) & 0xff] ^ TAB.T7L[(x.hi[13] >> 24) & 0xff];

    y.hi[9] = TAB.T0H[x.lo[9] & 0xff] ^ TAB.T1H[(x.lo[8] >> 8) & 0xff] ^ TAB.T2H[(x.lo[7] >> 16) & 0xff] ^ TAB.T3H[(x.lo[6] >> 24) & 0xff] ^
        TAB.T4H[x.hi[5] & 0xff] ^ TAB.T5H[(x.hi[4] >> 8) & 0xff] ^ TAB.T6H[(x.hi[3] >> 16) & 0xff] ^ TAB.T7H[(x.hi[14] >> 24) & 0xff];

    y.lo[9] = TAB.T0L[x.lo[9] & 0xff] ^ TAB.T1L[(x.lo[8] >> 8) & 0xff] ^ TAB.T2L[(x.lo[7] >> 16) & 0xff] ^ TAB.T3L[(x.lo[6] >> 24) & 0xff] ^
        TAB.T4L[x.hi[5] & 0xff] ^ TAB.T5L[(x.hi[4] >> 8) & 0xff] ^ TAB.T6L[(x.hi[3] >> 16) & 0xff] ^ TAB.T7L[(x.hi[14] >> 24) & 0xff];

    y.hi[10] = TAB.T0H[x.lo[10] & 0xff] ^ TAB.T1H[(x.lo[9] >> 8) & 0xff] ^ TAB.T2H[(x.lo[8] >> 16) & 0xff] ^ TAB.T3H[(x.lo[7] >> 24) & 0xff] ^
        TAB.T4H[x.hi[6] & 0xff] ^ TAB.T5H[(x.hi[5] >> 8) & 0xff] ^ TAB.T6H[(x.hi[4] >> 16) & 0xff] ^ TAB.T7H[(x.hi[15] >> 24) & 0xff];

    y.lo[10] = TAB.T0L[x.lo[10] & 0xff] ^ TAB.T1L[(x.lo[9] >> 8) & 0xff] ^ TAB.T2L[(x.lo[8] >> 16) & 0xff] ^ TAB.T3L[(x.lo[7] >> 24) & 0xff] ^
        TAB.T4L[x.hi[6] & 0xff] ^ TAB.T5L[(x.hi[5] >> 8) & 0xff] ^ TAB.T6L[(x.hi[4] >> 16) & 0xff] ^ TAB.T7L[(x.hi[15] >> 24) & 0xff];

    y.hi[11] = TAB.T0H[x.lo[11] & 0xff] ^ TAB.T1H[(x.lo[10] >> 8) & 0xff] ^ TAB.T2H[(x.lo[9] >> 16) & 0xff] ^ TAB.T3H[(x.lo[8] >> 24) & 0xff] ^
        TAB.T4H[x.hi[7] & 0xff] ^ TAB.T5H[(x.hi[6] >> 8) & 0xff] ^ TAB.T6H[(x.hi[5] >> 16) & 0xff] ^ TAB.T7H[(x.hi[0] >> 24) & 0xff];

    y.lo[11] = TAB.T0L[x.lo[11] & 0xff] ^ TAB.T1L[(x.lo[10] >> 8) & 0xff] ^ TAB.T2L[(x.lo[9] >> 16) & 0xff] ^ TAB.T3L[(x.lo[8] >> 24) & 0xff] ^
        TAB.T4L[x.hi[7] & 0xff] ^ TAB.T5L[(x.hi[6] >> 8) & 0xff] ^ TAB.T6L[(x.hi[5] >> 16) & 0xff] ^ TAB.T7L[(x.hi[0] >> 24) & 0xff];

    y.hi[12] = TAB.T0H[x.lo[12] & 0xff] ^ TAB.T1H[(x.lo[11] >> 8) & 0xff] ^ TAB.T2H[(x.lo[10] >> 16) & 0xff] ^ TAB.T3H[(x.lo[9] >> 24) & 0xff] ^
        TAB.T4H[x.hi[8] & 0xff] ^ TAB.T5H[(x.hi[7] >> 8) & 0xff] ^ TAB.T6H[(x.hi[6] >> 16) & 0xff] ^ TAB.T7H[(x.hi[1] >> 24) & 0xff];

    y.lo[12] = TAB.T0L[x.lo[12] & 0xff] ^ TAB.T1L[(x.lo[11] >> 8) & 0xff] ^ TAB.T2L[(x.lo[10] >> 16) & 0xff] ^ TAB.T3L[(x.lo[9] >> 24) & 0xff] ^
        TAB.T4L[x.hi[8] & 0xff] ^ TAB.T5L[(x.hi[7] >> 8) & 0xff] ^ TAB.T6L[(x.hi[6] >> 16) & 0xff] ^ TAB.T7L[(x.hi[1] >> 24) & 0xff];

    y.hi[13] = TAB.T0H[x.lo[13] & 0xff] ^ TAB.T1H[(x.lo[12] >> 8) & 0xff] ^ TAB.T2H[(x.lo[11] >> 16) & 0xff] ^ TAB.T3H[(x.lo[10] >> 24) & 0xff] ^
        TAB.T4H[x.hi[9] & 0xff] ^ TAB.T5H[(x.hi[8] >> 8) & 0xff] ^ TAB.T6H[(x.hi[7] >> 16) & 0xff] ^ TAB.T7H[(x.hi[2] >> 24) & 0xff];

    y.lo[13] = TAB.T0L[x.lo[13] & 0xff] ^ TAB.T1L[(x.lo[12] >> 8) & 0xff] ^ TAB.T2L[(x.lo[11] >> 16) & 0xff] ^ TAB.T3L[(x.lo[10] >> 24) & 0xff] ^
        TAB.T4L[x.hi[9] & 0xff] ^ TAB.T5L[(x.hi[8] >> 8) & 0xff] ^ TAB.T6L[(x.hi[7] >> 16) & 0xff] ^ TAB.T7L[(x.hi[2] >> 24) & 0xff];

    y.hi[14] = TAB.T0H[x.lo[14] & 0xff] ^ TAB.T1H[(x.lo[13] >> 8) & 0xff] ^ TAB.T2H[(x.lo[12] >> 16) & 0xff] ^ TAB.T3H[(x.lo[11] >> 24) & 0xff] ^
        TAB.T4H[x.hi[10] & 0xff] ^ TAB.T5H[(x.hi[9] >> 8) & 0xff] ^ TAB.T6H[(x.hi[8] >> 16) & 0xff] ^ TAB.T7H[(x.hi[3] >> 24) & 0xff];

    y.lo[14] = TAB.T0L[x.lo[14] & 0xff] ^ TAB.T1L[(x.lo[13] >> 8) & 0xff] ^ TAB.T2L[(x.lo[12] >> 16) & 0xff] ^ TAB.T3L[(x.lo[11] >> 24) & 0xff] ^
        TAB.T4L[x.hi[10] & 0xff] ^ TAB.T5L[(x.hi[9] >> 8) & 0xff] ^ TAB.T6L[(x.hi[8] >> 16) & 0xff] ^ TAB.T7L[(x.hi[3] >> 24) & 0xff];

    y.hi[15] = TAB.T0H[x.lo[15] & 0xff] ^ TAB.T1H[(x.lo[14] >> 8) & 0xff] ^ TAB.T2H[(x.lo[13] >> 16) & 0xff] ^ TAB.T3H[(x.lo[12] >> 24) & 0xff] ^
        TAB.T4H[x.hi[11] & 0xff] ^ TAB.T5H[(x.hi[10] >> 8) & 0xff] ^ TAB.T6H[(x.hi[9] >> 16) & 0xff] ^ TAB.T7H[(x.hi[4] >> 24) & 0xff];

    y.lo[15] = TAB.T0L[x.lo[15] & 0xff] ^ TAB.T1L[(x.lo[14] >> 8) & 0xff] ^ TAB.T2L[(x.lo[13] >> 16) & 0xff] ^ TAB.T3L[(x.lo[12] >> 24) & 0xff] ^
        TAB.T4L[x.hi[11] & 0xff] ^ TAB.T5L[(x.hi[10] >> 8) & 0xff] ^ TAB.T6L[(x.hi[9] >> 16) & 0xff] ^ TAB.T7L[(x.hi[4] >> 24) & 0xff];

};

KupynaTransLong.G1 = function (x, y, round) {
    y.hi[0] = TAB.T0H[x.lo[0] & 0xff] ^ TAB.T1H[(x.lo[15] >> 8) & 0xff] ^ TAB.T2H[(x.lo[14] >> 16) & 0xff] ^ TAB.T3H[(x.lo[13] >> 24) & 0xff] ^
        TAB.T4H[x.hi[12] & 0xff] ^ TAB.T5H[(x.hi[11] >> 8) & 0xff] ^ TAB.T6H[(x.hi[10] >> 16) & 0xff] ^ TAB.T7H[(x.hi[5] >> 24) & 0xff];

    y.lo[0] = TAB.T0L[x.lo[0] & 0xff] ^ TAB.T1L[(x.lo[15] >> 8) & 0xff] ^ TAB.T2L[(x.lo[14] >> 16) & 0xff] ^ TAB.T3L[(x.lo[13] >> 24) & 0xff] ^
        TAB.T4L[x.hi[12] & 0xff] ^ TAB.T5L[(x.hi[11] >> 8) & 0xff] ^ TAB.T6L[(x.hi[10] >> 16) & 0xff] ^ TAB.T7L[(x.hi[5] >> 24) & 0xff] ^ (0 << 4) ^ round;

    y.hi[1] = TAB.T0H[x.lo[1] & 0xff] ^ TAB.T1H[(x.lo[0] >> 8) & 0xff] ^ TAB.T2H[(x.lo[15] >> 16) & 0xff] ^ TAB.T3H[(x.lo[14] >> 24) & 0xff] ^
        TAB.T4H[x.hi[13] & 0xff] ^ TAB.T5H[(x.hi[12] >> 8) & 0xff] ^ TAB.T6H[(x.hi[11] >> 16) & 0xff] ^ TAB.T7H[(x.hi[6] >> 24) & 0xff];

    y.lo[1] = TAB.T0L[x.lo[1] & 0xff] ^ TAB.T1L[(x.lo[0] >> 8) & 0xff] ^ TAB.T2L[(x.lo[15] >> 16) & 0xff] ^ TAB.T3L[(x.lo[14] >> 24) & 0xff] ^
        TAB.T4L[x.hi[13] & 0xff] ^ TAB.T5L[(x.hi[12] >> 8) & 0xff] ^ TAB.T6L[(x.hi[11] >> 16) & 0xff] ^ TAB.T7L[(x.hi[6] >> 24) & 0xff] ^ (1 << 4) ^ round;


    y.hi[2] = TAB.T0H[x.lo[2] & 0xff] ^ TAB.T1H[(x.lo[1] >> 8) & 0xff] ^ TAB.T2H[(x.lo[0] >> 16) & 0xff] ^ TAB.T3H[(x.lo[15] >> 24) & 0xff] ^
        TAB.T4H[x.hi[14] & 0xff] ^ TAB.T5H[(x.hi[13] >> 8) & 0xff] ^ TAB.T6H[(x.hi[12] >> 16) & 0xff] ^ TAB.T7H[(x.hi[7] >> 24) & 0xff];

    y.lo[2] = TAB.T0L[x.lo[2] & 0xff] ^ TAB.T1L[(x.lo[1] >> 8) & 0xff] ^ TAB.T2L[(x.lo[0] >> 16) & 0xff] ^ TAB.T3L[(x.lo[15] >> 24) & 0xff] ^
        TAB.T4L[x.hi[14] & 0xff] ^ TAB.T5L[(x.hi[13] >> 8) & 0xff] ^ TAB.T6L[(x.hi[12] >> 16) & 0xff] ^ TAB.T7L[(x.hi[7] >> 24) & 0xff] ^ (2 << 4) ^ round;

    y.hi[3] = TAB.T0H[x.lo[3] & 0xff] ^ TAB.T1H[(x.lo[2] >> 8) & 0xff] ^ TAB.T2H[(x.lo[1] >> 16) & 0xff] ^ TAB.T3H[(x.lo[0] >> 24) & 0xff] ^
        TAB.T4H[x.hi[15] & 0xff] ^ TAB.T5H[(x.hi[14] >> 8) & 0xff] ^ TAB.T6H[(x.hi[13] >> 16) & 0xff] ^ TAB.T7H[(x.hi[8] >> 24) & 0xff];

    y.lo[3] = TAB.T0L[x.lo[3] & 0xff] ^ TAB.T1L[(x.lo[2] >> 8) & 0xff] ^ TAB.T2L[(x.lo[1] >> 16) & 0xff] ^ TAB.T3L[(x.lo[0] >> 24) & 0xff] ^
        TAB.T4L[x.hi[15] & 0xff] ^ TAB.T5L[(x.hi[14] >> 8) & 0xff] ^ TAB.T6L[(x.hi[13] >> 16) & 0xff] ^ TAB.T7L[(x.hi[8] >> 24) & 0xff] ^ (3 << 4) ^ round;

    y.hi[4] = TAB.T0H[x.lo[4] & 0xff] ^ TAB.T1H[(x.lo[3] >> 8) & 0xff] ^ TAB.T2H[(x.lo[2] >> 16) & 0xff] ^ TAB.T3H[(x.lo[1] >> 24) & 0xff] ^
        TAB.T4H[x.hi[0] & 0xff] ^ TAB.T5H[(x.hi[15] >> 8) & 0xff] ^ TAB.T6H[(x.hi[14] >> 16) & 0xff] ^ TAB.T7H[(x.hi[9] >> 24) & 0xff];

    y.lo[4] = TAB.T0L[x.lo[4] & 0xff] ^ TAB.T1L[(x.lo[3] >> 8) & 0xff] ^ TAB.T2L[(x.lo[2] >> 16) & 0xff] ^ TAB.T3L[(x.lo[1] >> 24) & 0xff] ^
        TAB.T4L[x.hi[0] & 0xff] ^ TAB.T5L[(x.hi[15] >> 8) & 0xff] ^ TAB.T6L[(x.hi[14] >> 16) & 0xff] ^ TAB.T7L[(x.hi[9] >> 24) & 0xff] ^ (4 << 4) ^ round;

    y.hi[5] = TAB.T0H[x.lo[5] & 0xff] ^ TAB.T1H[(x.lo[4] >> 8) & 0xff] ^ TAB.T2H[(x.lo[3] >> 16) & 0xff] ^ TAB.T3H[(x.lo[2] >> 24) & 0xff] ^
        TAB.T4H[x.hi[1] & 0xff] ^ TAB.T5H[(x.hi[0] >> 8) & 0xff] ^ TAB.T6H[(x.hi[15] >> 16) & 0xff] ^ TAB.T7H[(x.hi[10] >> 24) & 0xff];

    y.lo[5] = TAB.T0L[x.lo[5] & 0xff] ^ TAB.T1L[(x.lo[4] >> 8) & 0xff] ^ TAB.T2L[(x.lo[3] >> 16) & 0xff] ^ TAB.T3L[(x.lo[2] >> 24) & 0xff] ^
        TAB.T4L[x.hi[1] & 0xff] ^ TAB.T5L[(x.hi[0] >> 8) & 0xff] ^ TAB.T6L[(x.hi[15] >> 16) & 0xff] ^ TAB.T7L[(x.hi[10] >> 24) & 0xff] ^ (5 << 4) ^ round;

    y.hi[6] = TAB.T0H[x.lo[6] & 0xff] ^ TAB.T1H[(x.lo[5] >> 8) & 0xff] ^ TAB.T2H[(x.lo[4] >> 16) & 0xff] ^ TAB.T3H[(x.lo[3] >> 24) & 0xff] ^
        TAB.T4H[x.hi[2] & 0xff] ^ TAB.T5H[(x.hi[1] >> 8) & 0xff] ^ TAB.T6H[(x.hi[0] >> 16) & 0xff] ^ TAB.T7H[(x.hi[11] >> 24) & 0xff];

    y.lo[6] = TAB.T0L[x.lo[6] & 0xff] ^ TAB.T1L[(x.lo[5] >> 8) & 0xff] ^ TAB.T2L[(x.lo[4] >> 16) & 0xff] ^ TAB.T3L[(x.lo[3] >> 24) & 0xff] ^
        TAB.T4L[x.hi[2] & 0xff] ^ TAB.T5L[(x.hi[1] >> 8) & 0xff] ^ TAB.T6L[(x.hi[0] >> 16) & 0xff] ^ TAB.T7L[(x.hi[11] >> 24) & 0xff] ^ (6 << 4) ^ round;

    y.hi[7] = TAB.T0H[x.lo[7] & 0xff] ^ TAB.T1H[(x.lo[6] >> 8) & 0xff] ^ TAB.T2H[(x.lo[5] >> 16) & 0xff] ^ TAB.T3H[(x.lo[4] >> 24) & 0xff] ^
        TAB.T4H[x.hi[3] & 0xff] ^ TAB.T5H[(x.hi[2] >> 8) & 0xff] ^ TAB.T6H[(x.hi[1] >> 16) & 0xff] ^ TAB.T7H[(x.hi[12] >> 24) & 0xff];

    y.lo[7] = TAB.T0L[x.lo[7] & 0xff] ^ TAB.T1L[(x.lo[6] >> 8) & 0xff] ^ TAB.T2L[(x.lo[5] >> 16) & 0xff] ^ TAB.T3L[(x.lo[4] >> 24) & 0xff] ^
        TAB.T4L[x.hi[3] & 0xff] ^ TAB.T5L[(x.hi[2] >> 8) & 0xff] ^ TAB.T6L[(x.hi[1] >> 16) & 0xff] ^ TAB.T7L[(x.hi[12] >> 24) & 0xff] ^ (7 << 4) ^ round;

    y.hi[8] = TAB.T0H[x.lo[8] & 0xff] ^ TAB.T1H[(x.lo[7] >> 8) & 0xff] ^ TAB.T2H[(x.lo[6] >> 16) & 0xff] ^ TAB.T3H[(x.lo[5] >> 24) & 0xff] ^
        TAB.T4H[x.hi[4] & 0xff] ^ TAB.T5H[(x.hi[3] >> 8) & 0xff] ^ TAB.T6H[(x.hi[2] >> 16) & 0xff] ^ TAB.T7H[(x.hi[13] >> 24) & 0xff];

    y.lo[8] = TAB.T0L[x.lo[8] & 0xff] ^ TAB.T1L[(x.lo[7] >> 8) & 0xff] ^ TAB.T2L[(x.lo[6] >> 16) & 0xff] ^ TAB.T3L[(x.lo[5] >> 24) & 0xff] ^
        TAB.T4L[x.hi[4] & 0xff] ^ TAB.T5L[(x.hi[3] >> 8) & 0xff] ^ TAB.T6L[(x.hi[2] >> 16) & 0xff] ^ TAB.T7L[(x.hi[13] >> 24) & 0xff] ^ (8 << 4) ^ round;

    y.hi[9] = TAB.T0H[x.lo[9] & 0xff] ^ TAB.T1H[(x.lo[8] >> 8) & 0xff] ^ TAB.T2H[(x.lo[7] >> 16) & 0xff] ^ TAB.T3H[(x.lo[6] >> 24) & 0xff] ^
        TAB.T4H[x.hi[5] & 0xff] ^ TAB.T5H[(x.hi[4] >> 8) & 0xff] ^ TAB.T6H[(x.hi[3] >> 16) & 0xff] ^ TAB.T7H[(x.hi[14] >> 24) & 0xff];

    y.lo[9] = TAB.T0L[x.lo[9] & 0xff] ^ TAB.T1L[(x.lo[8] >> 8) & 0xff] ^ TAB.T2L[(x.lo[7] >> 16) & 0xff] ^ TAB.T3L[(x.lo[6] >> 24) & 0xff] ^
        TAB.T4L[x.hi[5] & 0xff] ^ TAB.T5L[(x.hi[4] >> 8) & 0xff] ^ TAB.T6L[(x.hi[3] >> 16) & 0xff] ^ TAB.T7L[(x.hi[14] >> 24) & 0xff] ^ (9 << 4) ^ round;

    y.hi[10] = TAB.T0H[x.lo[10] & 0xff] ^ TAB.T1H[(x.lo[9] >> 8) & 0xff] ^ TAB.T2H[(x.lo[8] >> 16) & 0xff] ^ TAB.T3H[(x.lo[7] >> 24) & 0xff] ^
        TAB.T4H[x.hi[6] & 0xff] ^ TAB.T5H[(x.hi[5] >> 8) & 0xff] ^ TAB.T6H[(x.hi[4] >> 16) & 0xff] ^ TAB.T7H[(x.hi[15] >> 24) & 0xff];

    y.lo[10] = TAB.T0L[x.lo[10] & 0xff] ^ TAB.T1L[(x.lo[9] >> 8) & 0xff] ^ TAB.T2L[(x.lo[8] >> 16) & 0xff] ^ TAB.T3L[(x.lo[7] >> 24) & 0xff] ^
        TAB.T4L[x.hi[6] & 0xff] ^ TAB.T5L[(x.hi[5] >> 8) & 0xff] ^ TAB.T6L[(x.hi[4] >> 16) & 0xff] ^ TAB.T7L[(x.hi[15] >> 24) & 0xff] ^ (10 << 4) ^ round;

    y.hi[11] = TAB.T0H[x.lo[11] & 0xff] ^ TAB.T1H[(x.lo[10] >> 8) & 0xff] ^ TAB.T2H[(x.lo[9] >> 16) & 0xff] ^ TAB.T3H[(x.lo[8] >> 24) & 0xff] ^
        TAB.T4H[x.hi[7] & 0xff] ^ TAB.T5H[(x.hi[6] >> 8) & 0xff] ^ TAB.T6H[(x.hi[5] >> 16) & 0xff] ^ TAB.T7H[(x.hi[0] >> 24) & 0xff];

    y.lo[11] = TAB.T0L[x.lo[11] & 0xff] ^ TAB.T1L[(x.lo[10] >> 8) & 0xff] ^ TAB.T2L[(x.lo[9] >> 16) & 0xff] ^ TAB.T3L[(x.lo[8] >> 24) & 0xff] ^
        TAB.T4L[x.hi[7] & 0xff] ^ TAB.T5L[(x.hi[6] >> 8) & 0xff] ^ TAB.T6L[(x.hi[5] >> 16) & 0xff] ^ TAB.T7L[(x.hi[0] >> 24) & 0xff] ^ (11 << 4) ^ round;

    y.hi[12] = TAB.T0H[x.lo[12] & 0xff] ^ TAB.T1H[(x.lo[11] >> 8) & 0xff] ^ TAB.T2H[(x.lo[10] >> 16) & 0xff] ^ TAB.T3H[(x.lo[9] >> 24) & 0xff] ^
        TAB.T4H[x.hi[8] & 0xff] ^ TAB.T5H[(x.hi[7] >> 8) & 0xff] ^ TAB.T6H[(x.hi[6] >> 16) & 0xff] ^ TAB.T7H[(x.hi[1] >> 24) & 0xff];

    y.lo[12] = TAB.T0L[x.lo[12] & 0xff] ^ TAB.T1L[(x.lo[11] >> 8) & 0xff] ^ TAB.T2L[(x.lo[10] >> 16) & 0xff] ^ TAB.T3L[(x.lo[9] >> 24) & 0xff] ^
        TAB.T4L[x.hi[8] & 0xff] ^ TAB.T5L[(x.hi[7] >> 8) & 0xff] ^ TAB.T6L[(x.hi[6] >> 16) & 0xff] ^ TAB.T7L[(x.hi[1] >> 24) & 0xff] ^ (12 << 4) ^ round;

    y.hi[13] = TAB.T0H[x.lo[13] & 0xff] ^ TAB.T1H[(x.lo[12] >> 8) & 0xff] ^ TAB.T2H[(x.lo[11] >> 16) & 0xff] ^ TAB.T3H[(x.lo[10] >> 24) & 0xff] ^
        TAB.T4H[x.hi[9] & 0xff] ^ TAB.T5H[(x.hi[8] >> 8) & 0xff] ^ TAB.T6H[(x.hi[7] >> 16) & 0xff] ^ TAB.T7H[(x.hi[2] >> 24) & 0xff];

    y.lo[13] = TAB.T0L[x.lo[13] & 0xff] ^ TAB.T1L[(x.lo[12] >> 8) & 0xff] ^ TAB.T2L[(x.lo[11] >> 16) & 0xff] ^ TAB.T3L[(x.lo[10] >> 24) & 0xff] ^
        TAB.T4L[x.hi[9] & 0xff] ^ TAB.T5L[(x.hi[8] >> 8) & 0xff] ^ TAB.T6L[(x.hi[7] >> 16) & 0xff] ^ TAB.T7L[(x.hi[2] >> 24) & 0xff] ^ (13 << 4) ^ round;

    y.hi[14] = TAB.T0H[x.lo[14] & 0xff] ^ TAB.T1H[(x.lo[13] >> 8) & 0xff] ^ TAB.T2H[(x.lo[12] >> 16) & 0xff] ^ TAB.T3H[(x.lo[11] >> 24) & 0xff] ^
        TAB.T4H[x.hi[10] & 0xff] ^ TAB.T5H[(x.hi[9] >> 8) & 0xff] ^ TAB.T6H[(x.hi[8] >> 16) & 0xff] ^ TAB.T7H[(x.hi[3] >> 24) & 0xff];

    y.lo[14] = TAB.T0L[x.lo[14] & 0xff] ^ TAB.T1L[(x.lo[13] >> 8) & 0xff] ^ TAB.T2L[(x.lo[12] >> 16) & 0xff] ^ TAB.T3L[(x.lo[11] >> 24) & 0xff] ^
        TAB.T4L[x.hi[10] & 0xff] ^ TAB.T5L[(x.hi[9] >> 8) & 0xff] ^ TAB.T6L[(x.hi[8] >> 16) & 0xff] ^ TAB.T7L[(x.hi[3] >> 24) & 0xff] ^ (14 << 4) ^ round;

    y.hi[15] = TAB.T0H[x.lo[15] & 0xff] ^ TAB.T1H[(x.lo[14] >> 8) & 0xff] ^ TAB.T2H[(x.lo[13] >> 16) & 0xff] ^ TAB.T3H[(x.lo[12] >> 24) & 0xff] ^
        TAB.T4H[x.hi[11] & 0xff] ^ TAB.T5H[(x.hi[10] >> 8) & 0xff] ^ TAB.T6H[(x.hi[9] >> 16) & 0xff] ^ TAB.T7H[(x.hi[4] >> 24) & 0xff];

    y.lo[15] = TAB.T0L[x.lo[15] & 0xff] ^ TAB.T1L[(x.lo[14] >> 8) & 0xff] ^ TAB.T2L[(x.lo[13] >> 16) & 0xff] ^ TAB.T3L[(x.lo[12] >> 24) & 0xff] ^
        TAB.T4L[x.hi[11] & 0xff] ^ TAB.T5L[(x.hi[10] >> 8) & 0xff] ^ TAB.T6L[(x.hi[9] >> 16) & 0xff] ^ TAB.T7L[(x.hi[4] >> 24) & 0xff] ^ (15 << 4) ^ round;

};

module.exports = KupynaTransLong;