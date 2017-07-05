/*jslint node: true */
'use strict';

var tProEccDigestLib = require("../bundle/tproecc_digest_lib_bundle-1.0.12.js");

var TEST_VECTORS = [{
        type: "KUPYNA_256",
        msg: "",
        res: "cd5101d1ccdf0d1d1f4ada56e888cd724ca1a0838a3521e7131d4fb78d0f5eb6"
    }, {
        type: "KUPYNA_512",
        msg: "",
        res: "656b2f4cd71462388b64a37043ea55dbe445d452aecd46c3298343314ef04019bcfa3f04265a9857f91be91fce197096187ceda78c9c1c021c294a0689198538"
    },
    {
        type: "SHA3_256",
        msg: "abc",
        res: "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"
    },
    {
        type: "SHA3_384",
        msg: "abc",
        res: "ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25"
    },
    {
        type: "SHA3_512",
        msg: "abc",
        res: "b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0"
    }
];

function test_digest_lib() {
    var digest = new tProEccDigestLib();

    for (var index in TEST_VECTORS) {
        var testCase = TEST_VECTORS[index];
        console.log("Test:" + (Number(index) + 1) + " of " + testCase.type);
        var result = digest.digestUTF8(testCase.type, testCase.msg);
        console.log("result  : " + JSON.stringify(result));
        console.log("expected: " + testCase.res);
        if (result.digestValue !== testCase.res) throw Error("test failed");
        console.log("digest len:" + digest.getDigestLen(testCase.type));
        console.log("ok\n");
    }
}

test_digest_lib();