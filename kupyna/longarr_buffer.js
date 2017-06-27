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
  this._longArr2ByteArr();
}

LongArrBuffer.prototype._byteArr2LongArr = function () {
  var start = 0;
  for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
    this.longArr.lo[longIndex] = (this.byteArr[start + 3] << 24) | (this.byteArr[start + 2] << 16) | (this.byteArr[start + 1] << 8) | this.byteArr[start];
    this.longArr.hi[longIndex] = (this.byteArr[start + 7] << 24) | (this.byteArr[start + 6] << 16) | (this.byteArr[start + 5] << 8) | this.byteArr[start + 4];
    start += 8;
  }
};

LongArrBuffer.prototype._longArr2ByteArr = function () {
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

LongArrBuffer.prototype._long2ByteArr = function (longValue) {
  var tempArr = [];
  tempArr[0] = longValue & 0xff;
  tempArr[1] = (longValue >> 8) & 0xff;
  tempArr[2] = (longValue >> 16) & 0xff;
  tempArr[3] = (longValue >> 24) & 0xff;
  return tempArr;
};

/**
 * @public
 */
LongArrBuffer.prototype.notifyLongUpdated = function () {
  this.longArrUpdated = true;
};

LongArrBuffer.prototype.copyBytesTo = function (src, srcPos, dstPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    this.byteArr[dstPos + index] = src[srcPos + index];
  }
  this._byteArr2LongArr();
};

LongArrBuffer.prototype.copyBytesFrom = function (srcPos, dst, dstPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    dst[index + dstPos] = this.byteArr[index + srcPos];
  }
};

LongArrBuffer.prototype.setByte = function (bytePos, byteValue) {
  this._longArr2ByteArr();
  this.byteArr[bytePos] = byteValue;
  this._byteArr2LongArr();
};

LongArrBuffer.prototype.zeroAll = function () {
  for (var index = 0; index < this.longArr.lo.length; index++) {
    this.longArr.lo[index] = this.longArr.hi[index] = 0;
  }
  this.notifyLongUpdated();
  this._longArr2ByteArr();
};

LongArrBuffer.prototype.zeroBytes = function (startPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    this.byteArr[index + startPos] = 0;
  }
  this._byteArr2LongArr();
};


LongArrBuffer.prototype.setLong = function (pos, longValue) {
  var tempArr = this._long2ByteArr(longValue);
  this.copyBytesTo(tempArr, 0, pos, tempArr.length);
};

module.exports = LongArrBuffer;