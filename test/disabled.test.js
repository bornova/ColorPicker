import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

function setupDom() {
  class FakeEvent {
    constructor(type, init = {}) {
      this.type = type
      this.bubbles = Boolean(init.bubbles)
      this.cancelable = Boolean(init.cancelable)
      this.defaultPrevented = false
      this.target = init.target ?? null
      this.currentTarget = null
      this._stopped = false
      for (const [key, value] of Object.entries(init)) {
        if (!(key in this)) {
          this[key] = value
        }
      }
    }

    preventDefault() {
      this.defaultPrevented = true
    }

    stopPropagation() {
      this._stopped = true
    }
  }

  class FakeCustomEvent extends FakeEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.detail = init.detail ?? null
    }
  }

  class FakeClassList {
    constructor(el) {
      this._el = el
      this._set = new Set()
    }

    _syncFromString(str) {
      this._set = new Set(String(str).split(/\s+/).filter(Boolean))
    }

    add(...tokens) {
      tokens.forEach((t) => t && this._set.add(t))
    }

    remove(...tokens) {
      tokens.forEach((t) => this._set.delete(t))
    }

    contains(token) {
      return this._set.has(token)
    }

    toggle(token, force) {
      if (force === undefined) {
        if (this._set.has(token)) {
          this._set.delete(token)
          return false
        }
        this._set.add(token)
        return true
      }
      if (force) {
        this._set.add(token)
        return true
      }
      this._set.delete(token)
      return false
    }

    toString() {
      return [...this._set].join(' ')
    }
  }

  class FakeNodeList extends Array {}

  class FakeElement {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase()
      this.children = []
      this.parentNode = null
      this._listeners = new Map()
      this._attributes = new Map()
      this.classList = new FakeClassList(this)
      this.style = {}
      this.value = ''
      this.checked = false
      this.disabled = false
      this.type = ''
      this.name = ''
      this.id = ''
      this._textContent = ''
      this.offsetWidth = 200
      this.offsetHeight = 150
      this.clientWidth = 1024
      this.clientHeight = 768
      this.scrollLeft = 0
      this.scrollTop = 0
      this.selectionStart = 0
      this.selectionEnd = 0
    }

    get className() {
      return this.classList.toString()
    }

    set className(val) {
      this.classList._syncFromString(val)
    }

    get textContent() {
      if (this.children.length === 0) {
        return this._textContent
      }
      return this.children.map((c) => c.textContent).join('')
    }

    set textContent(val) {
      this.children = []
      this._textContent = val == null ? '' : String(val)
    }

    get nextElementSibling() {
      if (!this.parentNode) return null
      const idx = this.parentNode.children.indexOf(this)
      return idx >= 0 && idx + 1 < this.parentNode.children.length ? this.parentNode.children[idx + 1] : null
    }

    setAttribute(name, val) {
      const str = String(val)
      this._attributes.set(name, str)
      if (name === 'id') this.id = str
      else if (name === 'class') this.className = str
      else if (name === 'type') this.type = str
      else if (name === 'name') this.name = str
      else if (name === 'value') this.value = str
      else if (name === 'disabled') this.disabled = true
    }

    getAttribute(name) {
      if (name === 'id' && this.id) return this.id
      if (name === 'disabled') return this.disabled ? '' : null
      return this._attributes.get(name) ?? null
    }

    removeAttribute(name) {
      this._attributes.delete(name)
      if (name === 'disabled') this.disabled = false
    }

    appendChild(child) {
      if (child.parentNode) {
        const prevIdx = child.parentNode.children.indexOf(child)
        if (prevIdx >= 0) child.parentNode.children.splice(prevIdx, 1)
      }
      child.parentNode = this
      this.children.push(child)
      return child
    }

    insertBefore(newNode, refNode) {
      if (!refNode) return this.appendChild(newNode)
      if (newNode.parentNode) {
        const prevIdx = newNode.parentNode.children.indexOf(newNode)
        if (prevIdx >= 0) newNode.parentNode.children.splice(prevIdx, 1)
      }
      const idx = this.children.indexOf(refNode)
      if (idx < 0) return this.appendChild(newNode)
      newNode.parentNode = this
      this.children.splice(idx, 0, newNode)
      return newNode
    }

    set innerHTML(html) {
      this.children = []
      this._textContent = ''
      parseHtmlInto(String(html), this)
    }

    addEventListener(type, fn) {
      if (!this._listeners.has(type)) {
        this._listeners.set(type, new Set())
      }
      this._listeners.get(type).add(fn)
    }

    removeEventListener(type, fn) {
      this._listeners.get(type)?.delete(fn)
    }

    dispatchEvent(event) {
      if (!event.target) {
        event.target = this
      }
      let current = this
      while (current) {
        event.currentTarget = current
        const listeners = current._listeners?.get(event.type)
        if (listeners) {
          for (const fn of [...listeners]) {
            fn.call(current, event)
          }
        }
        if (!event.bubbles || event._stopped) break
        current = current.parentNode || (current === document ? null : document)
      }
      return !event.defaultPrevented
    }

    getBoundingClientRect() {
      return { x: 0, y: 0, top: 0, left: 0, width: 200, height: 150 }
    }

    focus() {}
    select() {}
    setSelectionRange() {}

    _isDisabledState() {
      if (this.disabled) return true
      let p = this.parentNode
      while (p) {
        if (p.tagName === 'FIELDSET' && p.disabled) return true
        p = p.parentNode
      }
      return false
    }

    _matchesSingle(selector) {
      const sel = selector.trim()
      if (!sel) return false
      if (sel === '*') return true

      const parts = sel.split(/\s+/)
      if (parts.length > 1) {
        const last = parts[parts.length - 1]
        if (!this._matchesSimple(last)) return false
        let ancestor = this.parentNode
        for (let i = parts.length - 2; i >= 0; i--) {
          while (ancestor && !ancestor._matchesSimple(parts[i])) {
            ancestor = ancestor.parentNode
          }
          if (!ancestor) return false
          ancestor = ancestor.parentNode
        }
        return true
      }
      return this._matchesSimple(sel)
    }

    _matchesSimple(sel) {
      let rest = sel
      if (rest.endsWith(':disabled')) {
        if (!this._isDisabledState()) return false
        rest = rest.slice(0, -':disabled'.length)
        if (!rest) return true
      }

      const attrMatch = rest.match(/\[([^=\]]+)="([^"]*)"\]/)
      if (attrMatch) {
        const [, attr, val] = attrMatch
        const actual = attr === 'value' ? this.value : this.getAttribute(attr)
        if (actual !== val) return false
        rest = rest.replace(attrMatch[0], '')
        if (!rest) return true
      }

      if (rest.startsWith('#')) {
        return this.id === rest.slice(1)
      }
      if (rest.startsWith('.')) {
        const cls = rest.slice(1)
        return this.classList.contains(cls)
      }
      return this.tagName === rest.toUpperCase()
    }

    matches(selector) {
      return selector.split(',').some((part) => this._matchesSingle(part))
    }

    querySelector(selector) {
      for (const child of this.children) {
        if (child.matches(selector)) return child
        const found = child.querySelector(selector)
        if (found) return found
      }
      return null
    }

    querySelectorAll(selector) {
      const results = new FakeNodeList()
      for (const child of this.children) {
        if (child.matches(selector)) results.push(child)
        results.push(...child.querySelectorAll(selector))
      }
      return results
    }

    getElementsByClassName(cls) {
      return this.querySelectorAll(`.${cls}`)
    }
  }

  function parseHtmlInto(html, root) {
    const stack = [root]
    const tokenRegex = /<\/([a-zA-Z0-9-]+)>|<([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g
    let match
    const voidTags = new Set(['input', 'br', 'hr', 'img'])

    while ((match = tokenRegex.exec(html)) !== null) {
      if (match[1]) {
        if (stack.length > 1) stack.pop()
      } else if (match[2]) {
        const tag = match[2].toLowerCase()
        const attrs = match[3] || ''
        const el = new FakeElement(tag)
        const attrRegex = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g
        let am
        while ((am = attrRegex.exec(attrs)) !== null) {
          el.setAttribute(am[1], am[2] ?? '')
        }
        stack[stack.length - 1].appendChild(el)
        if (!voidTags.has(tag) && !attrs.trim().endsWith('/')) {
          stack.push(el)
        }
      } else if (match[4] && match[4].trim()) {
        stack[stack.length - 1]._textContent += match[4]
      }
    }
  }

  const documentElement = new FakeElement('html')
  const body = new FakeElement('body')
  documentElement.appendChild(body)

  const docListeners = new Map()
  const document = {
    readyState: 'complete',
    documentElement,
    body,
    _listeners: docListeners,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => documentElement.querySelector(`#${id}`),
    querySelector: (sel) => documentElement.querySelector(sel),
    querySelectorAll: (sel) => documentElement.querySelectorAll(sel),
    getElementsByClassName: (cls) => documentElement.getElementsByClassName(cls),
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set())
      docListeners.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      docListeners.get(type)?.delete(fn)
    },
    dispatchEvent(event) {
      if (!event.target) event.target = document
      event.currentTarget = document
      const listeners = docListeners.get(event.type)
      if (listeners) {
        for (const fn of [...listeners]) {
          fn.call(document, event)
        }
      }
      return !event.defaultPrevented
    }
  }

  const windowObj = {
    scrollX: 0,
    scrollY: 0,
    getComputedStyle: () => ({ marginTop: '0px', borderTopWidth: '0px', borderLeftWidth: '0px' }),
    matchMedia: () => ({ matches: false })
  }

  globalThis.Event = FakeEvent
  globalThis.CustomEvent = FakeCustomEvent
  globalThis.Element = FakeElement
  globalThis.HTMLElement = FakeElement
  globalThis.NodeList = FakeNodeList
  globalThis.document = document
  globalThis.window = windowObj

  return { FakeElement, FakeEvent }
}

