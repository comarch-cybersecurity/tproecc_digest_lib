# tProEcc Digest Lib
code version 1.0.10

## Introduction

> tProEcc is a cryptographical device based on Elliptic Curves Cryptography. If you want to know a little bit more about availability of the device and its features please refer to: http://tpro.comarch.com/.

This is a wrapper around different crypto hashing algoritms and is a part of signature verification library dedicated for building backend for tPro devices. Unique feature of the library is support for the Kupyna hash function, which is Ukrainian national standard (DSTU 7564:2014)

Library features following hashing algorithms:
- SHA3-256
- SHA3-384
- SHA3-512
- Kupyna-256
- Kupyna-384
- Kupyna-512

## Installation

npm install tproecc_digest_lib

## Usage

### List supported digests

#### Code
~~~
// require library
var tproecc_digest_lib = require "tproecc_digest_lib");

// create digest object
var digest = new tproecc_digest_lib();

// list supported digests
console.log( digest.getSupportedDigests() );
~~~

#### Output:

`['SHA3_256','SHA3_384','SHA3_512','KUPYNA_256','KUPYNA_384', 'KUPYNA_512']`

### Generate digest

#### Code
~~~
// require library
var tproecc_digest_lib = require "tproecc_digest_lib");

// create digest object
var digest = new tproecc_digest_lib();

// generate Kupyna-512 digest
console.log( digest.digestUTF8( "KUPYNA_512", "test message" 
~~~

#### Output:

~~~
{ 
  digestType: 'KUPYNA_512',
  digestValue: 'cb5a3e2e.......' 
}
~~~

## License
This library is commercial solution and can be only used as a part of complete tPro Ecc token infrastructure.

## Copyright
Copyright 2017 by Comarch Technologies. All rights reserved.

## Contact
In case of any questions, doubts, comments, bugs - please [email us](mailto:tpro@comarch.com).

