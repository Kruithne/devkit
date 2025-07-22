# weave &middot; ![typescript](https://img.shields.io/badge/language-typescript-blue) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`weave` is a simple fluent API written in TypeScript for dynamically constructing HTML.

# Usage

Compile to JS (if needed):
```bash
bunx tsc
```

On the server:
```ts
import { element } from './weave.ts';
const html = element('div').toString();
```
In the browser:
```ts
import { element } from './weave.js';

// as a string
const html = element('div').toString();

// insertAdacentHTML
$container.insertAdjacentHTML('beforeend', html);

// DOMParser
const parser = new DOMParser();
const doc = parser.parseFromString(html);
$container.appendChild(doc.body.firstChild);
```

# Example

```typescript
const page = element('html')
	.child('head')
		.child('title')
			.text('My Page')
			.attr('lang', 'en')
	.child('body')
		.style({'background-color': '#f0f0f0', 'font-family': 'Arial'})
		.child('h1')
			.text('Welcome')
			.cls('header', 'main-title')
			.style({'color': 'blue', 'font-size': '24px'})
		.child('p')
			.text('This is some content')
			.attr('id', 'content')
			.style({'margin': '10px', 'padding': '5px'})
		.child('br')
		.child('input')
			.attr('type', 'text')
			.attr('placeholder', 'Enter your name')
			.style({'border': '1px solid #ccc'});

const html = page.toString();
```

# API

## `element(tag: string)`

Creates a new HTML element with the specified tag name. Returns an element object with fluent methods for building HTML structures.

```typescript
const div = element('div');
```

## Methods

### `.child(tag: string)`

Adds a child element with the specified tag and returns the child element for further chaining.

```typescript
const div = element('div');
const paragraph = div.child('p');
```

### `.attr(key: string, value: string)`

Sets an attribute on the element and returns the element for method chaining.

```typescript
const link = element('a')
	.attr('href', 'https://example.com')
	.attr('target', '_blank');
```

### `.text(content: string)`

Sets the inner text content of the element and returns the element for method chaining.

```typescript
const paragraph = element('p')
	.text('Hello world!');
```

### `.cls(...names: string[])`

Adds one or more CSS classes to the element.

```typescript
const div = element('div')
	.cls('container', 'main', 'highlight');
```

### `.style(styles: Record<string, string>)`

Sets CSS styles on the element using a JavaScript object. The styles are applied via the `style` HTML attribute.

```typescript
const div = element('div')
	.style({'background-color': 'red', 'font-size': '16px', 'margin': '10px'});
```

### `.toString(indent?: boolean, indent_level?: number)`

Generates the HTML string representation of the element and its children. The `indent` parameter controls whether to format with indentation (defaults to true). When `indent` is false, generates compact HTML without newlines or tabs. The `indent_level` parameter is used internally for nested indentation. Automatically handles self-closing tags and combines classes properly.

```typescript
const indented_html = element('div').toString();
const compact_html = element('div').toString(false);
```