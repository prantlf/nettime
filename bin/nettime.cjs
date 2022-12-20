#!/usr/bin/env node

const { nettime, isRedirect } = require('../lib/nettime.cjs')
const {
  computeAverageDurations, createTimingsFromDurations
} = require('../lib/timings.cjs')
const { printTimings } = require('../lib/printer.cjs')
const readlineSync = require('readline-sync')

function help() {
  console.log(`${require('../package.json').description}

Usage: nettime [options] <URL>

Options:
  -0|--http1.0                use HTTP 1.0
  --http1.1                   use HTTP 1.1 (default)
  --http2                     use HTTP 2
  -c|--connect-timeout <ms>   maximum time to wait for a connection
  -d|--data <data>            data to be sent using the POST verb
  -f|--format <format>        set output format: text, json, raw
  -H|--header <header>        send specific HTTP header
  -i|--include                include response headers in the output
  -I|--head                   use HEAD verb to get document info only
  -k|--insecure               ignore certificate errors
  -L|--location               follow redirects
  -o|--output <file>          write the received data to a file
  -t|--time-unit <unit>       set time unit: ms, s+ns (default: ms)
  -u|--user <credentials>     credentials for Basic Authentication
  -X|--request <verb>         specify HTTP verb to use for the request
  -C|--request-count <count>  count of requests to make (default: 1)
  -D|--request-delay <ms>     delay between two requests (default: 100ms)
  -A|--average-timings        print an average of multiple request timings
  -V|--version                print version number
  -h|--help                   print usage instructions

  The default output format is "text" and time unit "ms". Other options
  are compatible with curl. Timings are printed to the standard output.

Examples:')
  $ nettime https://www.github.com
  $ nettime -f json https://www.gitlab.com
  $ nettime --http2 -C 3 -A https://www.google.com`)
}

function toInteger(text, name) {
  const number = +text
  if (typeof number !== 'number') {
    console.error(`${name} has to be a number.`)
    process.exit(1)
  }
  return number
}

function toEnum(value, values, name) {
  if (values.indexOf(value) < 0) {
    console.error(`Invalid ${name}: "${value}". Valid values are "${values.join('", "')}".`)
    process.exit(1)
  }
  return value
}

const { argv } = process
const header = []
let   url, timeUnit, format = 'text', user, http2, http1_0, timeout, data,
      head, includeHeaders, insecure, outputFile, request, followRedirects,
      requestCount = 1, requestDelay = 100, averageTimings

for (let i = 2, l = argv.length; i < l; ++i) {
  const arg = argv[i]
  const match = /^(-|--)(no-)?([a-zA-Z0][-a-zA-Z0-2.]*)(?:=(.*))?$/.exec(arg)
  if (match) {
    const parseArg = (arg, flag) => {
      switch (arg) {
        case '0': case 'http1.0':
          http1_0 = flag
          return
        case 'http1.1':
          http1_0 = !flag
          return
        case 'http2':
          http2 = flag
          return
        case 'c': case 'connect-timeout':
          timeout = toInteger(match[4] || argv[++i], 'Timeout')
          return
        case 'd': case 'data':
          data = match[4] || argv[++i]
          return
        case 'f': case 'format':
          format = toEnum(match[4] || argv[++i], ['json', 'raw', 'text'], 'format')
          return
        case 'H': case 'header':
          header.push(match[4] || argv[++i])
          return
        case 'i': case 'include':
          includeHeaders = flag
          return
        case 'I': case 'head':
          head = flag
          return
        case 'k': case 'insecure':
          insecure = flag
          return
        case 'L': case 'location':
          followRedirects = flag
          return
        case 'o': case 'output':
          outputFile = match[4] || argv[++i]
          return
        case 't': case 'time-unit':
          timeUnit = toEnum(match[4] || argv[++i], ['ms', 's+ns'], 'time unit')
          return
        case 'u': case 'user':
          user = match[4] || argv[++i]
          return
        case 'X': case 'request':
          request = match[4] || argv[++i]
          return
        case 'C': case 'request-count':
          requestCount = toInteger(match[4] || argv[++i], 'Request count')
          return
        case 'D': case 'request-delay':
          requestDelay = toInteger(match[4] || argv[++i], 'Request delay')
          return
        case 'A': case 'average-timings':
          averageTimings = flag
          return
        case 'V': case 'version':
          console.log(require('../package.json').version)
          process.exit(0)
          return
        case 'h': case 'help':
          help()
          process.exit(0)
      }
      console.error(`unknown option: "${arg}"`)
      process.exit(1)
    }
    if (match[1] === '-') {
      const flags = match[3].split('')
      for (const flag of flags) parseArg(flag, true)
    } else {
      parseArg(match[3], match[2] !== 'no-')
    }
    continue
  }
  url = arg
}

