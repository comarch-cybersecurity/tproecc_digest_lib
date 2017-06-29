/*jslint node: true */
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
 */

/**
 * Constructs LongArrBuffer object
 * @param {Number} sizeInLongs - size of long array buffer - number of long elements in the array
 * @public
 */
function LongLongBuffer(sizeInLongs) {
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
 * Converts internal byte array representation into long array representation.
 * @private
 */
LongLongBuffer.prototype._byteArr2LongArr = function () {
  var start = 0;
  for (var longIndex = 0; longIndex < this.longArr.lo.length; longIndex++) {
    this.longArr.lo[longIndex] = (this._byteArr[start + 3] << 24) | (this._byteArr[start + 2] << 16) | (this._byteArr[start + 1] << 8) | this._byteArr[start];
    this.longArr.hi[longIndex] = (this._byteArr[start + 7] << 24) | (this._byteArr[start + 6] << 16) | (this._byteArr[start + 5] << 8) | this._byteArr[start + 4];
    start += 8;
  }
};

/**
 * Converts internal long array representation into byte array representation.
 * @private
 */
LongLongBuffer.prototype._longArr2ByteArr = function () {
  if( this.longArr.lo.length > this.sizeInLongs ||
  this.longArr.hi.length > this.sizeInLongs ) throw Error( "modified initial length of long long array");
  
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
};

/**
 * Converts single long value into array of bytes.
 * @param {Number} longValue - long number to be converted into byte array
 * @returns {Array} - converted number
 * @private
 */
LongLongBuffer.prototype._long2ByteArr = function (longValue) {
  var tempArr = [];
  tempArr[0] = longValue & 0xff;
  tempArr[1] = (longValue >> 8) & 0xff;
  tempArr[2] = (longValue >> 16) & 0xff;
  tempArr[3] = (longValue >> 24) & 0xff;
  return tempArr;
};

/**
 * Notifies, that long array content has been updated.
 * If you changed 64 bit long data accessing longArr object property,
 * this methods needs to be called to ensure internal integrity between
 * byte and 64-bit long representation. 
 * @public
 */
LongLongBuffer.prototype.notifyLongUpdated = function () {
  this.longArrUpdated = true;
};

/**
 * Copies bytes array into long array buffer.
 * @param {Array} src - source array to copy from
 * @param {Integer} srcPos - souce location to start copy from (in bytes)
 * @param {Integer} dstPos - destination location (in bytes) of buffer to copy data to
 * @param {Integer} len - length of data to be copied (in bytes)
 * @public
 */
LongLongBuffer.prototype.copyBytesTo = function (src, srcPos, dstPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    var srcByte = src[srcPos + index];
    if (srcByte < 0 || srcByte > 255) throw new Error("array should contain only bytes - pos:" + index + " value:" + srcByte);
    this._byteArr[dstPos + index] = src[srcPos + index];
  }
  this._byteArr2LongArr();
};

/**
 * Copies bytes subarray from the long array buffer
 * @param {Integer} srcPos - location of long array buffer to copy from (indexed in bytes)
 * @param {Array} dst - destination array to copy data to
 * @param {Integer} dstPos - start index of destination array
 * @param {Integer} len - length of data to be copied (in bytes)
 * @public
 */
LongLongBuffer.prototype.copyBytesFrom = function (srcPos, dst, dstPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    dst[index + dstPos] = this._byteArr[index + srcPos];
  }
};

/**
 * Sets value of particular byte in the buffer
 * @param {Integer} bytePos - location of buffer to be change (indexed in bytes)
 * @param {Integer} byteValue - value to be set
 * @public
 */
LongLongBuffer.prototype.setByte = function (bytePos, byteValue) {
  this._longArr2ByteArr();
  if (byteValue < 0 || byteValue > 255) throw new Error("byteValue is not byte");

  this._byteArr[bytePos] = byteValue;
  this._byteArr2LongArr();
};

/**
 * Zeroes buffer.
 * @public
 */
LongLongBuffer.prototype.zeroAll = function () {
  for (var index = 0; index < this.longArr.lo.length; index++) {
    this.longArr.lo[index] = this.longArr.hi[index] = 0;
  }
  this.notifyLongUpdated();
  this._longArr2ByteArr();
};

/**
 * Zeroes range of bytes inside buffer.
 * @param {Integer} startPos - location of first byte to be zeroed
 * @param {Integer} len - length of bytes to be zeroed
 * @public
 */
LongLongBuffer.prototype.zeroBytes = function (startPos, len) {
  this._longArr2ByteArr();
  for (var index = 0; index < len; index++) {
    this._byteArr[index + startPos] = 0;
  }
  this._byteArr2LongArr();
};

/**
 * Sets long (32 bit) value inside buffer. Four bytes starting from pos location will be set.
 * @param {Number} pos - start location of 32-bit long value to be changed (indexed in bytes)
 * @param {Number} longValue - 32-bit long value to be set
 */
LongLongBuffer.prototype.setLongAsBytes = function (pos, longValue) {
  if (longValue < 0 || longValue > 0xffff)
    throw new Error("invalid 32 bit long value:" + longValue);
  var tempArr = this._long2ByteArr(longValue);
  this.copyBytesTo(tempArr, 0, pos, tempArr.length);
};

module.exports = LongLongBuffer;