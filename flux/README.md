# flux &middot; ![typescript](https://img.shields.io/badge/typescript-blue) ![vue](https://img.shields.io/badge/vue-4FC08D) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`flux` is a dynamic server ↔ client form system.

It provides reactive HTML form rendering from server-side schema with input validation and interface feedback.

## Usage

> ![NOTE]
> The examples below use [spooder](https://github.com/Kruithne/spooder). While this is not required, the API is built with this in mind.

Define schema on server:
```ts
const test_form = form_create_schema({
	id: 'test_form',
	fields: {
		name: {
			type: 'text',
			max: 100
		},

		age: {
			type: 'number',
			min: 18,
			max: 99
		}
	}
});
```

Render form as HTML:
```ts
server.route('/form', () => {
	return form_render_html(test_form);
});
```

Validate form in endpoint:
```ts
server.json('/api/submit-form', (req, url, json) => {
	const form = form_validate_req(test_form, json);

	if (form.error)
		return form.error;

	form.fields.name; // validation + typing
});
```

Create client-side component:
```js
import { createApp } from 'vue';
import { form_auto_components } from 'flux_client';

const state = createApp({
	components: {
		// manually define components
		component_test_form: form_component('test_form'),
		// or automatically:
		...form_auto_components()
	},

	data() {
		return {
			test: 'world'
		}
	}
}).mount('#container');
```