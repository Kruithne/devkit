# flux &middot; ![typescript](https://img.shields.io/badge/typescript-blue) ![vue](https://img.shields.io/badge/vue-4FC08D) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`flux` is a dynamic server ↔ client form system.

It provides reactive HTML form rendering from server-side schema with input validation and interface feedback.

## Usage

> [!NOTE]
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

		email: {
			type: 'email'
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

## API

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

	context?: any; // see context below

	fields: {
		shared_field_properties: {
			label?: string;
			placeholder?: string;
			required?: boolean; // defaults to true
		},

		text_field: {
			type: 'text' | 'password' | 'email'; // email automatically validates format
			min_length?: number;
			max_length?: number;
			regex?: string;
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

## Pure Form Validation

While `form_validate_req` is intended for use with an end-to-end flux setup, it supports being used for pure schema validation.

```ts
const my_schema = {
	test: {
		type: 'string',
		max_length: 10
	}
};

server.json('/api/test', (req, url, json) => {
	const validate = form_validate_req(my_schema, json);
	if (validate.error)
		return validate;

	console.log(validate.fields.test);
});

// client
fetch('/api/test', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ test: 'foo' })
});
```

## Context

The `.context` property can be used to define serializable data on the schema which will be available on the endpoint.

```ts
const form = form_create_schema({
	endpoint: '/api/submit',
	context: {
		uuid: Bun.randomUUIDv7() // 019837a5-7dd1-7000-b5c5-f5b25dffe9d1
	}
});

server.json('/api/submit', (req, url, json) => {
	const validate = form_validate_req(form, json);
	if (validate.error)
		return validate;

	console.log(json.context.uuid); // 019837a5-7dd1-7000-b5c5-f5b25dffe9d1
});
```

> [!NOTE]
> Context should be used to attach small contextual data into a form. It is not suitable for large data.

> [!CAUTION]
> Do not include sensitive data in the context and always validate the returned context within the endpoint. This data is serialized within the form but is trivial for clients to view and tamper. Consider the context data public and untrusted.

## Event Handling

The `form_component` function returns an event bus which can be used to monitor the form flow.

```ts
const test_form = form_component(app, 'my_form');
test_form.on('submit_pending', () => {});
test_form.on('submit_success', () => {});
test_form.on('submit_failure', () => {});
```

### 🟠 submit_pending

This event is fired as soon as the submit button is pressed, before any validation logic occurs. This will fire even if client-side validation will fail.

### 🟢 submit_success

This event is fired once the form has passed client-side validation, server-side validation, and everything has processed correctly.

The payload for this event is the JSON object returned from the server endpoint.

```ts
// server
server.json('/api/submit-form', (req, url, json) => {
	const validate = form_validate_req(test_form, json);
	if (validate.error)
		return validate.error;

	return { foobar: 42 };
});

// client
test_form.on('submit_success', data => {
	console.log(data.foobar); // > 42
});
```

### 🔴 submit_failure

This event is fired when an error occurs anywhere in the process between `submit_pending` and `submit_success` and will prevent `submit_success` from firing.

All errors have the `.code` property which can be used to determine the origin of the error.

```ts
test_form.on('submit_faiure', e => {
	console.log(e.code); // client_side_validation_error
});
```

Below are the possible error codes:

| Code | Reason | Parameters |
| --- | --- | --- |
| client_side_validation_error | One or more fields failed client-side validation | field_errors[] |
| http_error | Failed to send the HTTP request | status_code: number, status_text: string |
| form_error | One or more fields failed server-side validation | field_errors[] |
| generic_error | Generic exception | error: string |

In the event of both `client_side_validation_error` and `form_error`, specific field errors will be automatically propgated to the component to render a relevant error message.

## Event Flow Classes

In addition to events, a CSS class is also applied to the containing `<form>` depending on the flow state, allowing you to control the styling depending on the state.

| Class | Scenario |
| --- | --- |
| fx-state-pending | The user submits the form, before any validation occurs. |
| fx-state-error | The form is in an error state. |
| fx-state-success | The form has successfully been submitted. |

> [!NOTE]
> The fx-state-error is only applied when an error occurs during submission, not for immediate feedback field errors.

## Custom Field Error Messages

Errors in flux are configured on the server and propagated automatically to the client. The full map of errors with the default messages can be found below.

```ts
{
	generic_validation: 'There was an issue with one or more fields', // infers field errors
	generic_malformed: 'Malformed request', // user tampering or developer error
	required: 'This field is required',
	invalid_number: 'Must be a valid number',
	number_too_small: 'Must be at least {min}',
	number_too_large: 'Must be no more than {max}',
	number_range: 'Must be between {min} and {max}',
	text_too_small: 'Must be at least {min} characters',
	text_too_large: 'Must not exceed {max} characters',
	text_range: 'Must be between {min} and {max} characters',
	regex_validation: 'Invalid format',
	invalid_email: 'Please enter a valid email address'
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