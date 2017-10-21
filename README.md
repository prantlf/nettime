# nettime [![NPM version](https://badge.fury.io/js/nettime.png)](http://badge.fury.io/js/nettime) [![Build Status](https://travis-ci.org/prantlf/nettime.png)](https://travis-ci.org/prantlf/nettime) [![Dependency Status](https://david-dm.org/prantlf/nettime.svg)](https://david-dm.org/prantlf/nettime) [![devDependency Status](https://david-dm.org/prantlf/nettime/dev-status.svg)](https://david-dm.org/prantlf/nettime#info=devDependencies) [![Code Climate](https://codeclimate.com/github/prantlf/nettime/badges/gpa.svg)](https://codeclimate.com/github/prantlf/nettime) [![Codacy Badge](https://www.codacy.com/project/badge/f3896e8dfa5342b8add12d50390edfcd)](https://www.codacy.com/public/prantlf/nettime)

[![NPM Downloads](https://nodei.co/npm/nettime.png?downloads=true&stars=true)](https://www.npmjs.com/package/nettime)

Prints timings of a HTTP/S request, including DNS lookup, TLS handshake etc.

## Command-line usage

Make sure that you have [NodeJS] >= 4 installed. Install the `nettime` package globally and print timings of a sample web site:

```bash
$ npm install -g nettime
$ nettime http://www.google.com
```

```text
Usage: nettime [options] <URL>

Options:

  -V, --version          output the version number
  -f, --format <format>  set output format: text, json
  -u, --unit <unit>      set time unit: ms, s+ns
  -h, --help             output usage information

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
nettime('http://www.google.com').then(result => {
  if (result.statusCode === 200) {
    let timings = result.timings
    let duration = nettime.getDuration(timings.responseBegin,
          timings.responseEnd)
    console.log(nettime.getMilliseconds(duration) + 'ms')
  }
})
```

The main module exports a function which makes a HTTP/S request and returns a [Promise] to the result object.

The input argument is a string with a URL to make the request with.

The result object contains:

* `statusCode`: [HTTP status code] of the response (integer)
* `timings`: object with timing properties from various stages of the request. Timing is an array with two integers - seconds and nanoseconds passed since the request has been made.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding
style.  Add unit tests for any new or changed functionality. Lint and test
your code using Grunt.

## Release History

* 2017-10-21   v0.1.0   Initial release

## License

Copyright (c) 2017 Ferdinand Prantl

Licensed under the MIT license.

[NodeJS]: http://nodejs.org/
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[HTTP status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
