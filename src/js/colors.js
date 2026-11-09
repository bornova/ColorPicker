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
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      ctx = canvas.getContext('2d', { willReadFrequently: true })
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

  hue = Math.round(hue * 60)

  return {
    h: (hue + 360) % 360,
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
  if (typeof str !== 'string' || !str.trim()) {
    return { r: 0, g: 0, b: 0, a: 1 }
  }

  const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i
  const canvasCtx = getCtx()
  let normalized = str.trim()

  if (canvasCtx) {
    // Default to black for invalid color strings, then let canvas normalize the string
    canvasCtx.fillStyle = '#000'
    canvasCtx.fillStyle = str
    normalized = canvasCtx.fillStyle
  }

  const match = regex.exec(normalized)

  if (match) {
    return {
      r: Math.min(255, Math.max(0, Number(match[3]))),
      g: Math.min(255, Math.max(0, Number(match[4]))),
      b: Math.min(255, Math.max(0, Number(match[5]))),
      a: match[6] === '' ? 1 : Math.min(1, Math.max(0, Number(Number(match[6]).toFixed(2))))
    }
  }

  if (/^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
    let hex = normalized.replace('#', '')

    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('')
    }

    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? Number((parseInt(hex.slice(6, 8), 16) / 255).toFixed(2)) : 1
    }
  }

  if (canvasCtx) {
    try {
      canvasCtx.clearRect(0, 0, 1, 1)
      canvasCtx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = canvasCtx.getImageData(0, 0, 1, 1).data
      return { r, g, b, a: Number((a / 255).toFixed(2)) }
    } catch {
      // Fallback to black
    }
  }

  return { r: 0, g: 0, b: 0, a: 1 }
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