const { FakeElement, FakeEvent } = setupDom()
const { init, configure, closePicker } = await import('../src/js/picker.js')

init()

function createInput(initialValue = '#ff0000', className = 'color-input') {
  const input = new FakeElement('input')
  input.type = 'text'
  input.className = className
  input.value = initialValue
  document.body.appendChild(input)
  configure({ el: input, wrap: true })
  return input
}

const flushMacrotask = () => new Promise((resolve) => setTimeout(resolve, 10))

describe('Disabled input edge cases (src/js/picker.js)', () => {
  beforeEach(() => {
    closePicker()
    document.body.children = document.body.children.filter((el) => el.id === 'clr-picker')
    configure({
      inline: false,
      format: 'hex',
      formatToggle: false,
      alpha: true,
      swatchesOnly: false,
      focusInput: false,
      selectInput: false,
      onChange: null,
      swatches: ['#ff0000', '#00ff00', '#0000ff']
    })
  })

  it('does not revert or fire input/change when Escape or closePicker(true) runs on a disabled input', async () => {
    const input = createInput('#ff0000')
    const picker = document.getElementById('clr-picker')
    const colorValue = document.getElementById('clr-color-value')

    const events = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))
    input.addEventListener('close', () => events.push('close'))

    // Open and select green while enabled
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), true)
    document.getElementById('clr-swatch-1').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(input.value, '#00ff00')

    events.length = 0
    input.disabled = true

    // Press Escape while disabled
    document.dispatchEvent(new FakeEvent('keydown', { key: 'Escape', target: colorValue }))
    await flushMacrotask()

    assert.equal(input.value, '#00ff00')
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.deepEqual(events, ['close'])

    // Repeat via direct closePicker(true) and re-enable before timeout fires
    input.disabled = false
    input.value = '#ff0000'
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    document.getElementById('clr-swatch-1').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    events.length = 0
    input.disabled = true

    closePicker(true)
    input.disabled = false
    await flushMacrotask()

    assert.equal(input.value, '#00ff00')
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.deepEqual(events, ['close'])
  })

  it('does not fire deferred change if input is disabled synchronously after closing while enabled', async () => {
    const input = createInput('#ff0000')
    let changeCount = 0
    input.addEventListener('change', () => {
      changeCount += 1
    })

    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    document.getElementById('clr-swatch-1').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    closePicker()
    input.disabled = true
    await flushMacrotask()

    assert.equal(changeCount, 0)
  })

  it('still reverts on Escape when input remains enabled', async () => {
    const input = createInput('#ff0000')
    const colorValue = document.getElementById('clr-color-value')
    const events = []
    input.addEventListener('input', () => events.push('input'))
    input.addEventListener('change', () => events.push('change'))

    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    document.getElementById('clr-swatch-1').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(input.value, '#00ff00')

    events.length = 0
    document.dispatchEvent(new FakeEvent('keydown', { key: 'Escape', target: colorValue }))
    await flushMacrotask()

    assert.equal(input.value, '#ff0000')
    assert.deepEqual(events, ['input'])
  })

  it('does not open the picker when clicking .clr-field button or input while disabled directly or via fieldset', () => {
    const input = createInput('#ff0000')
    const picker = document.getElementById('clr-picker')
    const previewButton = input.parentNode.querySelector('button')

    let openCount = 0
    let inputClickCount = 0
    input.addEventListener('open', () => {
      openCount += 1
    })
    input.addEventListener('click', () => {
      inputClickCount += 1
    })

    // Directly disabled
    input.disabled = true
    previewButton.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.equal(openCount, 0)
    assert.equal(inputClickCount, 0)

    // Direct synthetic click on disabled input
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.equal(openCount, 0)

    // Disabled via ancestor <fieldset disabled>
    input.disabled = false
    const fieldset = new FakeElement('fieldset')
    fieldset.disabled = true
    document.body.appendChild(fieldset)
    fieldset.appendChild(input.parentNode)

    previewButton.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.equal(openCount, 0)

    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), false)
    assert.equal(openCount, 0)

    // Enabled control opens via .clr-field button
    fieldset.disabled = false
    previewButton.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), true)
    assert.equal(openCount, 1)
  })

  it('prevents UI desync and delayed commit after re-enable for swatches and interactive controls', async () => {
    const input = createInput('#ff0000')
    const picker = document.getElementById('clr-picker')
    const colorValue = document.getElementById('clr-color-value')
    const colorArea = document.getElementById('clr-color-area')
    const colorMarker = document.getElementById('clr-color-marker')
    const hueSlider = document.getElementById('clr-hue-slider')
    const alphaSlider = document.getElementById('clr-alpha-slider')
    const clearButton = document.getElementById('clr-clear')

    configure({ formatToggle: true })

    let onChangeCalls = 0
    let pickEvents = 0
    let inputEvents = 0
    let changeEvents = 0
    configure({
      onChange: () => {
        onChangeCalls += 1
      }
    })
    document.addEventListener('colorpicker:pick', () => {
      pickEvents += 1
    })
    input.addEventListener('input', () => {
      inputEvents += 1
    })
    input.addEventListener('change', () => {
      changeEvents += 1
    })

    // Open on red, then disable
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(colorValue.value, '#ff0000')
    const initialHue = hueSlider.value
    const initialAlpha = alphaSlider.value
    const initialMarkerLeft = colorMarker.style.left
    const initialMarkerTop = colorMarker.style.top

    input.disabled = true

    // Click blue swatch while disabled
    document.getElementById('clr-swatch-2').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(colorValue.value, '#ff0000')
    assert.equal(input.value, '#ff0000')

    // Re-enable and close via outside pointerdown
    input.disabled = false
    document.dispatchEvent(new FakeEvent('pointerdown', { bubbles: true }))
    await flushMacrotask()

    assert.equal(input.value, '#ff0000')
    assert.equal(onChangeCalls, 0)
    assert.equal(pickEvents, 0)
    assert.equal(inputEvents, 0)
    assert.equal(changeEvents, 0)

    // Re-open on red, disable, and test all interactive controls + close with Enter
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    input.disabled = true

    // Hue & alpha sliders
    hueSlider.value = '180'
    hueSlider.dispatchEvent(new FakeEvent('input', { bubbles: true }))
    assert.equal(hueSlider.value, initialHue)

    alphaSlider.value = '50'
    alphaSlider.dispatchEvent(new FakeEvent('input', { bubbles: true }))
    assert.equal(alphaSlider.value, initialAlpha)

    // Color area click & marker keyboard movement
    colorArea.dispatchEvent(new FakeEvent('pointerdown', { bubbles: true }))
    colorArea.dispatchEvent(new FakeEvent('click', { bubbles: true, pageX: 10, pageY: 10 }))
    colorMarker.dispatchEvent(new FakeEvent('keydown', { key: 'ArrowLeft' }))
    assert.equal(colorMarker.style.left, initialMarkerLeft)
    assert.equal(colorMarker.style.top, initialMarkerTop)

    // Format toggle click
    const rgbRadio = picker.querySelector('.clr-format [value="rgb"]')
    rgbRadio.checked = true
    rgbRadio.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.querySelector('.clr-format [value="hex"]').checked, true)
    assert.equal(colorValue.value, '#ff0000')

    // Direct text input / change on colorValue
    colorValue.value = '#0000ff'
    colorValue.dispatchEvent(new FakeEvent('input', { bubbles: true }))
    assert.equal(colorValue.value, '#ff0000')
    colorValue.value = '#0000ff'
    colorValue.dispatchEvent(new FakeEvent('change', { bubbles: true }))
    assert.equal(colorValue.value, '#ff0000')

    // Clear button
    clearButton.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(picker.classList.contains('clr-open'), true)
    assert.equal(input.value, '#ff0000')

    // Re-enable and press Enter to close
    input.disabled = false
    document.dispatchEvent(new FakeEvent('keydown', { key: 'Enter', target: colorValue }))
    await flushMacrotask()

    assert.equal(picker.classList.contains('clr-open'), false)
    assert.equal(input.value, '#ff0000')
    assert.equal(onChangeCalls, 0)
    assert.equal(pickEvents, 0)
    assert.equal(inputEvents, 0)
    assert.equal(changeEvents, 0)

    // Enabled control: picking blue commits and fires change on close
    input.dispatchEvent(new FakeEvent('click', { bubbles: true }))
    document.getElementById('clr-swatch-2').dispatchEvent(new FakeEvent('click', { bubbles: true }))
    assert.equal(colorValue.value, '#0000ff')
    assert.equal(input.value, '#0000ff')
    closePicker()
    await flushMacrotask()

    assert.equal(changeEvents, 1)
    assert.equal(onChangeCalls, 1)
    assert.equal(pickEvents, 1)
  })
})
