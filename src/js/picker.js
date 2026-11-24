/** @import { ColorPickerOptions, Settings } from './settings.js' */
/** @import { RGBA, HSVA } from './colors.js' */
import { settings } from './settings.js'
import { HSVAtoRGBA, HSVAtoHSLA, RGBAtoHSVA, strToRGBA, RGBAToHex, RGBAToStr, HSLAToStr } from './colors.js'
import { getEl, addListener } from './dom.js'

const currentColor = { r: 0, g: 0, b: 0, h: 0, s: 0, v: 0, a: 1 }
let container,
  picker,
  colorArea,
  colorMarker,
  colorPreview,
  colorValue,
  clearButton,
  closeButton,
  hueSlider,
  hueMarker,
  alphaSlider,
  alphaMarker,
  currentEl,
  currentFormat,
  oldColor,
  initialFormatColor,
  colorAreaDims = {}

// Virtual instances cache
const instances = {}
let currentInstanceId = ''
let defaultInstance = {}

// Bound targets cache to prevent duplicate event listeners
const boundSelectors = new Set()
const boundElements = new WeakSet()

const MARKER_MOVEMENTS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

/**
 * Applies configuration options to the color picker.
 * @param {ColorPickerOptions} options
 * @returns {void}
 */
export function configure(options) {
  if (!options || typeof options !== 'object') {
    return
  }

  for (const key of Object.keys(options)) {
    switch (key) {
      case 'el':
        bindFields(options.el)

        if (options.wrap !== false && (options.wrap || settings.wrap)) {
          wrapFields(options.el)
        }

        break
      case 'parent': {
        const newContainer =
          options.parent instanceof HTMLElement
            ? options.parent
            : typeof options.parent === 'string'
              ? document.querySelector(options.parent)
              : null

        if (newContainer) {
          newContainer.appendChild(picker)
          settings.parent = options.parent

          // document.body is special
          container = newContainer === document.body ? undefined : newContainer
        }

        break
      }
      case 'themeMode':
        settings.themeMode = options.themeMode

        if (
          options.themeMode === 'auto' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          settings.themeMode = 'dark'
        }
      // falls through
      case 'theme': {
        if (options.theme) {
          settings.theme = options.theme
        }

        const isOpen = picker.classList.contains('clr-open')
        const isLeft = picker.classList.contains('clr-left')
        const isTop = picker.classList.contains('clr-top')

        // Set the theme and color scheme while preserving runtime state classes
        picker.className = `clr-picker clr-${settings.theme} clr-${settings.themeMode}`
        picker.classList.toggle('clr-open', isOpen)
        picker.classList.toggle('clr-left', isLeft)
        picker.classList.toggle('clr-top', isTop)

        // Update the color picker's position if inline mode is in use
        if (settings.inline) {
          updatePickerPosition()
        }

        break
      }
      case 'rtl':
        settings.rtl = !!options.rtl

        for (const field of document.getElementsByClassName('clr-field')) {
          field.classList.toggle('clr-rtl', settings.rtl)
        }

        break
      case 'margin': {
        const margin = Number(options.margin)

        settings.margin = !isNaN(margin) ? margin : settings.margin

        break
      }
      case 'wrap':
        settings.wrap = !!options.wrap

        if (!('el' in options) && options.wrap) {
          wrapFields(settings.el)
        }

        break
      case 'formatToggle':
        settings.formatToggle = !!options.formatToggle

        getEl('clr-format').style.display = settings.formatToggle ? 'block' : 'none'

        if (settings.formatToggle) {
          settings.format = 'auto'
        }

        break
      case 'swatches':
        if (Array.isArray(options.swatches)) {
          const swatchesContainer = getEl('clr-swatches')

          swatchesContainer.textContent = ''

          if (options.swatches.length) {
            const swatches = document.createElement('div')

            options.swatches.forEach((swatch, i) => {
              const button = document.createElement('button')

              button.setAttribute('type', 'button')
              button.setAttribute('id', `clr-swatch-${i}`)
              button.setAttribute('aria-labelledby', `clr-swatch-label clr-swatch-${i}`)
              button.style.color = swatch
              button.textContent = swatch
              swatches.appendChild(button)
            })

            swatchesContainer.appendChild(swatches)
          }

          settings.swatches = [...options.swatches]
        }

        break
      case 'swatchesOnly':
        settings.swatchesOnly = !!options.swatchesOnly
        picker.setAttribute('data-minimal', settings.swatchesOnly)
        break
      case 'alpha':
        settings.alpha = !!options.alpha
        picker.setAttribute('data-alpha', settings.alpha)
        break
      case 'inline':
        settings.inline = !!options.inline
        picker.setAttribute('data-inline', settings.inline)
        break
      case 'clearButton':
        settings.clearButton = !!options.clearButton
        clearButton.style.display = settings.clearButton ? 'block' : 'none'
        break
      case 'clearLabel':
        settings.clearLabel = options.clearLabel
        clearButton.textContent = settings.clearLabel
        break
      case 'closeButton':
        settings.closeButton = !!options.closeButton

        if (settings.closeButton) {
          picker.insertBefore(closeButton, colorPreview)
        } else {
          colorPreview.appendChild(closeButton)
        }

        break
      case 'closeLabel':
        settings.closeLabel = options.closeLabel
        closeButton.textContent = settings.closeLabel
        break
      case 'a11y': {
        const labels = options.a11y
        let update = false

        if (labels && typeof labels === 'object') {
          for (const label of Object.keys(labels)) {
            if (labels[label] && settings.a11y[label]) {
              settings.a11y[label] = labels[label]
              update = true
            }
          }
        }

        if (update) {
          const openLabel = getEl('clr-open-label')
          const swatchLabel = getEl('clr-swatch-label')
          const formatLegend = picker.querySelector('.clr-format legend')

          openLabel.textContent = settings.a11y.open
          swatchLabel.textContent = settings.a11y.swatch
          if (formatLegend) {
            formatLegend.textContent = settings.a11y.format
          }

          closeButton.setAttribute('aria-label', settings.a11y.close)
          clearButton.setAttribute('aria-label', settings.a11y.clear)
          hueSlider.setAttribute('aria-label', settings.a11y.hueSlider)
          alphaSlider.setAttribute('aria-label', settings.a11y.alphaSlider)
          colorValue.setAttribute('aria-label', settings.a11y.input)
          colorArea.setAttribute('aria-label', settings.a11y.instruction)
          updateMarkerA11yLabel(currentColor.s, currentColor.v)
        }
        break
      }
      default:
        settings[key] = options[key]
    }
  }

  if (settings.formatToggle) {
    settings.format = 'auto'
  }

  if (
    settings.inline &&
    ('inline' in options ||
      'defaultColor' in options ||
      'format' in options ||
      'formatToggle' in options ||
      'alpha' in options ||
      'forceAlpha' in options)
  ) {
    const defaultColor = options.defaultColor || settings.defaultColor

    currentFormat = getColorFormatFromStr(defaultColor)
    updatePickerPosition()
    setColorFromStr(defaultColor)
  }
}