if (!url) {
  help()
  process.exit(0)
}

const formatters = {
  json: result => {
    if (timeUnit !== 's+ns') {
      convertToMilliseconds(result.timings)
    }
    return result
  },
  raw: result => JSON.stringify(result),
  text: ({ timings, httpVersion, statusCode, statusMessage }) =>
    printTimings(timings, timeUnit) +
    `\nResponse: HTTP/${httpVersion} ${statusCode} ${statusMessage}`
}
const formatter = formatters[format]

const headers = header.reduce((result, header) => {
  const colon = header.indexOf(':')
  if (colon > 0) {
    const name = header
      .substr(0, colon)
      .trim()
      .toLowerCase()
    const value = header
      .substr(colon + 1)
      .trim()
    result[name] = value
  }
  return result
}, {})

let credentials = user
if (credentials) {
  const colon = credentials.indexOf(':')
  let username, password
  if (colon > 0) {
    username = credentials.substr(0, colon)
    password = credentials.substr(colon + 1)
  } else {
    username = credentials
    password = readlineSync.question('Password: ', { hideEchoBack: true })
  }
  credentials = { username, password }
}

const httpVersion = http2 ? '2.0' : http1_0 ? '1.0' : '1.1'
const method = request || (head ? 'HEAD' : data ? 'POST' : 'GET')
const failOnOutputFileError = false
const rejectUnauthorized = !insecure

nettime({
  httpVersion,
  method,
  url,
  credentials,
  headers,
  data,
  failOnOutputFileError,
  includeHeaders,
  outputFile,
  rejectUnauthorized,
  timeout,
  requestCount,
  requestDelay,
  followRedirects
})
  .then(results => {
    if (requestCount > 1) {
      if (averageTimings) {
        if (followRedirects) {
          results = computeRedirectableAverageTimings(results)
        } else {
          const result = computeAverageTimings(results)
          results = [result]
        }
      }
    } else if (!followRedirects) {
      results = [results]
    }
    return results
  })
  .then(results => {
    for (const result of results) {
      if (followRedirects) {
        console.log('URL:', result.url)
        console.log()
      }
      console.log(formatter(result))
      console.log()
    }
  })
  .catch(({ message }) => {
    console.error(message)
    process.exitCode = 1
  })

function convertToMilliseconds (timings) {
  const getMilliseconds = nettime.getMilliseconds
  for (const timing in timings) {
    timings[timing] = getMilliseconds(timings[timing])
  }
}

function computeAverageTimings (results) {
  checkStatusCodes()
  const timings = results.map(({ timings }) => timings)
  const averageDurations = computeAverageDurations(timings)
  return createAverageResult(results[0], averageDurations)

  function checkStatusCodes () {
    let firstStatusCode
    for (const { statusCode } of results) {
      if (firstStatusCode === undefined) {
        firstStatusCode = statusCode
      } else {
        if (firstStatusCode !== statusCode) {
          throw new Error(`Status code of the first request was ${firstStatusCode}, but ${statusCode} was received later.`)
        }
      }
    }
  }

  function createAverageResult (firstResult, averageDurations) {
    const { httpVersion, statusCode, statusMessage } = firstResult
    const timings = createTimingsFromDurations(averageDurations)
    return { timings, httpVersion, statusCode, statusMessage }
  }
}

function computeRedirectableAverageTimings (results) {
  checkStatusCodes()
  const resultsByURL = collectResults()
  const durationsByURL = collectAverageDurations()
  return createAverageResult()

  function checkStatusCodes () {
    let firstStatusCode
    for (const { statusCode } of results) {
      if (isRedirect(statusCode)) continue
      if (firstStatusCode === undefined) {
        firstStatusCode = statusCode
      } else {
        if (firstStatusCode !== statusCode) {
          throw new Error(`Status code of the first request was ${firstStatusCode}, but ${statusCode} was received later.`)
        }
      }
    }
  }

  function collectResults () {
    const resultsByURL = {}
    for (const result of results) {
      const { url } = result
      const results = resultsByURL[url] || (resultsByURL[url] = [])
      results.push(result)
    }
    return resultsByURL
  }

  function collectAverageDurations () {
    const durationsByURL = {}
    for (const url in resultsByURL) {
      const timings = resultsByURL[url].map(({ timings }) => timings)
      durationsByURL[url] = computeAverageDurations(timings)
    }
    return durationsByURL
  }

  function createAverageResult () {
    const results = []
    for (const url in resultsByURL) {
      const result = extractResult(resultsByURL[url][0])
      const timings = createTimingsFromDurations(durationsByURL[url])
      results.push({ ...result, timings })
    }
    return results

    function extractResult ({ url, httpVersion, statusCode, statusMessage }) {
      return { url, httpVersion, statusCode, statusMessage }
    }
  }
}
