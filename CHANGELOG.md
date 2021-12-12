# [4.0.0](https://github.com/prantlf/nettime/compare/v3.0.1...v4.0.0) (2021-12-12)


### Features

* Add TypeScript types ([6f48b4a](https://github.com/prantlf/nettime/commit/6f48b4abfe6356f4413544748b3713ca4ede2e07))
* Allow following redirects ([0736037](https://github.com/prantlf/nettime/commit/0736037e0f79c76270a0a1b48786b53da5ecd060))


### chore

* Upgrade dependencies ([5dbbff7](https://github.com/prantlf/nettime/commit/5dbbff78cd82391775b23cd8b4751696c891313f))


### BREAKING CHANGES

*   Node.js has to be upgraded to 12 or newer version.



## [3.0.1](https://github.com/prantlf/nettime/compare/v3.0.0...v3.0.1) (2021-12-12)


### Bug Fixes

* Specifying timeout made the connection fail immediately ([cad761e](https://github.com/prantlf/nettime/commit/cad761e2f5181b0f199cc923ccbe7d48eeade279))



# [3.0.0](https://github.com/prantlf/nettime/compare/v2.1.4...v3.0.0) (2019-10-19)


### Features

* Add formatting the console output as a raw JSON (format "raw") ([f2f88f8](https://github.com/prantlf/nettime/commit/f2f88f8303ea87c1fbc97577127a4a0c7372cf71))
* Allow making multiple requests and returning their average timings ([112d581](https://github.com/prantlf/nettime/commit/112d581067fd2ebc5dab8c323be821831393ffb6))


### BREAKING CHANGES

* The source code was refactored to depend on some features available first in Node.js 8. Asynchronous async/await keywords, for example.



## [2.1.4](https://github.com/prantlf/nettime/compare/v2.1.3...v2.1.4) (2019-10-18)


### Bug Fixes

* Fix typo in a keyword ([671fb7b](https://github.com/prantlf/nettime/commit/671fb7bf24d3386138e13406c196fa3f9b3048f8))



## [2.1.3](https://github.com/prantlf/nettime/compare/v2.1.2...v2.1.3) (2019-10-18)


### Bug Fixes

* Upgrade package dependencies ([c608e0a](https://github.com/prantlf/nettime/commit/c608e0add1d7bf2f398f29324b58a787f3f735fe))
* Use a global  timeout handler a workaround for the idle socket setTimeout in Node.js 10+ ([1a4481f](https://github.com/prantlf/nettime/commit/1a4481ff15b41e243185bb7c0ed7f6b7cb91698f))



## [2.1.2](https://github.com/prantlf/nettime/compare/v2.1.1...v2.1.2) (2019-10-18)


### Bug Fixes

* Fix crash on Node.js 10+ caused by consuming both readable and data events ([7c86d3b](https://github.com/prantlf/nettime/commit/7c86d3bcead098aa4a660ab0219b904d60a780d0))
* Upgrade npm dependencies ([b3132b3](https://github.com/prantlf/nettime/commit/b3132b39fe0d4b4501a76031e0339c60a9dbaa4a))



## [2.1.1](https://github.com/prantlf/nettime/compare/v2.1.0...v2.1.1) (2019-06-08)


### Bug Fixes

* Upgrade module dependencies ([d54d700](https://github.com/prantlf/nettime/commit/d54d700c13c67a1bbe51dec8429aefd55c0525c4))



# [2.1.0](https://github.com/prantlf/nettime/compare/v2.0.1...v2.1.0) (2019-03-10)


### Bug Fixes

* Upgrade package dependencies ([415fe74](https://github.com/prantlf/nettime/commit/415fe74be7416e7b9549f27a60d8d13bcef27c43))


### Features

* Add support for specifying connection timeout ([6edb361](https://github.com/prantlf/nettime/commit/6edb361e1e8ebd992bc10569d5e4d71ee4676dce))



## [2.0.1](https://github.com/prantlf/nettime/compare/v2.0.0...v2.0.1) (2018-05-19)


### Bug Fixes

* Adapt http2 connection for Node.js 8.11.2 and Node.js 10 ([1663f64](https://github.com/prantlf/nettime/commit/1663f64fb189b951d968183aa506db31a776ed59))



# [2.0.0](https://github.com/prantlf/nettime/compare/v1.1.2...v2.0.0) (2018-04-27)


### Bug Fixes

* Upgrade NPM module dependencies ([8a464e0](https://github.com/prantlf/nettime/commit/8a464e01f59d0fc0441cec0119aa75b255ae776a))


### chore

* Dropped support of Node.js 4 ([5ac3a71](https://github.com/prantlf/nettime/commit/5ac3a7109344bbb8ffd599d1dbc8500bac3e1f07))


### BREAKING CHANGES

* Dropped support of Node.js 4



## [1.1.2](https://github.com/prantlf/nettime/compare/v1.1.1...v1.1.2) (2018-03-16)


### Bug Fixes

* Upgrade package dependencies ([02a440c](https://github.com/prantlf/nettime/commit/02a440c5dac16ffda5746c2434e58979467592fe))



## [1.1.1](https://github.com/prantlf/nettime/compare/v1.1.0...v1.1.1) (2017-12-21)


### Bug Fixes

* Upgrade semantic release and other dependencies ([5c0df8a](https://github.com/prantlf/nettime/commit/5c0df8ac334520bb5113029cd441f919a74752d6))



# [1.1.0](https://github.com/prantlf/nettime/compare/v1.0.0...v1.1.0) (2017-11-11)


### Bug Fixes

* Add code "ERR_INSECURE_SCHEME" to the error if https is not used for a HTTP/2 request ([5995015](https://github.com/prantlf/nettime/commit/5995015e6de72538abdb6078ed93ad0fa1a5cb48))
* Fail by default, if the operation if writing to the output file failed ([0dbf72c](https://github.com/prantlf/nettime/commit/0dbf72c1fd2c3940e61c1723e1b0db85f4841832))
* Return response headers independently on returning response content ([9af088f](https://github.com/prantlf/nettime/commit/9af088f4f652b58de16ca95611ecfb962a02a05f))


### Features

* Support (secure only) HTTP/2 requests ([a1f7a2f](https://github.com/prantlf/nettime/commit/a1f7a2f77b5b385032e0655f76693edcc1b603a7))
* Support specifying HTTP version 1.0 in the request header ([3cb303c](https://github.com/prantlf/nettime/commit/3cb303c9d3507e387a39abd47967bcdf99316010))



# [1.0.0](https://github.com/prantlf/nettime/compare/v0.5.0...v1.0.0) (2017-11-06)


### Features

* Make command-line options compatible with curl ([33d2917](https://github.com/prantlf/nettime/commit/33d29176beff5ad886d11ae55348cce9438b8cc6))


### Performance Improvements

* Make command-line options compatible with curl ([527dfd5](https://github.com/prantlf/nettime/commit/527dfd5616708d87d8db23c126b8e275dd1752a8))


### BREAKING CHANGES

* Some command-line options:

-e, --ignore-certificate  =>  -k, --insecure
-u, --unit                =>  -t, --time-unit
-U, --user                =>  -u, --user



# [0.5.0](https://github.com/prantlf/nettime/compare/v0.4.0...v0.5.0) (2017-11-06)


### Features

* Allow sending data with the POST verb ([8a5975b](https://github.com/prantlf/nettime/commit/8a5975b105323507e30728effc9d653e473aabff))
* Allow specifying the HTTP verb on the command line ([1f055d1](https://github.com/prantlf/nettime/commit/1f055d18b2cadebc1fbd8179e1beb88e5c259421))
* Allow using the HEAD verb to show document info only ([abd440e](https://github.com/prantlf/nettime/commit/abd440e7bf0e1cedc7a6ef824238af972f168195))
* Allow writing response headers with received data to a file ([499fcc0](https://github.com/prantlf/nettime/commit/499fcc059c5554e6cea21e32b85f1bae56c7a813))
* Allow writing the received data to a file ([1fd28c2](https://github.com/prantlf/nettime/commit/1fd28c20ceee50307664874c31cd492bc9de45da))



# [0.4.0](https://github.com/prantlf/nettime/compare/v0.3.3...v0.4.0) (2017-11-06)


### Features

* Allow specifying one or multiple HTTP headers ([d5c18f8](https://github.com/prantlf/nettime/commit/d5c18f847e0abda214eba30150bb00846c12c172))
* Allow specifying username and password for Basic Authentication ([7526819](https://github.com/prantlf/nettime/commit/7526819ef954b98caac72d308bc4aad8e420e85d))



## [0.3.3](https://github.com/prantlf/nettime/compare/v0.3.2...v0.3.3) (2017-11-04)


### Bug Fixes

* Do not add seconds in nanosecond precision to avoid errors ([880bf85](https://github.com/prantlf/nettime/commit/880bf85260a1556e89124364e1c07d977510cbb7))



## [0.3.2](https://github.com/prantlf/nettime/compare/v0.3.1...v0.3.2) (2017-11-04)


### Bug Fixes

* Print both HTTP status code and message ([ac1f074](https://github.com/prantlf/nettime/commit/ac1f074d9c4558f7e2f64b2782eb448fd7fa291b))
* Use either "readable" or "data" event to catch the firstByte timing ([bacfa14](https://github.com/prantlf/nettime/commit/bacfa142e42ae7015141e5f14e10c07b8e87b231))
* Use only the "data" event to catch the firstByte timing ([f5bb930](https://github.com/prantlf/nettime/commit/f5bb9307b84402b322a0cd13ee74c2809dabb267))



## [0.3.1](https://github.com/prantlf/nettime/compare/v0.3.0...v0.3.1) (2017-10-22)


### Bug Fixes

* Remove the dependency on the module "request", which is not used any more ([b06b5f4](https://github.com/prantlf/nettime/commit/b06b5f437a46b0ff4f80769f2d60f33cb28f60cd))
* Round results of divisions instead of truncating them ([2feb8dc](https://github.com/prantlf/nettime/commit/2feb8dc65be130aa53500e99877b02e029f8adb3))



# [0.3.0](https://github.com/prantlf/nettime/compare/v0.2.0...v0.3.0) (2017-10-22)


### Bug Fixes

* Improve description of the timing type ([c4429fa](https://github.com/prantlf/nettime/commit/c4429fa3f827448b75870c13e2bdfb390ebc3bb0))


### Features

* Allow ignoring of TLS certificate errors ([e639341](https://github.com/prantlf/nettime/commit/e639341a23510b02ad60bf819f1041630a94970e))



# [0.2.0](https://github.com/prantlf/nettime/compare/v0.1.0...v0.2.0) (2017-10-21)


### Features

* Add timing for Socket Close ([b24119a](https://github.com/prantlf/nettime/commit/b24119ab9d88e8b187088bd9787a7b9716d876dc))



# 0.1.0 (2017-10-21)



