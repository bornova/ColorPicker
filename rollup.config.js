import * as fs from 'fs'

import terser from '@rollup/plugin-terser'

const pkg = JSON.parse(fs.readFileSync('./package.json'))
const banner = `/* ${pkg.name} v${pkg.version} */`
const input = 'src/js/index.js'

const prepareDist = () => ({
  name: 'prepare-dist',
  buildStart() {
    fs.rmSync('dist', { recursive: true, force: true })
    fs.mkdirSync('dist')
    fs.copyFileSync('src/css/colorPicker.css', 'dist/colorpicker.css')
    fs.copyFileSync('src/css/colorPicker.css', 'docs/colorpicker.css')
  }
})

const copyToDocs = (file) => ({
  name: 'copy-to-docs',
  writeBundle() {
    const filename = file.split('/').pop()
    fs.copyFileSync(file, `docs/${filename}`)
    if (fs.existsSync(`${file}.map`)) {
      fs.copyFileSync(`${file}.map`, `docs/${filename}.map`)
    }
  }
})

export default {
  input,
  plugins: [prepareDist()],
  output: [
    {
      format: 'esm',
      file: 'dist/esm/colorpicker.js',
      plugins: [
        terser({ compress: false, mangle: false, format: { beautify: true, comments: false, preamble: banner } })
      ]
    },
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
      plugins: [terser({ format: { preamble: banner } }), copyToDocs('dist/browser/colorpicker.min.js')],
      sourcemap: true
    }
  ]
}
