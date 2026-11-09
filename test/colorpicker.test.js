import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { settings } from '../src/js/settings.js'
import { HSVAtoRGBA, HSVAtoHSLA, RGBAtoHSVA, strToRGBA, RGBAToHex, RGBAToStr, HSLAToStr } from '../src/js/colors.js'
import { configure, setVirtualInstance, removeVirtualInstance, updatePickerPosition } from '../src/js/picker.js'

describe('Color conversion utilities (src/js/colors.js)', () => {
  beforeEach(() => {
    settings.alpha = true
    settings.forceAlpha = false
  })

  it('converts HSVA to RGBA accurately across hue sectors', () => {
    assert.deepEqual(HSVAtoRGBA({ h: 0, s: 100, v: 100, a: 1 }), { r: 255, g: 0, b: 0, a: 1 })
    assert.deepEqual(HSVAtoRGBA({ h: 120, s: 100, v: 100, a: 0.5 }), { r: 0, g: 255, b: 0, a: 0.5 })
    assert.deepEqual(HSVAtoRGBA({ h: 240, s: 100, v: 100, a: 1 }), { r: 0, g: 0, b: 255, a: 1 })
    assert.deepEqual(HSVAtoRGBA({ h: 360, s: 100, v: 100, a: 1 }), { r: 255, g: 0, b: 0, a: 1 })
    assert.deepEqual(HSVAtoRGBA({ h: 0, s: 0, v: 0, a: 1 }), { r: 0, g: 0, b: 0, a: 1 })
  })

  it('round-trips HSVA -> RGBA -> HSVA without floor drift', () => {
    for (const h of [0, 1, 14, 60, 120, 180, 240, 300, 359]) {
      const rgba = HSVAtoRGBA({ h, s: 100, v: 100, a: 1 })
      const hsva = RGBAtoHSVA(rgba)
      assert.equal(hsva.h, h)
      assert.equal(hsva.s, 100)
      assert.equal(hsva.v, 100)
    }
  })

  it('converts HSVA to HSLA', () => {
    assert.deepEqual(HSVAtoHSLA({ h: 0, s: 100, v: 100, a: 1 }), { h: 0, s: 100, l: 50, a: 1 })
    assert.deepEqual(HSVAtoHSLA({ h: 180, s: 0, v: 0, a: 0.8 }), { h: 180, s: 0, l: 0, a: 0.8 })
    assert.deepEqual(HSVAtoHSLA({ h: 180, s: 0, v: 100, a: 1 }), { h: 180, s: 0, l: 100, a: 1 })
  })

  it('parses hex, rgb, and rgba strings in SSR / no-canvas fallback and rejects invalid strings', () => {
    assert.deepEqual(strToRGBA('#f00'), { r: 255, g: 0, b: 0, a: 1 })
    assert.deepEqual(strToRGBA('#0f08'), { r: 0, g: 255, b: 0, a: 0.53 })
    assert.deepEqual(strToRGBA('#5b6ef5'), { r: 91, g: 110, b: 245, a: 1 })
    assert.deepEqual(strToRGBA('#00b4d880'), { r: 0, g: 180, b: 216, a: 0.5 })
    assert.deepEqual(strToRGBA('rgb(244, 162, 97)'), { r: 244, g: 162, b: 97, a: 1 })
    assert.deepEqual(strToRGBA('rgba(0, 119, 182, 0.8)'), { r: 0, g: 119, b: 182, a: 0.8 })

    // Invalid or non-hex strings in SSR fallback should safely return opaque black without NaN
    assert.deepEqual(strToRGBA('navy'), { r: 0, g: 0, b: 0, a: 1 })
    assert.deepEqual(strToRGBA('orange'), { r: 0, g: 0, b: 0, a: 1 })
    assert.deepEqual(strToRGBA(''), { r: 0, g: 0, b: 0, a: 1 })
  })

  it('formats RGBA and HSLA strings respecting alpha and forceAlpha settings', () => {
    assert.equal(RGBAToHex({ r: 255, g: 0, b: 128, a: 1 }), '#ff0080')
    assert.equal(RGBAToHex({ r: 255, g: 0, b: 128, a: 0.5 }), '#ff008080')
    assert.equal(RGBAToStr({ r: 255, g: 0, b: 128, a: 1 }), 'rgb(255, 0, 128)')
    assert.equal(RGBAToStr({ r: 255, g: 0, b: 128, a: 0.5 }), 'rgba(255, 0, 128, 0.5)')
    assert.equal(HSLAToStr({ h: 120, s: 100, l: 50, a: 1 }), 'hsl(120, 100%, 50%)')
    assert.equal(HSLAToStr({ h: 120, s: 100, l: 50, a: 0.5 }), 'hsla(120, 100%, 50%, 0.5)')

    settings.forceAlpha = true
    assert.equal(RGBAToHex({ r: 255, g: 0, b: 128, a: 1 }), '#ff0080ff')
    assert.equal(RGBAToStr({ r: 255, g: 0, b: 128, a: 1 }), 'rgba(255, 0, 128, 1)')
    assert.equal(HSLAToStr({ h: 120, s: 100, l: 50, a: 1 }), 'hsla(120, 100%, 50%, 1)')

    settings.alpha = false
    assert.equal(RGBAToHex({ r: 255, g: 0, b: 128, a: 0.5 }), '#ff0080')
    assert.equal(RGBAToStr({ r: 255, g: 0, b: 128, a: 0.5 }), 'rgb(255, 0, 128)')
    assert.equal(HSLAToStr({ h: 120, s: 100, l: 50, a: 0.5 }), 'hsl(120, 100%, 50%)')
  })
})

describe('Picker configuration and virtual instances (src/js/picker.js)', () => {
  it('safely ignores null/non-object configuration and closed updatePickerPosition calls', () => {
    assert.doesNotThrow(() => configure(null))
    assert.doesNotThrow(() => configure(undefined))
    assert.doesNotThrow(() => setVirtualInstance('.test', null))
    assert.doesNotThrow(() => updatePickerPosition())
  })

  it('registers and removes multiple virtual instances cleanly', () => {
    setVirtualInstance('.inst-1', { format: 'rgb' })
    setVirtualInstance('.inst-2', { format: 'hsl' })
    removeVirtualInstance('.inst-1')
    removeVirtualInstance('.inst-2')
  })
})