/**
 * Registers a virtual instance that applies custom options to fields matching a CSS selector.
 * @param {string} selector - CSS selector identifying the target field(s).
 * @param {ColorPickerOptions} options - Options to apply when the picker opens for a matching field.
 * @returns {void}
 */
export function setVirtualInstance(selector, options) {
  if (typeof selector === 'string' && options && typeof options === 'object') {
    instances[selector] = options
  }
}

/**
 * Removes a previously registered virtual instance.
 * @param {string} selector - The CSS selector of the instance to remove.
 * @returns {void}
 */
export function removeVirtualInstance(selector) {
  delete instances[selector]

  if (selector === currentInstanceId) {
    resetVirtualInstance()
  }
}

/**
 * Applies the virtual instance options for the given element, if a matching instance exists.
 * @param {HTMLElement} element
 * @returns {void}
 */
function attachVirtualInstance(element) {
  if (currentInstanceId) {
    resetVirtualInstance()
  }

  // These options can only be set globally, not per instance
  const unsupportedOptions = ['el', 'wrap', 'rtl', 'inline', 'defaultColor', 'a11y']

  for (const selector of Object.keys(instances)) {
    const options = instances[selector]

    // If the element matches an instance's CSS selector
    if (element.matches(selector)) {
      currentInstanceId = selector
      defaultInstance = {}

      // Clone the options object to avoid mutating the user's config
      const clonedOptions = { ...options }

      // Delete unsupported options
      unsupportedOptions.forEach((option) => delete clonedOptions[option])

      // Back up the default options so we can restore them later
      for (const option of Object.keys(clonedOptions)) {
        defaultInstance[option] = Array.isArray(settings[option]) ? [...settings[option]] : settings[option]
        if (option === 'formatToggle' && !('format' in clonedOptions)) {
          defaultInstance.format = settings.format
        }
      }

      // Set the instance's options
      configure(clonedOptions)
      break
    }
  }
}

