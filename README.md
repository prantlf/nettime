# nettime
[![NPM version](https://badge.fury.io/js/nettime.png)](http://badge.fury.io/js/nettime)
[![Build Status](https://travis-ci.org/prantlf/nettime.png)](https://travis-ci.org/prantlf/nettime)
[![Coverage Status](https://coveralls.io/repos/github/prantlf/nettime/badge.svg?branch=master)](https://coveralls.io/github/prantlf/nettime?branch=master)
[![codecov](https://codecov.io/gh/prantlf/nettime/branch/master/graph/badge.svg)](https://codecov.io/gh/prantlf/nettime)
[![Dependency Status](https://david-dm.org/prantlf/nettime.svg)](https://david-dm.org/prantlf/nettime)
[![devDependency Status](https://david-dm.org/prantlf/nettime/dev-status.svg)](https://david-dm.org/prantlf/nettime#info=devDependencies)
[![Maintainability](https://api.codeclimate.com/v1/badges/b17aff2d4bc103085639/maintainability)](https://codeclimate.com/github/prantlf/nettime/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/b17aff2d4bc103085639/test_coverage)](https://codeclimate.com/github/prantlf/nettime/test_coverage)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/864e23edaf654281b8b763d74494da38)](https://www.codacy.com/app/prantlf/nettime?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=prantlf/nettime&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/864e23edaf654281b8b763d74494da38)](https://www.codacy.com/app/prantlf/nettime?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=prantlf/nettime&amp;utm_campaign=Badge_Coverage)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/nettime.png?downloads=true&stars=true)](https://www.npmjs.com/package/nettime)

Prints time duration of various stages of a HTTP/S request, like DNS lookup, TLS handshake, Time to First Byte etc. Similarly to the [time] command, which measures process timings, the `nettime` command measures HTTP/S request timings.  You can find more information in [Understanding & Measuring HTTP Timings with Node.js](https://blog.risingstack.com/measuring-http-timings-node-js/).

**Warning: The `nettime` script does not work in Node.js 10.0.** It appears to trigger some unexpected problem inside the network implementation. The network request is finished, but the process is exited immediately without letting even the debugger inspect it. I adapted the code for breaking the "close" event on the socket between Node.js 8.11.1 and 8.11.2, when HTTP/2 is used, but I'm still looking at the problem in Node.js 10, where no HTTP version works.

**Attention**: Command-line options changed between 0.x and 1.x versions, so that they become compatible with [curl]. If you use the `nettime` command-line tool, check the affected options:

```text
-e, --ignore-certificate  =>  -k, --insecure
-u, --unit                =>  -t, --time-unit
-U, --user                =>  -u, --user
```

The programmatic interface did not change and has remained compatible.

## Command-line usage

Make sure that you have [NodeJS] >= 6 installed. Install the `nettime` package globally and print timings of a sample web site:

```bash
$ npm install -g nettime
$ nettime https://www.google.com
Phase             Finished Duration
-----------------------------------
Socket Open         0.023s   0.023s
DNS Lookup          0.024s   0.001s
TCP Connection      0.053s   0.029s
TLS Handshake       0.133s   0.079s
First Byte          0.174s   0.041s
Content Transfer    0.176s   0.002s
Socket Close        0.177s   0.001s
-----------------------------------
Status Code: OK (200)
```

Running `nettime` without any parameters prints usage instructions:

```text
Usage: nettime [options] <URL>

Options:

  -V, --version               output the version number
  -0, --http1.0               use HTTP 1.0
      --http1.1               use HTTP 1.1 (default)
      --http2                 use HTTP 2.0
  -c, --connect-timeout <ms>  maximum time to wait for a connection
  -d, --data <data>           data to be sent using the POST verb
  -f, --format <format>       set output format: text, json
  -H, --header <header>       send specific HTTP header
  -i, --include               include response headers in the output
  -I, --head                  use HEAD verb to get document info only
  -k, --insecure              ignore certificate errors
  -o, --output <file>         write the received data to a file
  -t, --time-unit <unit>      set time unit: ms, s+ns
  -u, --user <credentials>    credentials for Basic Authentication
  -X, --request <verb>        specify HTTP verb to use for the request
  -h, --help                  output usage information

The default output format is "text" and time unit "ms". Other options
are compatible with curl. Timings are printed to the standard output.
```

## Programmatic usage

Make sure that you use [NodeJS] >= 6. Install the `nettime` package locally and get time duration of waiting for the response and downloading the content of a sample web page:

```bash
npm install --save nettime
```

```javascript
const nettime = require('nettime')
nettime('https://www.google.com').then(result => {
  if (result.statusCode === 200) {
    let timings = result.timings
    let waiting = nettime.getDuration([0, 0], timings.firstByte)
    let downloading = nettime.getDuration(timings.firstByte, timings.contentTransfer)
    console.log('Waiting for the response:', nettime.getMilliseconds(waiting) + 'ms')
    console.log('Downloading the content:', nettime.getMilliseconds(downloading) + 'ms')
  }
})
```

The main module exports a function which makes a HTTP/S request and returns a [Promise] to the result object.

The input argument is a string with a URL to make the request with, or an object with multiple properties.

The input object can contain:

* `url`: string with a URL to make the request with.
* `credentials`: object with `username` and `password` string properties to be used for formatting of the Basic Authentication HTTP header.
* `data`: string or Buffer to send to the server using the HTTP verb `POST` and the content type `application/x-www-form-urlencoded` by default.
* `failOnOutputFileError`: boolean for preventing the request timing operation from failing, if writing to the output file failed. If set to `false`, the error will be printed on the standard output and the process exit code will be set to 2. It is in effect only if `outputFile` is specified. The default is `true`.
* `headers`: object with header names as string keys and header values as string values.
* `httpVersion`: string with the protocol version ('1.0', '1.1' or '2.0') to be sent to the server. (Node.js HTTP support is hard-coded for 1.1. There can be a difference between 1.0 and 1.1 on the server side only. Node.js supports HTTP/2 in the version 8.4.0 or newer with the --expose-http2 command-lime option and in the version 8.8.1 or newer out-of-the-box. Alternatively, you can install a "http2" module as a polyfill.)
* `includeHeaders`: boolean for including property `headers` (`Object`) with response headers in the promised result object. If `outputFile` is specified, the headers are written to the beginning of the output file too.
* `method`: HTTP verb to use in the HTTP request; `GET` is the default, unless `-i` or `-d` options are not set.
* `outputFile`: file path to write the received data to.
* `rejectUnauthorized`: boolean to refuse finishing the HTTPS request, is set to `true` (the default), if validation of the web site certificate fails; setting it to `false` makes the request ignore certificate errors.
* `returnResponse`: boolean for including property `response` (`Buffer`) with the received data in the promised result object.

The result object contains:

* `httpVersion`: HTTP version, which the server responsed with (string).
* `statusCode`: [HTTP status code] of the response (integer).
* `statusMessage`: HTTP status message for the status code (string).
* `timings`: object with timing properties from various stages of the request. Timing is an array with two integers - seconds and nanoseconds passed since the request has been made, as returned by [process.hrtime].

```javascript
{
  "httpVersion": '1.1',
  "statusCode": 200,
  "statusMessage": "OK",
  "timings": {
    "socketOpen": [ 0, 13260126 ],
    "dnsLookup": [ 0, 13747391 ],     // Optional, if hostname was specified
    "tcpConnection": [ 0, 152135165 ],
    "tlsHandshake": [ 0, 433219351 ], // Optional, if HTTPS protocol was used
    "firstByte": [ 1, 888887072 ],
    "contentTransfer": [ 1, 891221207 ],
    "socketClose": [ 1, 893156380 ]
  }
}
```

*Note*: The `time-unit` parameter affects not only the "text" output format of the command line script, but also the "json" one. If set to "ms", timing values will be printed in milliseconds. If set to "s+ns", timings will be printed as arrays in [process.hrtime]'s format. Calling the `nettime` function programmatically will always return the timings as arrays in [process.hrtime]'s format.

### Helper functions

The following static methods are exposed on the `nettime` function to help dealing with [process.hrtime]'s timing format:

* `getDuration(start, end)`: computes the difference between two timings. Expects two arrays in [process.hrtime]'s format and returns the result as an array in the same format.
* `getMilliseconds(timing)`: converts the timing to milliseconds. Expects an array in [process.hrtime]'s format and returns the result as an integer.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## Release History

* 2019-03-10   v2.1.0   Added option for setting connection timeout
* 2018-05-19   v2.0.1   Fixed http2 connection for Node.js 8.11.2
* 2018-04-27   v2.0.0   Dropped support of Node.js 4
* 2018-03-16   v1.1.2   Upgrade package dependencies
* 2017-12-21   v1.1.1   Upgrade semantic release and other dependencies
* 2017-11-11   v1.1.0   Support HTTP/2 requests
* 2017-11-06   v1.0.0   Make command-line options compatible with [curl]
* 2017-11-06   v0.5.0   Add support for the [curl] options "iIXdo"
* 2017-11-06   v0.4.0   Support custom headers and Basic Authentication
* 2017-11-05   v0.3.3   Do not add seconds in nanosecond precision to avoid errors
* 2017-11-04   v0.3.2   Print HTTP status message too
* 2017-10-22   v0.3.1   Round resulting milliseconds instead of truncating them
* 2017-10-22   v0.3.0   Allow ignoring of TLS certificate errors
* 2017-10-22   v0.2.0   Add timing for Socket Close
* 2017-10-21   v0.1.0   Initial release

## License

Copyright (c) 2017-2019 Ferdinand Prantl

Licensed under the MIT license.

[time]: https://en.wikipedia.org/wiki/Time_(Unix)
[NodeJS]: http://nodejs.org/
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[HTTP status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[process.hrtime]: https://nodejs.org/api/process.html#process_process_hrtime_time
[curl]: https://curl.haxx.se/
