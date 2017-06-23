/*jslint node: true */
'use strict';

function LongArrBuffer(sizeInLongs) {
  this.longArr = {
    lo: [],
    hi: []
  };
  for (var index = 0; index < sizeInLongs; index++) {
    this.longArr.lo[index] = 0;
    this.longArr.hi[index] = 0;
  }
  this.byteArr = [];

  this.longArrUpdated = true;
  this.longArr2ByteArr();
}

LongArrBuffer.prototype._showHexByteArr = function () {
  for (var index = 0; index < this.byteArr.length; index++) {
    this.showHexByte(this.byteArr[index]);
    if (index % 8 === 7) {
      process.stdout.write("\n");
    }
  }
  console.log();
};

LongArrBuffer.prototype._showHexByte = function (byteToShow) {
  var hex = Number(byteToShow).toString(16);
  if (hex.length < 2) {
    hex = "0" + hex;
  }
  process.stdout.write(hex);
};

LongArrBuffer.prototype.showHexLong = function (longToShow) {
  if (longToShow < 0) {
    longToShow = 0xFFFFFFFF + longToShow + 1;
  }
  var hex = Number(longToShow).toString(16);
  hex = "00000000".substr(0, 8 - hex.length) + hex;
  process.stdout.write(hex);
};

LongArrBuffer.prototype._showHexLongArr = function () {
  for (var i = 0; i < this.longArr.lo.length; i++) {
    this.showHexLong(this.longArr.hi[i]);
    this.showHexLong(this.longArr.lo[i]);
    process.stdout.write("\n");
  }
  process.stdout.write("\n");
};

LongArrBuffer.prototype.byteArr2LongArr = function () {
  var start = 0;
  for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
    this.longArr.lo[longIndex] = (this.byteArr[start + 3] << 24) | (this.byteArr[start + 2] << 16) | (this.byteArr[start + 1] << 8) | this.byteArr[start];
    this.longArr.hi[longIndex] = (this.byteArr[start + 7] << 24) | (this.byteArr[start + 6] << 16) | (this.byteArr[start + 5] << 8) | this.byteArr[start + 4];
    start += 8;
  }
};

LongArrBuffer.prototype.longArr2ByteArr = function () {
  if (!this.longArrUpdated) {
    return;
  }
  var start = 0;
  for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
    var tempLo = this.longArr.lo[longIndex];
    var tempHi = this.longArr.hi[longIndex];
    for (var byteIndex = 0; byteIndex < 4; byteIndex++) {
      this.byteArr[start] = tempLo & 0xff;
      this.byteArr[start + 4] = tempHi & 0xff;
      start++;
      tempLo >>= 8;
      tempHi >>= 8;
    }
    start += 4;
  }
  this.longArrUpdated = false;
};


LongArrBuffer.prototype.notifyLongUpdated = function () {
  this.longArrUpdated = true;
};

LongArrBuffer.prototype.copyBytesTo = function (src, srcPos, dstPos, len) {
  this.longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    this.byteArr[dstPos + index] = src[srcPos + index];
  }
  this.byteArr2LongArr();
};

LongArrBuffer.prototype.copyBytesFrom = function (srcPos, dst, dstPos, len) {
  this.longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    dst[index + dstPos] = this.byteArr[index + srcPos];
  }
};

LongArrBuffer.prototype.setByte = function (bytePos, byteValue) {
  this.longArr2ByteArr();
  this.byteArr[bytePos] = byteValue;
  this.byteArr2LongArr();
};

LongArrBuffer.prototype.zeroAll = function () {
  for (var index = 0; index < this.longArr.lo.length; index++) {
    this.longArr.lo[index] = this.longArr.hi[index] = 0;
  }
  this.notifyLongUpdated();
  this.longArr2ByteArr();
};

LongArrBuffer.prototype.zeroBytes = function (startPos, len) {
  this.longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    this.byteArr[index + startPos] = 0;
  }
  this.byteArr2LongArr();
};

LongArrBuffer.prototype.long2ByteArr = function (longValue) {
  var tempArr = [];
  tempArr[0] = longValue & 0xff;
  tempArr[1] = (longValue >> 8) & 0xff;
  tempArr[2] = (longValue >> 16) & 0xff;
  tempArr[3] = (longValue >> 24) & 0xff;
  return tempArr;
};

LongArrBuffer.prototype.setLong = function (pos, longValue) {
  var tempArr = this.long2ByteArr(longValue);
  this.copyBytesTo(tempArr, 0, pos, tempArr.length);
};

module.exports = LongArrBuffer;