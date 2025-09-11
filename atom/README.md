# atom &middot; ![javascript](https://img.shields.io/badge/language-javascript-yellow) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`atom` is a tiny reactive library that provides absolutely minimal JS ⇄ DOM reactivity without a fully-fledged library.

## Features

- **📝 Text Binding** - Reactive text content with `data-text="path"`
- **🎨 Class Binding** - Conditional CSS classes with `data-class="state:className"`
- **🔗 Attribute Binding** - Dynamic HTML attributes with `data-attr-*="path"`
- **👁️ Conditional Visibility** - Show/hide elements with `data-show="condition"`
- **⌨️ Input Binding** - Two-way data binding with `data-model="path"`
- **🖱️ Event Binding** - Method calls with `data-on-*="methodName"`
- **👀 Watchers** - Side effects with `state.watch(path, callback)`
- **🔄 Computed Properties** - Reactive getters that auto-update
- **🏗️ Nested Objects** - Deep reactivity for complex state
- **📦 Tiny Size** - Minimal footprint, maximum power

## Usage

```javascript
import { atom } from './atom.js';

const state = atom({
    count: 0,
    message: 'Hello',
    isActive: false,

	// nested reactive objects
    user: { name: 'Alice', avatar: '/avatar.jpg' },

	// computed properties
    get doubled() {
		return this.count * 2;
	},

	// methods for event binding
	increment() {
		this.count++;
	},
	toggleActive() {
		this.isActive = !this.isActive;
	}
});

// set up watchers
state.watch('count', (newVal, oldVal) => {
	console.log(`Count: ${oldVal} -> ${newVal}`);
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

### Attribute Binding
```html
<img data-attr-src="user.avatar" data-attr-alt="user.name">
<a data-attr-href="navigation.url" data-attr-target="navigation.target">
<div data-attr-class="theme.className">
```

### Conditional Visibility
```html
<div data-show="isVisible">Only shown when isVisible is true</div>
<span data-show="user.isLoggedIn">Welcome back!</span>
```

### Input Binding (Two-way)
```html
<input data-model="user.name" placeholder="Enter name">
<textarea data-model="message"></textarea>
<input type="checkbox" data-model="isActive">
```

### Event Binding
```html
<button data-on-click="increment">Click me</button>
<form data-on-submit="handleSubmit">
<input data-on-keyup="handleKeyup">
```

### Watchers
```javascript
// Watch for changes to specific properties
const unwatch = state.watch('count', (newValue, oldValue) => {
    console.log(`Count changed from ${oldValue} to ${newValue}`);
});

// Unsubscribe from watching
unwatch();
```
