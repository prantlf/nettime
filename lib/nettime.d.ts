declare interface NettimeOptions {
  url: string
  credentials?: NettimeRequestCredentials
  method?: string
  headers?: Record<string, unknown>
  timeout?: number
  followRedirects?: boolean
  rejectUnauthorized?: boolean
  requestCount?: number
  requestDelay?: number
  outputFile?: string
  returnResponse?: boolean
  includeHeaders?: boolean
  appendToOutput?: unknown
  failOnOutputFileError?: boolean
  httpVersion?: string
  data?: unknown
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
  headers?: Record<string, unknown>
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

export default function nettime(options: string | NettimeOptions): Promise<NettimeResponse>
export function nettime(options: string | NettimeOptions): Promise<NettimeResponse>
export function getDuration (start: number[], end: number[]): number[]
export function getMilliseconds (timings: number[]): number
export function isRedirect (statusCode: number): boolean
