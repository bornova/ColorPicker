/**
 * @typedef {Object} A11yLabels
 * @property {string} open
 * @property {string} close
 * @property {string} clear
 * @property {string} marker
 * @property {string} hueSlider
 * @property {string} alphaSlider
 * @property {string} input
 * @property {string} format
 * @property {string} swatch
 * @property {string} instruction
 */

/**
 * @typedef {Object} ColorPickerOptions
 * @property {string|HTMLElement|HTMLElement[]} [el]
 * @property {string|HTMLElement} [parent]
 * @property {string} [theme]
 * @property {'light'|'dark'|'auto'} [themeMode]
 * @property {boolean} [rtl]
 * @property {boolean} [wrap]
 * @property {number} [margin]
 * @property {'hex'|'rgb'|'hsl'|'auto'|'mixed'} [format]
 * @property {boolean} [formatToggle]
 * @property {string[]} [swatches]
 * @property {boolean} [swatchesOnly]
 * @property {boolean} [alpha]
 * @property {boolean} [forceAlpha]
 * @property {boolean} [focusInput]
 * @property {boolean} [selectInput]
 * @property {boolean} [inline]
 * @property {string} [defaultColor]
 * @property {boolean|{show: boolean, label: string}} [clearButton]
 * @property {string} [clearLabel]
 * @property {boolean} [closeButton]
 * @property {string} [closeLabel]
 * @property {function(string, HTMLElement=): void} [onChange]
 * @property {Partial<A11yLabels>} [a11y]
 */

/**
 * @typedef {Object} Settings
 * @property {string} el
 * @property {string} parent
 * @property {string} theme
 * @property {string} themeMode
 * @property {boolean} rtl
 * @property {boolean} wrap
 * @property {number} margin
 * @property {string} format
 * @property {boolean} formatToggle
 * @property {string[]} swatches
 * @property {boolean} swatchesOnly
 * @property {boolean} alpha
 * @property {boolean} forceAlpha
 * @property {boolean} focusInput
 * @property {boolean} selectInput
 * @property {boolean} inline
 * @property {string} defaultColor
 * @property {boolean} clearButton
 * @property {string} clearLabel
 * @property {boolean} closeButton
 * @property {string} closeLabel
 * @property {function(string, HTMLElement=): void} onChange
 * @property {A11yLabels} a11y
 */

/** @type {Settings} */
export const settings = {
  el: '[data-colorpicker]',
  parent: 'body',
  theme: 'default',
  themeMode: 'light',
  rtl: false,
  wrap: true,
  margin: 2,
  format: 'hex',
  formatToggle: false,
  swatches: [],
  swatchesOnly: false,
  alpha: true,
  forceAlpha: false,
  focusInput: true,
  selectInput: false,
  inline: false,
  defaultColor: '#000000',
  clearButton: false,
  clearLabel: 'Clear',
  closeButton: false,
  closeLabel: 'Close',
  onChange: () => undefined,
  a11y: {
    open: 'Open color picker',
    close: 'Close color picker',
    clear: 'Clear the selected color',
    marker: 'Saturation: {s}. Brightness: {v}.',
    hueSlider: 'Hue slider',
    alphaSlider: 'Opacity slider',
    input: 'Color value field',
    format: 'Color format',
    swatch: 'Color swatch',
    instruction: 'Saturation and brightness selector. Use up, down, left and right arrow keys to select.'
  }
}
