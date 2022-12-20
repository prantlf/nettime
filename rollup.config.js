import cleanup from 'rollup-plugin-cleanup'

export default [
  {
    input: 'lib/nettime.js',
    output: {
      file: 'lib/nettime.cjs',
      format: 'cjs',
      exports: 'named'
    },
    external: ['fs', 'http', 'http2', 'https', 'os', 'url'],
    plugins: [cleanup()]
  },
  {
    input: 'lib/printer.js',
    output: {
      file: 'lib/printer.cjs',
      format: 'cjs'
    },
    external: ['sprintf-js'],
    plugins: [cleanup()]
  },
  {
    input: 'lib/timings.js',
    output: {
      file: 'lib/timings.cjs',
      format: 'cjs'
    },
    plugins: [cleanup()]
  }
]