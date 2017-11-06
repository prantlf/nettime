# nettime [![NPM version](https://badge.fury.io/js/nettime.png)](http://badge.fury.io/js/nettime) [![Build Status](https://travis-ci.org/prantlf/nettime.png)](https://travis-ci.org/prantlf/nettime) [![Coverage Status](https://coveralls.io/repos/github/prantlf/nettime/badge.svg?branch=master)](https://coveralls.io/github/prantlf/nettime?branch=master) [![codecov](https://codecov.io/gh/prantlf/nettime/branch/master/graph/badge.svg)](https://codecov.io/gh/prantlf/nettime) [![Dependency Status](https://david-dm.org/prantlf/nettime.svg)](https://david-dm.org/prantlf/nettime) [![devDependency Status](https://david-dm.org/prantlf/nettime/dev-status.svg)](https://david-dm.org/prantlf/nettime#info=devDependencies) [![Greenkeeper badge](https://badges.greenkeeper.io/prantlf/nettime.svg)](https://greenkeeper.io/) [![Maintainability](https://api.codeclimate.com/v1/badges/b17aff2d4bc103085639/maintainability)](https://codeclimate.com/github/prantlf/nettime/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/b17aff2d4bc103085639/test_coverage)](https://codeclimate.com/github/prantlf/nettime/test_coverage) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/864e23edaf654281b8b763d74494da38)](https://www.codacy.com/app/prantlf/nettime?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=prantlf/nettime&amp;utm_campaign=Badge_Grade) [![Codacy Badge](https://api.codacy.com/project/badge/Coverage/864e23edaf654281b8b763d74494da38)](https://www.codacy.com/app/prantlf/nettime?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=prantlf/nettime&amp;utm_campaign=Badge_Coverage) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/nettime.png?downloads=true&stars=true)](https://www.npmjs.com/package/nettime)

Prints time duration of various stages of a HTTP/S request, like DNS lookup, TLS handshake, Time to First Byte etc. Similarly to the [time] command, which measures process timings, the `nettime` command measures HTTP/S request timings.  You can find more information in [Understanding & Measuring HTTP Timings with Node.js](https://blog.risingstack.com/measuring-http-timings-node-js/).

## Command-line usage

Make sure that you have [NodeJS] >= 4 installed. Install the `nettime` package globally and print timings of a sample web site:

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

  -V, --version             output the version number
  -e, --ignore-certificate  ignore certificate errors
  -f, --format <format>     set output format: text, json
  -H, --header <header>     send specific HTTP header
  -I, --head                use HEAD verb to show document info only
  -u, --unit <unit>         set time unit: ms, s+ns
  -U, --user <credentials>  credentials for Basic Authentication
  -h, --help                output usage information

The default output format is "text" and time unit "ms".
Options -H, -I and -U are the same as -H, -I and -u for curl.
Timings are printed to the standard output.
```

## Programmatic usage

Make sure that you use [NodeJS] >= 4. Install the `nettime` package locally and get time duration of waiting for the response and downloading the content of a sample web page:

```bash
npm install --save nettime
```

```javascript
const nettime = require('nettime')
nettime('https://www.google.com').then(result => {
  if (result.statusCode === 200) {
    let timings = result.timings
    let waiting = nettime.getDuration([0, 0], timings.firstByte)
    let downloading = nettime.getDuration(timings.firstByte,
          timings.contentTransfer)
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
* `headers`: object with header names as string keys and header values as string values.
* `method`: HTTP verb to use in the HTTP request: `GET` (default) or `HEAD`.
* `rejectUnauthorized`: boolean to refuse finishing the HTTPS request, is set to `true` (the default), if validation of the web site certificate fails; setting it to `false` makes the request ignore certificate errors.

The result object contains:

* `statusCode`: [HTTP status code] of the response (integer).
* `statusMessage`: HTTP status message for the status code (string).
* `timings`: object with timing properties from various stages of the request. Timing is an array with two integers - seconds and nanoseconds passed since the request has been made, as returned by [process.hrtime].

```javascript
{
  "statusCode": 301,
  "statusMessage": "Moved Permanently",
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

*Note*: The `unit` parameter affects not only the "text" output format of the command line script, but also the "json" one. If set to "ms", timing values will be printed in milliseconds. If set to "s+ns", timings will be printed as arrays in [process.hrtime]'s format. Calling the `nettime` function programmatically will always return the timings as arrays in [process.hrtime]'s format.

### Helper functions

The following static methods are exposed on the `nettime` function to help dealing with [process.hrtime]'s timing format:

* `getDuration(start, end)`: computes the difference between two timings. Expects two arrays in [process.hrtime]'s format and returns the result as an array in the same format.
* `getMilliseconds(timing)`: converts the timing to milliseconds. Expects an array in [process.hrtime]'s format and returns the result as an integer.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding
style.  Add unit tests for any new or changed functionality. Lint and test
your code using Grunt.

## Release History

* 2017-11-06   v0.4.0   Support custom headers and Basic Authentication
* 2017-11-05   v0.3.3   Do not add seconds in nanosecond precision to avoid errors
* 2017-11-04   v0.3.2   Print HTTP status message too
* 2017-10-22   v0.3.1   Round resulting milliseconds instead of truncating them
* 2017-10-22   v0.3.0   Allow ignoring of TLS certificate errors
* 2017-10-22   v0.2.0   Add timing for Socket Close
* 2017-10-21   v0.1.0   Initial release

## License

Copyright (c) 2017 Ferdinand Prantl

Licensed under the MIT license.

[time]: https://en.wikipedia.org/wiki/Time_(Unix)
[NodeJS]: http://nodejs.org/
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[HTTP status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[process.hrtime]: https://nodejs.org/api/process.html#process_process_hrtime_time
