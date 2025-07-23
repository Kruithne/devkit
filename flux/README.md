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
	endpoint: '/api/submit-form',

	fields: {
		name: {
			type: 'text',
			max_length: 100
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
import { form_component } from 'flux_client';

const app = createApp({});
const form = form_component(app, 'test_form');

// the id provided to form_component above must match the
// id defined for the form in the server-side schema

app.mount('#container');
```

# API

```ts
// server-side
form_create_schema(schema: FormSchema): FormSchema
form_validate_req(schema: FormSchema, json: Record<string, any>): ValidationResult | true
form_render_html(schema: FormSchema): string


// client-side
form_component(app: VueApp, form_id: string): VueComponent

// server-side schema
{
	id: 'my-form', // required
	endpoint: '/api/submit-form', // required

	fields: {
		shared_field_properties: {
			label?: string;
			placeholder?: string;
			required?: boolean; // defaults to true
		},

		text_field: {
			type: 'text' | 'password';
			min_length?: number;
			max_length?: number;
		},

		number_field: {
			type: 'number';
			min?: number;
			max?: number;
		}
	},

	errors: {
		required: 'You need to enter something here!'
		// see: custom errors
	}
}
```

# Custom Errors

Errors in flux are configured on the server and propagated automatically to the client. The full map of errors with the default messages can be found below.

```ts
{
	required: 'This field is required',
	invalid_number: 'Must be a valid number',
	number_too_small: 'Must be at least {min}',
	number_too_large: 'Must be no more than {max}',
	// todo: dual range error
	text_too_small: 'Must be at least {min} characters',
	text_too_large: 'Must not exceed {max} characters'
};
```

To provide a custom error message, simply define an override in the `errors property of the form schema.

```ts
{
	id: 'my-form',
	errors: {
		invalid_number: 'Custom invalid number error message'
	}
}
```

Errors can be defined per-field as well, allowing more refined control over error messages.

```ts
{
	id: 'my-form',
	fields: {
		age: {
			type: 'number',
			min: 18,

			errors: {
				number_too_small: 'You need to be at least {min}'
			}
		}
	}
}
```