/**
 * Restores the default settings after a virtual instance was applied.
 * @returns {void}
 */
function resetVirtualInstance() {
  if (Object.keys(defaultInstance).length > 0) {
    configure(defaultInstance)
    currentInstanceId = ''
    defaultInstance = {}
  }
}

/**
 * Binds the color picker to one or more input fields.
 * @param {string | HTMLElement | HTMLElement[] | NodeList} selector - A CSS selector string, a single element, or a list of elements.
 * @returns {void}
 */
export function bindFields(selector) {
  const fields = selector instanceof HTMLElement ? [selector] : selector instanceof NodeList ? [...selector] : selector

  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (field instanceof HTMLElement && !boundElements.has(field)) {
        boundElements.add(field)
        addListener(field, 'click', openPicker)
        addListener(field, 'input', updateColorPreview)
      }
    })
  } else if (typeof fields === 'string' && !boundSelectors.has(fields)) {
    boundSelectors.add(fields)
    addListener(document, 'click', fields, openPicker)
    addListener(document, 'input', fields, updateColorPreview)
  }
}

/**
 * Opens the color picker for the field that triggered the event.
 * @param {Event} event
 * @returns {void}
 */
function openPicker(event) {
  // Skip if inline mode is in use
  if (settings.inline) {
    return
  }

  // Close any previously open field before opening a new one
  if (currentEl && currentEl !== event.target) {
    closePicker()
  }

  // Apply any per-instance options first
  attachVirtualInstance(event.target)

  currentEl = event.target
  oldColor = currentEl.value
  currentFormat = getColorFormatFromStr(oldColor)
  picker.classList.add('clr-open')

  updatePickerPosition()
  setColorFromStr(oldColor)
  initialFormatColor = colorValue.value

  if (settings.focusInput || settings.selectInput) {
    colorValue.focus({ preventScroll: true })
    let selectionStart = 0
    let selectionEnd = 0
    try {
      selectionStart = currentEl.selectionStart
      selectionEnd = currentEl.selectionEnd
    } catch {
      // Input type (like "color") does not support selection
    }
    colorValue.setSelectionRange(selectionStart, selectionEnd)
  }

  if (settings.selectInput) {
    colorValue.select()
  }

  // Focus the first element when using swatchesOnly
  if (settings.swatchesOnly) {
    const firstFocusable = getFocusableElements().shift()
    if (firstFocusable) {
      firstFocusable.focus()
    }
  }

  // Trigger an "open" event
  currentEl.dispatchEvent(new Event('open', { bubbles: false }))
}

/**
 * Updates the cached dimensions and document offset of the saturation/brightness color area.
 * @returns {void}
 */
function updateColorAreaDims() {
  const rect = colorArea.getBoundingClientRect()

  colorAreaDims = {
    width: rect.width || colorArea.offsetWidth,
    height: rect.height || colorArea.offsetHeight,
    x: rect.x + window.scrollX,
    y: rect.y + window.scrollY
  }
}

/**
 * Recalculates and applies the picker's position relative to the active input field.
 * @returns {void}
 */
