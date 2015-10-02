#!/usr/bin/env node

// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var ClusterManager = require('./lib/cluster.js');
var program = require('commander');

function main() {
    program
        .description('Lookup a key in the ring')
        .option('-k --key <key>', 'Key to lookup')
        .option('--tchannel-v1')
        .usage('[options] <hostport>');
    program.parse(process.argv);

    var coord = program.args[0];

    if (!coord) {
        console.error('Error: hostport is required');
        process.exit(1);
    }

    if (!program.key) {
        console.error('Error: key is required');
        process.exit(1);
    }

    var clusterManager = new ClusterManager({
        useTChannelV1: program.tchannelV1,
        coordAddr: coord
    });
    clusterManager.lookup(program.key, function onLookup(err, res) {
        if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
        }

        if (clusterManager.getPartitionCount() > 1) {
            console.error('Error: cluster is partitioned. An consistent lookup cannot be provided.');
            process.exit(1);
        }

        console.log(res.dest);
        process.exit();
    });
}

if (require.main === module) {
    main();
}
