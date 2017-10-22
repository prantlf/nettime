# nettime [![NPM version](https://badge.fury.io/js/nettime.png)](http://badge.fury.io/js/nettime) [![Build Status](https://travis-ci.org/prantlf/nettime.png)](https://travis-ci.org/prantlf/nettime) [![Coverage Status](https://coveralls.io/repos/github/prantlf/nettime/badge.svg?branch=master)](https://coveralls.io/github/prantlf/nettime?branch=master) [![Dependency Status](https://david-dm.org/prantlf/nettime.svg)](https://david-dm.org/prantlf/nettime) [![devDependency Status](https://david-dm.org/prantlf/nettime/dev-status.svg)](https://david-dm.org/prantlf/nettime#info=devDependencies) [![Greenkeeper badge](https://badges.greenkeeper.io/prantlf/nettime.svg)](https://greenkeeper.io/) [![Maintainability](https://api.codeclimate.com/v1/badges/b17aff2d4bc103085639/maintainability)](https://codeclimate.com/github/prantlf/nettime/maintainability) [![Codacy Badge](https://www.codacy.com/project/badge/f3896e8dfa5342b8add12d50390edfcd)](https://www.codacy.com/public/prantlf/nettime) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/nettime.png?downloads=true&stars=true)](https://www.npmjs.com/package/nettime)

Prints time duration of various stages of a HTTP/S request, like DNS lookup, TLS handshake, Time to First Byte etc. You can find more information in [Understanding & Measuring HTTP Timings with Node.js](https://blog.risingstack.com/measuring-http-timings-node-js/).

## Command-line usage

Make sure that you have [NodeJS] >= 4 installed. Install the `nettime` package globally and print timings of a sample web site:

```bash
$ npm install -g nettime
$ nettime https://www.google.com
```

```text
Usage: nettime [options] <URL>

Options:

  -V, --version             output the version number
  -e, --ignore-certificate  ignore certificate errors
  -f, --format <format>     set output format: text, json
  -u, --unit <unit>         set time unit: ms, s+ns
  -h, --help                output usage information

The default output format is "text" and time unit "ms".
Timings are printed to the standard output.
```

## Programmatic usage

Make sure that you use [NodeJS] >= 4. Install the `nettime` package locally and get time duration of downloading the response body of a sample web page:

```bash
npm install --save nettime
```

```javascript
const nettime = require('nettime')
nettime('https://www.google.com').then(result => {
  if (result.statusCode === 200) {
    let timings = result.timings
    let duration = nettime.getDuration(timings.firstByte,
          timings.contentTransfer)
    console.log(nettime.getMilliseconds(duration) + 'ms')
  }
})
```

The main module exports a function which makes a HTTP/S request and returns a [Promise] to the result object.

The input argument is a string with a URL to make the request with, or an object with multiple properties.

The input object can contain:

* `url`: string with a URL to make the request with.
* `rejectUnauthorized`: boolean to refuse finishing the HTTPS request, is set to `true` (the default), if validation of the web site certificate fails; setting it to `false` makes the request ignore certificate errors.

The result object contains:

* `statusCode`: [HTTP status code] of the response (integer).
* `timings`: object with timing properties from various stages of the request. Timing is an array with two integers - seconds and nanoseconds passed since the request has been made, as returned by [process.hrtime].

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding
style.  Add unit tests for any new or changed functionality. Lint and test
your code using Grunt.

## Release History

* 2017-10-22   v0.3.0   Allow ignoring of TLS certificate errors
* 2017-10-22   v0.2.0   Add timing for Socket Close
* 2017-10-21   v0.1.0   Initial release

## License

Copyright (c) 2017 Ferdinand Prantl

Licensed under the MIT license.

[NodeJS]: http://nodejs.org/
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[HTTP status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[process.hrtime]: https://nodejs.org/api/process.html#process_process_hrtime_time
