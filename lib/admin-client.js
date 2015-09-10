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

var TChannelV1;
var TChannelV2 = require('tchannel');

var tchannelV1;
var tchannelV2;

function AdminClient(address) {
    this.address = address;
}

AdminClient.prototype.destroy = function destroy() {
    if (tchannelV1) {
        tchannelV1.quit();
    }

    if (tchannelV2) {
        tchannelV2.quit();
    }
};

AdminClient.prototype.lookup = function lookup(version, key, callback) {
    this.request(version, '/admin/lookup', null, JSON.stringify({
        key: key
    }), callback);
};

AdminClient.prototype.stats = function stats(version, callback) {
    this.request(version, '/admin/stats', null, null, callback);
};

AdminClient.prototype.request = function request(version, endpoint, head, body, callback) {
    if (version === 'v1') {
        try {
            TChannelV1 = require('tchannelv1');
        } catch (e) {
            var newError = new Error(e.message);
            newError.message += '\nSuggestion: Run `npm run tchannel-v1` and try again.';
            callback(newError);
            return;
        }

        this.requestV1(this.address, endpoint, null, body, callback);
    } else {
        this.requestV2(this.address, endpoint, null, body, callback);
    }
};

AdminClient.prototype.requestV1 = function requestV1(host, endpoint, head, body, callback) {
    if (!tchannelV1) {
        tchannelV1 = new TChannelV1({
            host: '127.0.0.1',
            port: 31999
        });
    }

    tchannelV1.send({
        host: host
    }, endpoint, head, body, function onSend(err, res1, res2) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, JSON.parse(res2));
    });
};

AdminClient.prototype.requestV2 = function requestV2(host, endpoint, head, body, callback) {
    if (!tchannelV2) {
        var tchannel = new TChannelV2({
            host: '127.0.0.1',
            port: 31999
        });

        tchannelV2 = tchannel.makeSubChannel({
            serviceName: 'ringpop'
        });
    }

    tchannelV2.waitForIdentified({
        host: host
    }, function onIdentified(err) {
        if (err) {
            callback(err);
            return;
        }

        tchannelV2.request({
            host: host,
            hasNoParent: true,
            retryLimit: 1,
            trace: false,
            headers: {
                'as': 'raw',
                'cn': 'ringpop'
            },
            serviceName: 'ringpop'
        }).send(endpoint, head, body, function onSend(err, res, arg2, arg3) {
            if (err) {
                console.error('Error: ' + err.message);
                process.exit(1);
            }

            callback(null, JSON.parse(arg3));
        });
    });

};

module.exports = AdminClient;