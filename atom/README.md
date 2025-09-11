# atom &middot; ![javascript](https://img.shields.io/badge/language-javascript-yellow) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`atom` is a tiny reactive library that provides absolutely minimal JS ⇄ DOM reactivity without a fully-fledged library.

## Usage

```javascript
import { atom } from './atom.js';

const state = atom({
    count: 0,
    message: 'Hello',
    isActive: false,
    user: { name: 'Alice' },
    get doubled() { return this.count * 2; }
});

// attach to a DOM container (optional)
state.mount('body');

// update reactive state
state.count++;
state.user.name = 'Bob';
```

### Text Binding
```html
<span data-text="count"></span>
<span data-text="user.name"></span>
<span data-text="doubled"></span>
```

### Class Binding
```html
<div data-class="isActive:active"></div>
<div data-class="isActive:active,isHighlighted:highlight"></div>
```
