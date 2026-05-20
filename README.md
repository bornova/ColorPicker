# ColorPicker

A lightweight and elegant JavaScript color picker written in vanilla JavaScript. Convert any text input field into a color field.

> This project was originally a fork of [Coloris](https://github.com/mdbassit/Coloris) by [mdbassit](https://github.com/mdbassit).

[View demo](https://bornova.github.io/ColorPicker/)

## Features

- Zero dependencies
- Very easy to use
- Customizable
- Themes and dark mode
- Opacity support
- Color swatches
- Multiple color formats
- Touch support
- Fully accessible
- Works on all modern browsers

## Getting Started

### Basic usage

Download the [latest version](https://github.com/bornova/ColorPicker/releases/latest), and add the script and style to your page:

```html
<link rel="stylesheet" href="colorpicker.css" />
<script src="colorpicker.min.js"></script>
```

Or include from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/bornova/ColorPicker@latest/dist/browser/colorpicker.min.css" />
<script src="https://cdn.jsdelivr.net/gh/bornova/ColorPicker@latest/dist/browser/colorpicker.min.js"></script>
```

Or use as an ES module:

```js
import ColorPicker from '@bornova/colorpicker'
```

Then just add the `data-colorpicker` attribute to your input fields:

```html
<input type="text" data-colorpicker />
```

That's it. All done!

### Customizing the color picker

The color picker can be configured by calling `ColorPicker()` and passing an options object to it. For example, to activate dark mode and disable alpha support:

```js
ColorPicker({
  themeMode: 'dark',
  alpha: false
})
```

The new options are applied at runtime and can be updated at any time and as often as needed. For instance, to re-enable alpha support when clicking on a button:

```js
document.querySelector('#mybutton').addEventListener('click', (e) => {
  ColorPicker({
    alpha: true
  })
})
```

Here is a list of all the available options:

```js
ColorPicker({
  // The default behavior is to append the color picker's dialog to the end of the document's
  // body, but it is possible to append it to a custom parent instead. This is especially useful
  // when the color fields are in a scrollable container and you want the color picker's dialog
  // to remain anchored to them. You will need to set the CSS position of the desired container
  // to "relative" or "absolute".
  // The value of this option can be either a CSS selector or an HTMLElement.
  // Note: This should be a scrollable container with enough space to display the picker.
  parent: 'body',

  // A custom selector to bind the color picker to. This must point to HTML input fields.
  // This can also accept an HTMLElement or an array of HTMLElements instead of a CSS selector.
  el: '.color-field',

  // The bound input fields are wrapped in a div that adds a thumbnail showing the current color
  // and a button to open the color picker (for accessibility only). If you wish to keep your
  // fields unaltered, set this to false, in which case you will lose the color thumbnail and
  // the accessible button (not recommended).
  // Note: This only works if you specify a custom selector to bind the picker (option above),
  // it doesn't work on the default [data-colorpicker] attribute selector.
  wrap: true,

  // Set to true to activate basic right-to-left support.
  rtl: false,

  // Available themes: default, large, polaroid, pill (horizontal).
  theme: 'default',

  // Set the theme to light or dark mode:
  // * light: light mode (default).
  // * dark: dark mode.
  // * auto: automatically enables dark mode when the user prefers a dark color scheme.
  themeMode: 'light',

  // The margin in pixels between the input fields and the color picker's dialog.
  margin: 2,

  // Set the preferred color string format:
  // * hex: outputs #RRGGBB or #RRGGBBAA (default).
  // * rgb: outputs rgb(R, G, B) or rgba(R, G, B, A).
  // * hsl: outputs hsl(H, S, L) or hsla(H, S, L, A).
  // * auto: guesses the format from the active input field. Defaults to hex if it fails.
  // * mixed: outputs #RRGGBB when alpha is 1; otherwise rgba(R, G, B, A).
  format: 'hex',

  // Set to true to enable format toggle buttons in the color picker dialog.
  // This will also force the format option (above) to auto.
  formatToggle: false,

  // Enable or disable alpha support.
  // When disabled, it will strip the alpha value from the existing color string in all formats.
  alpha: true,

  // Set to true to always include the alpha value in the color value even if the opacity is 100%.
  forceAlpha: false,

  // Set to true to hide all the color picker widgets (spectrum, hue, ...) except the swatches.
  swatchesOnly: false,

  // Focus the color value input when the color picker dialog is opened.
  focusInput: true,

  // Select and focus the color value input when the color picker dialog is opened.
  selectInput: false,

  // Show an optional clear button.
  clearButton: false,

  // Set the label of the clear button.
  clearLabel: 'Clear',

  // Show an optional close button.
  closeButton: false,

  // Set the label of the close button.
  closeLabel: 'Close',

  // An array of the desired color swatches to display. If omitted or the array is empty,
  // the color swatches will be disabled.
  swatches: [
    '#264653',
    '#2a9d8f',
    '#e9c46a',
    'rgb(244,162,97)',
    '#e76f51',
    '#d62828',
    'navy',
    '#07b',
    '#0096c7',
    '#00b4d880',
    'rgba(0,119,182,0.8)'
  ],

  // Set to true to use the color picker as an inline widget. In this mode the color picker is
  // always visible and positioned statically within its container, which is by default the body
  // of the document. Use the "parent" option to set a custom container.
  // Note: In this mode, the best way to get the picked color is by listening to the
  // "colorpicker:pick" event (see the Events section below).
  inline: false,

  // In inline mode, this is the default color that is set when the picker is initialized.
  defaultColor: '#000000',

  // A function that is called whenever a new color is picked. The selected color and the
  // current input field are passed as arguments.
  onChange: (color, input) => undefined
})
```

### Accessibility and internationalization

Several labels are used to describe the various widgets of the color picker, which can be read aloud by a screen reader for people with low vision. If you wish to customize or translate those labels, add an `a11y` option:

```js
ColorPicker({
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
})
```

### Simulating multiple instances

Although there is only one physical instance of the color picker in the document, it is possible to simulate multiple instances, each with its own appearance and behavior, by assigning configuration overrides to a CSS selector representing one or more color fields:

```js
// Fields matching ".instance1" use a dark polaroid theme with custom swatches
ColorPicker.setInstance('.instance1', {
  theme: 'polaroid',
  themeMode: 'dark',
  alpha: false,
  formatToggle: true,
  swatches: ['#264653', '#2a9d8f', '#e9c46a']
})

// Fields matching ".instance2" show color swatches only
ColorPicker.setInstance('.instance2', {
  swatchesOnly: true,
  swatches: ['#264653', '#2a9d8f', '#e9c46a']
})
```

Any options not explicitly set by an instance will inherit the global values. Note that `el`, `wrap`, `rtl`, `inline`, `defaultColor` and `a11y` can only be set globally.

To remove a virtual instance:

```js
ColorPicker.removeInstance('.instance1')
```

### Events

All events are triggered on the last active input field that is bound to the color picker.

| Event    | Description                                               |
| -------- | --------------------------------------------------------- |
| `open`   | The color picker is opened                                |
| `close`  | The color picker is closed                                |
| `input`  | A new color is selected                                   |
| `change` | The color picker is closed and the selected color changed |

In addition, a `colorpicker:pick` event is triggered on the `document` whenever a new color is picked:

```js
document.addEventListener('colorpicker:pick', (event) => {
  console.log('New color', event.detail.color)
})
```

### Manually updating the thumbnail

The color thumbnail is updated when an `input` event is triggered on the adjacent input field. If you programmatically update the value of an input field, you may need to trigger the event manually:

```js
document.querySelector('#color-field').dispatchEvent(new Event('input', { bubbles: true }))
```

### Closing the color picker

The color picker dialog can be closed by clicking anywhere on the page or by pressing `ESC` on the keyboard. Pressing `ESC` will also revert the color to its original value.

To close the dialog programmatically:

```js
// Close the dialog
ColorPicker.close()

// Close the dialog and revert the color to its original value
ColorPicker.close(true)
```
