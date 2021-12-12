/* eslint-disable @typescript-eslint/no-explicit-any */

declare interface NettimeOptions {
  url: string
  credentials?: NettimeRequestCredentials
  method?: string
  headers?: object
  timeout?: number
  followRedirects?: boolean
  rejectUnauthorized?: boolean
  requestCount?: number
  requestDelay?: number
  outputFile?: string
  returnResponse?: boolean
  includeHeaders?: boolean
  appendToOutput?: any
  failOnOutputFileError?: boolean
  httpVersion?: string
  data?: any
}

declare interface NettimeRequestCredentials {
  username: string
  password: string
}

declare interface NettimeResponse {
  url?: string
  timings: NettimeTimings
  httpVersion: string
  statusCode: number
  statusMessage: string
  headers?: object
  response?: Buffer
}

declare interface NettimeTimings {
  socketOpen: number[]
  dnsLookup: number[]
  tcpConnection: number[]
  tlsHandshake: number[]
  firstByte: number[]
  contentTransfer: number[]
  socketClose: number[]
}

declare function nettime(options: string | NettimeOptions): Promise<NettimeResponse>

declare namespace nettime {
  export function getDuration (start: number, end: number): number
  export function getMilliseconds (timings: number[]): number
  export function isRedirect (statusCode: number): boolean
}

export = nettime
