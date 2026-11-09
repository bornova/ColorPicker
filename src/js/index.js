/** @import { ColorPickerOptions } from './settings.js' */
import {
  configure,
  wrapFields,
  closePicker,
  setVirtualInstance,
  removeVirtualInstance,
  updatePickerPosition,
  bindFields,
  init
} from './picker.js'
import { DOMReady } from './dom.js'

/**
 * Initializes the color picker, binding it to matching fields or applying global options.
 * @param {string | ColorPickerOptions} [options] - A CSS selector string to bind matching fields, or an options object.
 * @returns {void}
 */
function ColorPicker(options) {
  DOMReady(() => {
    if (options) {
      if (typeof options === 'string') {
        bindFields(options)
      } else {
        configure(options)
      }
    }
  })
}

/** @type {(options: ColorPickerOptions) => void} */
ColorPicker.set = (...args) => DOMReady(configure, args)

/** @type {(selector: string | HTMLElement | HTMLElement[] | NodeList) => void} */
ColorPicker.wrap = (...args) => DOMReady(wrapFields, args)

/** @type {(revert?: boolean) => void} */
ColorPicker.close = (...args) => DOMReady(closePicker, args)

/** @type {(selector: string, options: ColorPickerOptions) => void} */
ColorPicker.setInstance = (...args) => DOMReady(setVirtualInstance, args)

/** @type {(selector: string) => void} */
ColorPicker.removeInstance = (...args) => DOMReady(removeVirtualInstance, args)

/** @type {() => void} */
ColorPicker.updatePosition = (...args) => DOMReady(updatePickerPosition, args)

/** @type {(fn: Function, args?: any[]) => void} */
ColorPicker.ready = DOMReady

DOMReady(init)

export default ColorPicker