export function updatePickerPosition() {
  if (!picker || (!currentEl && !settings.inline)) {
    return
  }

  if (!settings.inline) {
    const parent = container
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const pickerWidth = picker.offsetWidth
    const pickerHeight = picker.offsetHeight
    const reposition = { left: false, top: false }
    const coords = currentEl.getBoundingClientRect()
    let left = scrollX + coords.x
    let top = scrollY + coords.y + coords.height + settings.margin

    // If the color picker is inside a custom container
    // set the position relative to it
    if (parent) {
      const parentStyle = window.getComputedStyle(parent)
      const parentMarginTop = parseFloat(parentStyle.marginTop)
      const parentBorderTop = parseFloat(parentStyle.borderTopWidth)
      const parentBorderLeft = parseFloat(parentStyle.borderLeftWidth)
      const offset = parent.getBoundingClientRect()

      offset.x += parentBorderLeft + scrollX
      offset.y += parentBorderTop + scrollY

      left -= offset.x
      top -= offset.y

      if (left + pickerWidth > parent.clientWidth) {
        left += coords.width - pickerWidth
        reposition.left = true
      }

      if (top + pickerHeight > parent.clientHeight - parentMarginTop) {
        if (pickerHeight + settings.margin <= coords.top - (offset.y - scrollY)) {
          top -= coords.height + pickerHeight + settings.margin * 2
          reposition.top = true
        }
      }

      left += parent.scrollLeft
      top += parent.scrollTop

      // Otherwise set the position relative to the whole document
    } else {
      if (left - scrollX + pickerWidth > document.documentElement.clientWidth) {
        left += coords.width - pickerWidth
        reposition.left = true
      }

      if (top + pickerHeight - scrollY > document.documentElement.clientHeight) {
        if (pickerHeight + settings.margin <= coords.top) {
          top = scrollY + coords.y - pickerHeight - settings.margin
          reposition.top = true
        }
      }
    }

    picker.classList.toggle('clr-left', reposition.left)
    picker.classList.toggle('clr-top', reposition.top)
    picker.style.left = `${left}px`
    picker.style.top = `${top}px`
  }

  updateColorAreaDims()
}

/**
 * Wraps one or more color input fields in a `.clr-field` container with a preview button.
 * @param {string | HTMLElement | HTMLElement[] | NodeList} selector - A CSS selector string, a single element, or a list of elements.
 * @returns {void}
 */
export function wrapFields(selector) {
  const fields =
    selector instanceof HTMLElement
      ? [selector]
      : Array.isArray(selector) || selector instanceof NodeList
        ? [...selector]
        : typeof selector === 'string'
          ? [...document.querySelectorAll(selector)]
          : []

  fields.forEach(wrapColorField)
}

/**
 * Wraps a single color input field in a `.clr-field` container.
 * @param {HTMLInputElement} field
 * @returns {void}
 */
function wrapColorField(field) {
  const parentNode = field?.parentNode

  if (parentNode && parentNode.classList && !parentNode.classList.contains('clr-field')) {
    const wrapper = document.createElement('div')
    let classes = 'clr-field'

    if (settings.rtl || field.classList.contains('clr-rtl')) {
      classes += ' clr-rtl'
    }

    wrapper.innerHTML = '<button type="button" aria-labelledby="clr-open-label"></button>'
    parentNode.insertBefore(wrapper, field)
    wrapper.className = classes
    wrapper.style.color = field.value
    wrapper.appendChild(field)
  }
}

/**
 * Updates the color preview swatch on the wrapping `.clr-field` element.
 * @param {Event} event
 * @returns {void}
 */
function updateColorPreview(event) {
  const parent = event.target.parentNode

  // Only update the preview if the field has been previously wrapped
  if (parent && parent.classList && parent.classList.contains('clr-field')) {
    parent.style.color = event.target.value
  }
}

/**
 * Closes the color picker, optionally reverting the color to its pre-open value.
 * @param {boolean} [revert] - If `true`, restores the field value to what it was when the picker opened.
 * @returns {void}
 */
