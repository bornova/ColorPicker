import * as fs from 'fs'

import terser from '@rollup/plugin-terser'

fs.rmSync('dist', { recursive: true, force: true })
fs.mkdirSync('dist')
fs.copyFileSync('src/css/colorPicker.css', 'dist/colorpicker.css')

const pkg = JSON.parse(fs.readFileSync('./package.json'))
const banner = `/* ${pkg.name} v${pkg.version} */`
const input = 'src/js/index.js'

const esmConfig = {
  input,
  output: [
    {
      format: 'esm',
      file: 'dist/esm/colorpicker.js',
      plugins: [
        terser({ compress: false, mangle: false, format: { beautify: true, comments: false, preamble: banner } })
      ]
    }
  ]
}

const browserConfig = {
  input,
  output: [
    {
      format: 'iife',
      file: 'dist/browser/colorpicker.js',
      name: 'ColorPicker',
      plugins: [terser({ compress: false, mangle: false, format: { beautify: true, preamble: banner } })]
    },
    {
      format: 'iife',
      file: 'dist/browser/colorpicker.min.js',
      name: 'ColorPicker',
      plugins: [terser({ format: { preamble: banner } })],
      sourcemap: true
    }
  ]
}

export default [esmConfig, browserConfig]
