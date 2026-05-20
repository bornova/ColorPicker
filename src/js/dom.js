/**
 * Returns the element with the given ID.
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export function getEl(id) {
  return document.getElementById(id)
}

/**
 * Attaches an event listener to an element, with optional CSS selector delegation.
 * @param {EventTarget} context - The element to attach the listener to.
 * @param {string} type - The event type.
 * @param {string | EventListener} selector - A CSS selector for event delegation, or a direct event handler.
 * @param {EventListener} [fn] - Event handler (required when `selector` is a string).
 * @returns {void}
 */
export function addListener(context, type, selector, fn) {
  if (typeof selector === 'string') {
    context.addEventListener(type, (event) => {
      if (event.target.matches(selector)) {
        fn.call(event.target, event)
      }
    })
  } else {
    context.addEventListener(type, selector)
  }
}

/**
 * Calls `fn` immediately if the DOM is ready, otherwise defers until `DOMContentLoaded`.
 * @param {Function} fn - The function to call.
 * @param {any[]} [args] - Arguments to pass to `fn`.
 * @returns {void}
 */
export function DOMReady(fn, args = []) {
  if (document.readyState !== 'loading') {
    fn(...args)
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      fn(...args)
    })
  }
}
