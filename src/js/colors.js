import { settings } from './settings.js'

/**
 * @typedef {Object} RGBA
 * @property {number} r - Red channel (0–255)
 * @property {number} g - Green channel (0–255)
 * @property {number} b - Blue channel (0–255)
 * @property {number} a - Alpha channel (0–1)
 */

/**
 * @typedef {Object} HSVA
 * @property {number} h - Hue (0–360)
 * @property {number} s - Saturation (0–100)
 * @property {number} v - Value/brightness (0–100)
 * @property {number} a - Alpha channel (0–1)
 */

/**
 * @typedef {Object} HSLA
 * @property {number} h - Hue (0–360)
 * @property {number} s - Saturation (0–100)
 * @property {number} l - Lightness (0–100)
 * @property {number} a - Alpha channel (0–1)
 */

let ctx
function getCtx() {
  if (!ctx && typeof document !== 'undefined') {
    try {
      ctx = document.createElement('canvas').getContext('2d')
    } catch {
      // Canvas is not supported or allowed
    }
  }

  return ctx
}

/**
 * Converts HSVA color values to RGBA.
 * @param {HSVA} hsva
 * @returns {RGBA}
 */
export function HSVAtoRGBA(hsva) {
  const saturation = hsva.s / 100
  const value = hsva.v / 100
  let chroma = saturation * value
  let hueBy60 = hsva.h / 60
  let x = chroma * (1 - Math.abs((hueBy60 % 2) - 1))
  let m = value - chroma

  chroma += m
  x += m

  const index = Math.floor(hueBy60) % 6
  const red = [chroma, x, m, m, x, chroma][index]
  const green = [x, chroma, chroma, x, m, m][index]
  const blue = [m, m, x, chroma, chroma, x][index]

  return {
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255),
    a: hsva.a
  }
}

/**
 * Converts HSVA color values to HSLA.
 * @param {HSVA} hsva
 * @returns {HSLA}
 */
export function HSVAtoHSLA(hsva) {
  const value = hsva.v / 100
  const lightness = value * (1 - hsva.s / 100 / 2)
  let saturation

  if (lightness > 0 && lightness < 1) {
    saturation = Math.round(((value - lightness) / Math.min(lightness, 1 - lightness)) * 100)
  }

  return {
    h: hsva.h,
    s: saturation || 0,
    l: Math.round(lightness * 100),
    a: hsva.a
  }
}

/**
 * Converts RGBA color values to HSVA.
 * @param {RGBA} rgba
 * @returns {HSVA}
 */
export function RGBAtoHSVA(rgba) {
  const red = rgba.r / 255
  const green = rgba.g / 255
  const blue = rgba.b / 255
  const xmax = Math.max(red, green, blue)
  const xmin = Math.min(red, green, blue)
  const chroma = xmax - xmin
  const value = xmax
  let hue = 0
  let saturation = 0

  if (chroma) {
    saturation = chroma / xmax

    if (xmax === red) {
      hue = (green - blue) / chroma
    } else if (xmax === green) {
      hue = 2 + (blue - red) / chroma
    } else {
      hue = 4 + (red - green) / chroma
    }
  }

  hue = Math.floor(hue * 60)

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: Math.round(saturation * 100),
    v: Math.round(value * 100),
    a: rgba.a
  }
}

/**
 * Parses any valid CSS color string and returns its RGBA components.
 * @param {string} str - Any valid CSS color string.
 * @returns {RGBA}
 */
export function strToRGBA(str) {
  const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i
  const canvasCtx = getCtx()
  let match, rgba

  if (canvasCtx) {
    // Default to black for invalid color strings
    canvasCtx.fillStyle = '#000'
    // Use canvas to convert the string to a valid color string
    canvasCtx.fillStyle = str

    match = regex.exec(canvasCtx.fillStyle)

    if (match) {
      rgba = {
        r: Number(match[3]),
        g: Number(match[4]),
        b: Number(match[5]),
        a: match[6] === '' ? 1 : Number(match[6])
      }
    } else {
      match = canvasCtx.fillStyle
        .replace('#', '')
        .match(/.{2}/g)
        .map((h) => parseInt(h, 16))

      rgba = {
        r: match[0],
        g: match[1],
        b: match[2],
        a: match[3] !== undefined ? Number((match[3] / 255).toFixed(2)) : 1
      }
    }
  } else {
    // SSR or Canvas-blocked fallback: Parse the input string directly
    match = regex.exec(str)
    if (match) {
      rgba = {
        r: Number(match[3]),
        g: Number(match[4]),
        b: Number(match[5]),
        a: match[6] === '' ? 1 : Number(match[6])
      }
    } else {
      const hex = str.replace('#', '')

      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16)
        const g = parseInt(hex[1] + hex[1], 16)
        const b = parseInt(hex[2] + hex[2], 16)
        const a = hex.length === 4 ? Number((parseInt(hex[3] + hex[3], 16) / 255).toFixed(2)) : 1

        rgba = { r, g, b, a }
      } else if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const a = hex.length === 8 ? Number((parseInt(hex.slice(6, 8), 16) / 255).toFixed(2)) : 1

        rgba = { r, g, b, a }
      } else {
        // Fallback to black for invalid inputs
        rgba = { r: 0, g: 0, b: 0, a: 1 }
      }
    }
  }

  return rgba
}

/**
 * Converts RGBA color values to a CSS hex color string.
 * @param {RGBA} rgba
 * @returns {string} Hex color string (e.g. `#rrggbb` or `#rrggbbaa`).
 */
export function RGBAToHex(rgba) {
  const R = rgba.r.toString(16).padStart(2, '0')
  const G = rgba.g.toString(16).padStart(2, '0')
  const B = rgba.b.toString(16).padStart(2, '0')
  let A = ''

  if (settings.alpha && (rgba.a < 1 || settings.forceAlpha)) {
    A = Math.round(rgba.a * 255)
      .toString(16)
      .padStart(2, '0')
  }

  return '#' + R + G + B + A
}

/**
 * Converts RGBA color values to a CSS `rgb()` or `rgba()` string.
 * @param {RGBA} rgba
 * @returns {string}
 */
export function RGBAToStr(rgba) {
  return !settings.alpha || (rgba.a === 1 && !settings.forceAlpha)
    ? `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
    : `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`
}

/**
 * Converts HSLA color values to a CSS `hsl()` or `hsla()` string.
 * @param {HSLA} hsla
 * @returns {string}
 */
export function HSLAToStr(hsla) {
  return !settings.alpha || (hsla.a === 1 && !settings.forceAlpha)
    ? `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`
    : `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a})`
}
