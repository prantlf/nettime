# nettime

[![npm](https://img.shields.io/npm/v//nettime)](https://www.npmjs.com/package//nettime#top)
[![codecov](https://codecov.io/gh/prantlf//nettime/branch/master/graph/badge.svg)](https://codecov.io/gh/prantlf//nettime)
[![codebeat badge](https://codebeat.co/badges/9d85c898-df08-42fb-8ab9-407dc2ce2d22)](https://codebeat.co/projects/github-com-prantlf-/nettime-master)
![Dependency status](https://img.shields.io/librariesio/release/npm//nettime)

Prints time duration of various stages of a HTTP/S request, like DNS lookup, TLS handshake, Time to First Byte etc. Similarly to the [time] command, which measures process timings, the `nettime` command measures HTTP/S request timings.  You can find more information in [Understanding & Measuring HTTP Timings with Node.js](https://blog.risingstack.com/measuring-http-timings-node-js/).

**Attention**: Command-line options changed between 0.x and 1.x versions, so that they become compatible with [curl]. If you use the `nettime` command-line tool, check the affected options:

```text
-e, --ignore-certificate  =>  -k, --insecure
-u, --unit                =>  -t, --time-unit
-U, --user                =>  -u, --user
```

The programmatic interface did not change and has remained compatible.

## Command-line usage

Make sure that you have [Node.js] >= 14.8 installed. Install the `nettime` package globally and print timings of a sample web site:

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

  -V, --version                output the version number
  -0, --http1.0                use HTTP 1.0
      --http1.1                use HTTP 1.1 (default)
      --http2                  use HTTP 2.0
  -c, --connect-timeout <ms>   maximum time to wait for a connection
  -d, --data <data>            data to be sent using the POST verb
  -f, --format <format>        set output format: text, json, raw
  -H, --header <header>        send specific HTTP header
  -i, --include                include response headers in the output
  -I, --head                   use HEAD verb to get document info only
  -k, --insecure               ignore certificate errors
  -L, --location               follow redirects
  -o, --output <file>          write the received data to a file
  -t, --time-unit <unit>       set time unit: ms, s+ns
  -u, --user <credentials>     credentials for Basic Authentication
  -X, --request <verb>         specify HTTP verb to use for the request
  -C, --request-count <count>  count of requests to make (default: 1)
  -D, --request-delay <ms>     delay between two requests
  -A, --average-timings        print an average of multiple request timings
  -h, --help                   output usage information

The default output format is "text" and time unit "ms". Other options
are compatible with curl. Timings are printed to the standard output.

Examples:

  $ nettime -f json https://www.github.com
  $ nettime --http2 -C 3 -A https://www.google.com
```

## Programmatic usage

Make sure that you use [Node.js] >= 14.8. Install the `nettime` package locally and get time duration of waiting for the response and downloading the content of a sample web page:

```bash
npm install --save nettime
```

```js
const { nettime, getDuration } = require('nettime')
nettime('https://www.google.com')
  .then(result => {
    if (result.statusCode === 200) {
      let timings = result.timings
      let waiting = getDuration([0, 0], timings.firstByte)
      let downloading = getDuration(timings.firstByte, timings.contentTransfer)
      console.log('Waiting for the response:', nettime.getMilliseconds(waiting) + 'ms')
      console.log('Downloading the content:', nettime.getMilliseconds(downloading) + 'ms')
    }
  })
  .catch(error => console.error(error))
```

The main module exports a function which makes a HTTP/S request and returns a [Promise] to the result object. The function carries properties `nettime`, `getDuration`, `getMilliseconds` and `isRedirect`, so that the export can be consumed as an object with several static functions too:

```js
const nettime = require('nettime')
const { nettime, getDuration } = require('nettime')
```

The input argument is a string with a URL to make the request with, or an object with multiple properties.

The input object can contain:

* `url`: string with a URL to make the request with.
* `credentials`: object with `username` and `password` string properties to be used for formatting of the Basic Authentication HTTP header.
* `data`: string or Buffer to send to the server using the HTTP verb `POST` and the content type `application/x-www-form-urlencoded` by default.
* `failOnOutputFileError`: boolean for preventing the request timing operation from failing, if writing to the output file failed. If set to `false`, the error will be printed on the standard output and the process exit code will be set to 2. It is in effect only if `outputFile` is specified. The default is `true`.
* `headers`: object with header names as string keys and header values as string values.
* `httpVersion`: string with the protocol version ('1.0', '1.1' or '2.0') to be sent to the server. (Node.js HTTP support is hard-coded for 1.1. There can be a difference between 1.0 and 1.1 on the server side only. Node.js supports HTTP/2 in the version 8.4.0 or newer with the --expose-http2 command-lime option and in the version 8.8.1 or newer out-of-the-box. Alternatively, you can install a "http2" module as a polyfill.)
* `followRedirects`: boolean to continue making requests, if the original response contained a redirecting HTTP status code
* `includeHeaders`: boolean for including property `headers` (`Object`) with response headers in the promised result object. If `outputFile` is specified, the headers are written to the beginning of the output file too.
* `method`: HTTP verb to use in the HTTP request; `GET` is the default, unless `-i` or `-d` options are not set.
* `outputFile`: file path to write the received data to.
* `rejectUnauthorized`: boolean to refuse finishing the HTTPS request, is set to `true` (the default), if validation of the web site certificate fails; setting it to `false` makes the request ignore certificate errors.
* `returnResponse`: boolean for including property `response` (`Buffer`) with the received data in the promised result object.
* `requestCount`: integer for making multiple requests instead of one.
* `requestDelay`: integer to introduce a delay (in milliseconds ) between each two requests. The default is 100.
* `timeout`: intere to set the maximum time (in milliseconds) a single request should take before aborting it.

The result object contains:

* `httpVersion`: HTTP version, which the server responsed with (string).
* `statusCode`: [HTTP status code] of the response (integer).
* `statusMessage`: HTTP status message for the status code (string).
* `timings`: object with timing properties from various stages of the request. Timing is an array with two integers - seconds and nanoseconds passed since the request has been made, as returned by [process.hrtime].
* `headers`: an optional object with the response headers, if enabled by the option `includeHeaders`.
* `url`: an optional string with the requested URL, if the option `followRedirects` was set to `true`.

```js
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

If the option `requestCount` is greater than `1`, the result objects will be returned in an array of the same length as the `requestCount` value.
If the option `followRedirects` us set to `true`, the result objects will be returned in an array of the length depending on the presence and count of redirecting responses.

*Note*: The `time-unit` parameter affects not only the "text" output format of the command line script, but also the "json" one. If set to "ms", timing values will be printed in milliseconds. If set to "s+ns", timings will be printed as arrays in [process.hrtime]'s format. Calling the `nettime` function programmatically will always return the timings as arrays in [process.hrtime]'s format.

### Helper functions

The following functions are exposed as named exports from the `nettime/lib/timings` module to help dealing with [process.hrtime]'s timing format and timings from multiple requests:

* `getDuration(start, end)`: computes the difference between two timings. Expects two arrays in [process.hrtime]'s format and returns the result as an array in the same [process.hrtime]'s format.
* `getMilliseconds(timing)`: converts the timing to milliseconds. Expects an array in [process.hrtime]'s format and returns the result as an integer.
* `computeAverageDurations(multipleTimings)`: computes average durations from an array of event timings. The array is supposed to contain objects with the same keys as the `timings` object from the `nettime` response. The returned object will contain the same keys pointing to event durations in [process.hrtime]'s format.
* `createTimingsFromDurations(timings, startTime)`: reconstructs event timings from event durations. The `timings` object is supposed to contain the same keys as the `timings` object from the `nettime` response, but pointing to event durations in [process.hrtime]'s format. The returned object will contain the same keys, but pointing to event times in [process.hrtime]'s format. The `startTime` parameter can shoft the event times. The default is no shift - `[0, 0]`.
* `isRedirect(statusCode)`: checks if the HTTP status code means a redirect. Returns `true` if it is, otherwise `false`.

These methods can be required separately too:

```js
const { isRedirect } = require('nettime')
const {
  getDuration, getMilliseconds,
  computeAverageDurations, createTimingsFromDurations
} = require('nettime/lib/timings')
```

Methods `getDuration`, `getMilliseconds` and `isRedirect` are accessible also as static methods of the `nettime` function exported from the main `nettime` module.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## License

Copyright (c) 2017-2022 Ferdinand Prantl

Licensed under the MIT license.

[time]: https://en.wikipedia.org/wiki/Time_(Unix)
[Node.js]: http://nodejs.org/
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[HTTP status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[process.hrtime]: https://nodejs.org/api/process.html#process_process_hrtime_time
[curl]: https://curl.haxx.se/
