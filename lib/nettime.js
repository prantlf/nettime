import { writeFile } from 'fs'
import http from 'http'
import https from 'https'
import http2 from 'http2'
import { EOL } from 'os'
import { URL } from 'url'
import { getDuration, getMilliseconds } from './timings.js'

export async function nettime (options) {
  if (typeof options === 'string') {
    options = { url: options }
  }
  const { requestCount, requestDelay, followRedirects } = options
  const results = []
  if (requestCount > 1) {
    for (let i = 0; i < requestCount; ++i) {
      await makeRedirectableRequest()
      if (requestDelay) {
        await wait(requestDelay)
      }
      options.appendToOutput = true
    }
    return results
  }
  await makeRedirectableRequest()
  return followRedirects ? results : results[0]

  async function makeRedirectableRequest () {
    const { url: originalUrl } = options
    for (;;) {
      const { url } = options
      const result = await makeSingleRequest(options)
      if (followRedirects) {
        result.url = url
      }
      results.push(result)
      if (!(followRedirects && isRedirect(result.statusCode))) break
    }
    options.url = originalUrl
  }
}

function wait (milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function makeSingleRequest (options) {
  return new Promise((resolve, reject) => {
    const timings = {}
    const { outputFile, returnResponse, includeHeaders } = options
    let data = (outputFile || returnResponse) && Buffer.from([])
    let response

    function returnResult () {
      const result = { timings }
      if (response) {
        const { statusCode, headers } = response
        result.httpVersion = response.httpVersion
        result.statusCode = statusCode
        result.statusMessage = response.statusMessage
        if (includeHeaders) {
          result.headers = headers
        }
        // Prepare the next request
        if (isRedirect(statusCode)) {
          options.url = headers.location
        }
      }
      if (returnResponse && data) {
        result.response = data
      }
      resolve(result)
    }

    function writeOutputFile () {
      if (includeHeaders && response) {
        prependOutputHeader()
      }
      const flag = options.appendToOutput ? 'a' : 'w'
      return new Promise(resolve =>
        writeFile(outputFile, data, { flag }, error => {
          if (error) {
            if (options.failOnOutputFileError === false) {
              console.error(error.message)
              process.exitCode = 2
            } else {
              return reject(error)
            }
          }
          resolve()
        }))

      function prependOutputHeader () {
        const prolog = [`HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}`]
        const headers = response.headers
        if (headers) {
          const allHeaders = Object
            .keys(headers)
            .map(key => `${key}: ${headers[key]}`)
          Array.prototype.push.apply(prolog, allHeaders)
        }
        prolog.push(EOL)
        data = Buffer.concat([Buffer.from(prolog.join(EOL)), data])
      }
    }

    let firstByte
    function checkFirstByte () {
      if (!firstByte) {
        timings.firstByte = getTiming()
        firstByte = true
      }
    }

    let socketClosed
    function checkSocketClosed () {
      if (!socketClosed) {
        timings.socketClose = getTiming()
        if (outputFile && data) {
          writeOutputFile().then(returnResult)
        } else returnResult()
      }
    }

    function listenToSocket (socket) {
      timings.socketOpen = getTiming()
      socket
        .on('lookup', () => (timings.dnsLookup = getTiming()))
        .on('connect', () => (timings.tcpConnection = getTiming()))
        .on('secureConnect', () => (timings.tlsHandshake = getTiming()))
        .on('close', checkSocketClosed)
    }

    function listenToResponse (response) {
      response
        .on('readable', () => {
          checkFirstByte()
          const chunk = response.read()
          if (data && chunk !== null) {
            data = Buffer.concat([data, Buffer.from(chunk)])
          }
        })
        .on('end', () => (timings.contentTransfer = getTiming()))
    }

    const parameters = getParameters()
    const { httpVersion } = options
    const { protocol: scheme } = parameters
    let protocol
    if (httpVersion === '2.0') {
      if (scheme !== 'https:') {
        const error = new Error('HTTP/2 supports only the "https:" protocol.')
        error.code = 'ERR_INSECURE_SCHEME'
        throw error
      }
      protocol = http2
    } else {
      protocol = scheme === 'http:' ? http : https
    }

    const start = process.hrtime()

    const request = httpVersion === '2.0' ? makeHTTP2Request() : makeHTTP1Request()

    const timeout = options.timeout
    let timeoutHandler
    if (timeout) {
      request
        // Stopped working in Node.js 10. Added global setTimeout temporarily.
        /* c8 ignore next 16 */
        .on('timeout', () => {
          if (timeoutHandler) {
            clearTimeout(timeoutHandler)
          }
          request.abort()
          const error = new Error('Connection timed out.')
          error.code = 'ETIMEDOUT'
          reject(error)
        })
        .on('abort', () => {
          if (timeoutHandler) {
            const error = new Error('Connection timed out.')
            error.code = 'ETIMEDOUT'
            reject(error)
          }
        })
        .setTimeout(timeout)
    }

    const inputData = options.data
    if (inputData) {
      request.write(inputData)
    }
    request.end()

    // Workaround for Node.js 10+, which does not abort the connection attempt
    // any more, if it takes longer than the specified timeout. The local abort
    // handler will convert the abortion to a timeout in this case.
    if (timeout) {
      timeoutHandler = setTimeout(() => request.abort(), timeout)
    }

    function getParameters () {
      const { url, data, rejectUnauthorized, credentials } = options
      const headers = options.headers || {}
      const parameters = parseURL()
      setSecurity()
      setCredentials()
      setContentType()
      return parameters

      function parseURL () {
        const {
          protocol, username, password, host, hostname, port, pathname, search
        } = new URL(url)
        const auth = username
          ? password
              ? `${username}.${password}`
              : username
          : undefined
        const path = pathname ? pathname + search : undefined
        const method = options.method || (data ? 'POST' : 'GET')
        const agent = false
        return {
          protocol,
          username,
          password,
          auth,
          host,
          hostname,
          port,
          pathname,
          search,
          path,
          headers,
          method,
          agent
        }
      }

      function setSecurity () {
        if (rejectUnauthorized !== undefined) {
          parameters.rejectUnauthorized = rejectUnauthorized
        }
      }

      function setCredentials () {
        if (credentials) {
          const token = Buffer
            .from(`${credentials.username}:${credentials.password}`)
            .toString('base64')
          headers.authorization = `Basic ${token}`
        }
      }

      function setContentType () {
        if (data) {
          if (!headers['content-type']) {
            headers['content-type'] = 'application/x-www-form-urlencoded'
          }
          headers['content-length'] = Buffer.byteLength(data)
        }
      }
    }

    function makeHTTP2Request () {
      const origin = getOrigin()
      const rejectUnauthorized = parameters.rejectUnauthorized
      const client = protocol
        .connect(origin, { rejectUnauthorized })
        .on('socketError', reject)
        .on('error', reject)
      listenToSocket(client.socket)

      const headers = parameters.headers
      headers[':method'] = parameters.method
      headers[':path'] = parameters.pathname
      const request = client
        .request(headers)
        .on('response', headers => {
          const statusCode = headers[':status']
          const statusMessage = http.STATUS_CODES[statusCode]
          response = { headers, httpVersion, statusCode, statusMessage }
        })
      listenToResponse(request)
      request
        .on('end', () => client.close(checkSocketClosed))
        .setEncoding('utf8')
      return request
    }

    function makeHTTP1Request () {
      const request = protocol
        .request(parameters, localResponse => {
          listenToResponse(response = localResponse)
          response.setEncoding('utf8')
        })
        .on('socket', listenToSocket)
        .on('error', reject)
      if (httpVersion === '1.0') {
        enforceHTTP10()
      }
      return request

      function enforceHTTP10 () {
        const storeHeader = request._storeHeader
        request._storeHeader = (firstLine, headers) => {
          firstLine = firstLine.replace(/HTTP\/1.1\r\n$/, 'HTTP/1.0\r\n')
          return storeHeader.call(request, firstLine, headers)
        }
      }
    }

    function getOrigin () {
      const { hostname, port } = parameters
      let origin = `${scheme}//${hostname}`
      if (port) {
        origin += `:${port}`
      }
      return origin
    }

    function getTiming () {
      return getDuration(start, process.hrtime())
    }
  })
}

export function isRedirect (statusCode) {
  return statusCode >= 301 && statusCode <= 308 && statusCode !== 304
}

nettime.nettime = nettime
nettime.getDuration = getDuration
nettime.getMilliseconds = getMilliseconds
nettime.isRedirect = isRedirect

export { nettime as default, getDuration, getMilliseconds }
