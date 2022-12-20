import nettime, {
  nettime as nettime2, getDuration, getMilliseconds, isRedirect,
  NettimeResponse
} from '../lib/nettime.js'

const _r1: Promise<NettimeResponse> = nettime('')
const _r2: Promise<NettimeResponse> = nettime2({ url: '' })
const _d1: number = getDuration(1, 2)
const _m1: number = getMilliseconds([1])
const _i1: boolean = isRedirect(1)