export function closePicker(revert) {
  if (currentEl && !settings.inline) {
    const prevEl = currentEl

    // Revert the color to the original value if needed
    if (revert) {
      // This will prevent the "change" event on the colorValue input to execute its handler
      currentEl = undefined

      if (oldColor !== prevEl.value) {
        prevEl.value = oldColor

        // Trigger an "input" event to force update the thumbnail next to the input field
        prevEl.dispatchEvent(new Event('input', { bubbles: true }))
      }
    } else {
      const value = colorValue.value
      if (value !== initialFormatColor) {
        if (value !== '') {
          setColorFromStr(value)
        }
        pickColor(value === '' ? '' : colorValue.value)
      }
    }

    // Mark the picker as closed before moving focus so blurring colorValue doesn't re-trigger change
    currentEl = undefined

    // Trigger a "change" event if needed
    setTimeout(() => {
      // Add this to the end of the event loop
      if (oldColor !== prevEl.value) {
        prevEl.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // Hide the picker dialog
    picker.classList.remove('clr-open')

    // Reset any previously set per-instance options
    resetVirtualInstance()

    // Trigger a "close" event
    prevEl.dispatchEvent(new Event('close', { bubbles: false }))

    if (settings.focusInput) {
      prevEl.focus({ preventScroll: true })
    }
  }
}

/**
 * Parses a color string and updates all picker UI elements to reflect it.
 * @param {string} str - Any valid CSS color string.
 * @returns {void}
 */
function setColorFromStr(str) {
  const rgba = strToRGBA(str)
  const hsva = RGBAtoHSVA(rgba)

  updateMarkerA11yLabel(hsva.s, hsva.v)
  updateColor(rgba, hsva)

  // Update the UI
  hueSlider.value = hsva.h
  picker.style.color = `hsl(${hsva.h}, 100%, 50%)`
  hueMarker.style.left = `${(hsva.h / 360) * 100}%`

  colorMarker.style.left = `${(colorAreaDims.width * hsva.s) / 100}px`
  colorMarker.style.top = `${colorAreaDims.height - (colorAreaDims.height * hsva.v) / 100}px`

  alphaSlider.value = hsva.a * 100
  alphaMarker.style.left = `${hsva.a * 100}%`
}

/**
 * Infers the color format (`'hex'`, `'rgb'`, or `'hsl'`) from a color string.
 * @param {string} str
 * @returns {'hex' | 'rgb' | 'hsl'}
 */
function getColorFormatFromStr(str) {
  const fmt = str.trim().slice(0, 3).toLowerCase()

  return fmt === 'rgb' || fmt === 'hsl' ? fmt : 'hex'
}

/**
 * Commits the current color to the linked input field and fires change events.
 * @param {string} [color] - The color string to commit. Defaults to the current value of the color input.
 * @returns {void}
 */
function pickColor(color) {
  if (currentEl?.matches(':disabled')) return

  color = color ?? colorValue.value
  initialFormatColor = colorValue.value

  if (currentEl) {
    currentEl.value = color
    currentEl.dispatchEvent(new Event('input', { bubbles: true }))
  }

  if (settings.onChange) {
    settings.onChange.call(window, color, currentEl)
  }

  document.dispatchEvent(new CustomEvent('colorpicker:pick', { detail: { color, currentEl } }))
}

/**
 * Derives the color at a given position in the color area and updates the picker state.
 * @param {number} x - Horizontal position in pixels relative to the color area.
 * @param {number} y - Vertical position in pixels relative to the color area.
 * @returns {void}
 */
function setColorAtPosition(x, y) {
  const hsva = {
    h: Number(hueSlider.value),
    s: (x / colorAreaDims.width) * 100,
    v: 100 - (y / colorAreaDims.height) * 100,
    a: alphaSlider.value / 100
  }
  const rgba = HSVAtoRGBA(hsva)

  updateMarkerA11yLabel(hsva.s, hsva.v)
  updateColor(rgba, hsva)
  pickColor()
}

/**
 * Updates the color marker's `aria-label` with the current saturation and brightness values.
 * @param {number} saturation - Saturation value (0–100).
 * @param {number} value - Brightness value (0–100).
 * @returns {void}
 */
function updateMarkerA11yLabel(saturation, value) {
  colorMarker.setAttribute(
    'aria-label',
    settings.a11y.marker.replace('{s}', Number(saturation.toFixed(1))).replace('{v}', Number(value.toFixed(1)))
  )
}

/**
 * Moves the color marker to the pointer position within the color area.
 * @param {PointerEvent | MouseEvent} event
 * @returns {void}
 */
function moveMarker(event) {
  setMarkerPosition(event.pageX - colorAreaDims.x, event.pageY - colorAreaDims.y)

  // Prevent scrolling while dragging the marker
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Moves the color marker by a pixel offset (used for keyboard navigation).
 * @param {number} offsetX
 * @param {number} offsetY
 * @returns {void}
 */
function moveMarkerOnKeydown(offsetX, offsetY) {
  const x = parseFloat(colorMarker.style.left) + offsetX
  const y = parseFloat(colorMarker.style.top) + offsetY

  setMarkerPosition(x, y)
}

/**
 * Positions the color marker at the given coordinates, clamped to the color area bounds.
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function setMarkerPosition(x, y) {
  // Make sure the marker doesn't go out of bounds
  x = Math.max(0, Math.min(x, colorAreaDims.width))
  y = Math.max(0, Math.min(y, colorAreaDims.height))

  // Set the position
  colorMarker.style.left = `${x}px`
  colorMarker.style.top = `${y}px`

  // Update the color
  setColorAtPosition(x, y)

  // Make sure the marker is focused
  colorMarker.focus({ preventScroll: true })
}

/**
 * Merges new RGBA/HSVA values into the current color state and refreshes all UI elements.
 * @param {Partial<RGBA>} [rgba]
 * @param {Partial<HSVA>} [hsva]
 * @returns {void}
 */
function updateColor(rgba = {}, hsva = {}) {
  let format = settings.format

  Object.assign(currentColor, rgba, hsva)

  const hex = RGBAToHex(currentColor)
  const opaqueHex = hex.substring(0, 7)

  colorMarker.style.color = opaqueHex
  alphaMarker.parentNode.style.color = opaqueHex
  alphaMarker.style.color = hex
  colorPreview.style.color = hex

  if (format === 'mixed') {
    format = currentColor.a === 1 ? 'hex' : 'rgb'
  } else if (format === 'auto') {
    format = currentFormat
  }

  switch (format) {
    case 'hex':
      colorValue.value = hex
      break
    case 'rgb':
      colorValue.value = RGBAToStr(currentColor)
      break
    case 'hsl':
      colorValue.value = HSLAToStr(HSVAtoHSLA(currentColor))
      break
  }

  // Select the current format in the format switcher
  const formatRadio = picker.querySelector(`.clr-format [value="${format}"]`)
  if (formatRadio) {
    formatRadio.checked = true
  }
}

/**
 * Handles hue slider input and updates the color accordingly.
 * @returns {void}
 */
function setHue() {
  const hue = Number(hueSlider.value)
  const x = parseFloat(colorMarker.style.left)
  const y = parseFloat(colorMarker.style.top)

  picker.style.color = `hsl(${hue}, 100%, 50%)`
  hueMarker.style.left = `${(hue / 360) * 100}%`

  setColorAtPosition(x, y)
}

/**
 * Handles alpha slider input and updates the color accordingly.
 * @returns {void}
 */
function setAlpha() {
  const alpha = alphaSlider.value / 100

  alphaMarker.style.left = `${alpha * 100}%`
  updateColor({ a: alpha })
  pickColor()
}

/**
 * Returns all visible (non-zero-width) focusable elements inside the picker.
 * @returns {HTMLElement[]}
 */
function getFocusableElements() {
  return [...picker.querySelectorAll('input, button, [tabindex]')].filter(
    (node) => !!node.offsetWidth && (node.type !== 'radio' || node.checked)
  )
}

/**
 * Creates the picker DOM, appends it to the document, and binds all event listeners.
 * @returns {void}
 */
export function init() {
  // Render the UI
  container = undefined
  picker = document.createElement('div')
  picker.setAttribute('id', 'clr-picker')
  picker.setAttribute('role', 'dialog')
  picker.className = 'clr-picker'
  picker.innerHTML = `
    <input id="clr-color-value" name="clr-color-value" class="clr-color" type="text" value="" spellcheck="false">
    <div id="clr-color-area" class="clr-gradient" role="application">
      <div id="clr-color-marker" class="clr-marker" tabindex="0"></div>
    </div>
    <div class="clr-hue">
      <input id="clr-hue-slider" name="clr-hue-slider" type="range" min="0" max="360" step="1">
      <div id="clr-hue-marker"></div>
    </div>
    <div class="clr-alpha">
      <input id="clr-alpha-slider" name="clr-alpha-slider" type="range" min="0" max="100" step="1">
      <div id="clr-alpha-marker"></div>
      <span></span>
    </div>
    <div id="clr-format" class="clr-format">
      <fieldset class="clr-segmented">
        <legend></legend>
        <input id="clr-f1" type="radio" name="clr-format" value="hex">
        <label for="clr-f1">Hex</label>
        <input id="clr-f2" type="radio" name="clr-format" value="rgb">
        <label for="clr-f2">RGB</label>
        <input id="clr-f3" type="radio" name="clr-format" value="hsl">
        <label for="clr-f3">HSL</label>
      </fieldset>
    </div>
    <div id="clr-swatches" class="clr-swatches"></div>
    <button type="button" id="clr-clear" class="clr-clear"></button>
    <div id="clr-color-preview" class="clr-preview">
      <button type="button" id="clr-close" class="clr-close"></button>
    </div>
    <span id="clr-open-label" hidden></span>
    <span id="clr-swatch-label" hidden></span>
  `

  // Append the color picker to the DOM
  document.body.appendChild(picker)

  // Reference the UI elements
  colorArea = getEl('clr-color-area')
  colorMarker = getEl('clr-color-marker')
  clearButton = getEl('clr-clear')
  closeButton = getEl('clr-close')
  colorPreview = getEl('clr-color-preview')
  colorValue = getEl('clr-color-value')
  hueSlider = getEl('clr-hue-slider')
  hueMarker = getEl('clr-hue-marker')
  alphaSlider = getEl('clr-alpha-slider')
  alphaMarker = getEl('clr-alpha-marker')

  // Populate initial labels and ARIA attributes safely
  colorValue.setAttribute('aria-label', settings.a11y.input)
  colorArea.setAttribute('aria-label', settings.a11y.instruction)
  hueSlider.setAttribute('aria-label', settings.a11y.hueSlider)
  alphaSlider.setAttribute('aria-label', settings.a11y.alphaSlider)
  clearButton.setAttribute('aria-label', settings.a11y.clear)
  clearButton.textContent = settings.clearLabel
  closeButton.setAttribute('aria-label', settings.a11y.close)
  closeButton.textContent = settings.closeLabel
  picker.querySelector('.clr-format legend').textContent = settings.a11y.format
  getEl('clr-open-label').textContent = settings.a11y.open
  getEl('clr-swatch-label').textContent = settings.a11y.swatch

  // Bind the picker to the default selector
  bindFields(settings.el)
  wrapFields(settings.el)

  addListener(picker, 'pointerdown', (event) => {
    event.stopPropagation()
  })

  addListener(colorArea, 'pointerdown', () => {
    updateColorAreaDims()
    addListener(document, 'pointermove', moveMarker)
  })

  addListener(colorArea, 'contextmenu', (event) => {
    event.preventDefault()
  })

  addListener(colorValue, 'change', () => {
    const value = colorValue.value

    if (currentEl || settings.inline) {
      if (value !== '') {
        setColorFromStr(value)
      }
      pickColor(value === '' ? '' : colorValue.value)
    }
  })

  addListener(clearButton, 'click', () => {
    pickColor('')
    closePicker()
  })

  addListener(closeButton, 'click', () => {
    pickColor()
    closePicker()
  })

  addListener(getEl('clr-format'), 'click', '.clr-format input', (event) => {
    currentFormat = event.target.value
    updateColor()
    pickColor()
  })

  addListener(picker, 'click', '.clr-swatches button', (event) => {
    setColorFromStr(event.target.textContent)
    pickColor()

    if (settings.swatchesOnly) {
      closePicker()
    }
  })

  addListener(document, 'pointerup', () => {
    document.removeEventListener('pointermove', moveMarker)
  })

  addListener(document, 'pointerdown', () => {
    closePicker()
  })

  addListener(document, 'keydown', (event) => {
    const key = event.key
    const target = event.target
    const shiftKey = event.shiftKey

    if (key === 'Escape') {
      if (currentEl) {
        closePicker(true)
      }
      return

      // Close the color picker and keep the selected color on press on Enter
    } else if (key === 'Enter' && target.tagName !== 'BUTTON') {
      if (currentEl) {
        event.preventDefault()
        closePicker()
      }
      return
    }

    // Trap the focus within the color picker while it's open
    if (key === 'Tab' && target instanceof Element && target.matches('.clr-picker *')) {
      const focusables = getFocusableElements()

      if (focusables.length > 1) {
        const firstFocusable = focusables[0]
        const lastFocusable = focusables[focusables.length - 1]

        if (shiftKey && target === firstFocusable) {
          lastFocusable.focus()
          event.preventDefault()
        } else if (!shiftKey && target === lastFocusable) {
          firstFocusable.focus()
          event.preventDefault()
        }
      } else if (focusables.length === 1) {
        event.preventDefault()
      }
    }
  })

  addListener(document, 'click', '.clr-field button', (event) => {
    // Reset any previously set per-instance options
    resetVirtualInstance()

    // Open the color picker
    event.target.nextElementSibling?.dispatchEvent(new Event('click', { bubbles: true }))
  })

  addListener(colorMarker, 'keydown', (event) => {
    if (event.key in MARKER_MOVEMENTS) {
      moveMarkerOnKeydown(...MARKER_MOVEMENTS[event.key])
      event.preventDefault()
    }
  })

  addListener(colorArea, 'click', moveMarker)
  addListener(hueSlider, 'input', setHue)
  addListener(alphaSlider, 'input', setAlpha)
}
