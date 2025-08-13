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
	},

	buttons: {
		submit: {
			text: 'Create Account',
			pending_text: 'Creating...'
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
		return form;

	// Custom userland validation with field-specific errors
	if (await user_is_username_taken(form.fields.name))
		return form.raise_field_error('name', 'That username is already taken');

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
form_component(app: VueApp, form_id: string): { events: EventBus, disable: () => void, enable: () => void }

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
			match_field?: string; // field name to match against
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

	buttons?: {
		submit?: {
			text?: string; // defaults to 'Submit'
			pending_text?: string; // shown while form is submitting
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

## Button Customization

You can customize the submit button text and provide alternative text to show while the form is being submitted.

```ts
const form = form_create_schema({
	id: 'my-form',
	endpoint: '/api/submit',
	
	buttons: {
		submit: {
			text: 'Register Now',           // default button text
			pending_text: 'Registering...' // text shown while submitting
		}
	},
	
	fields: {
		// ... your fields
	}
});
```

If no `buttons` configuration is provided, the submit button will display "Submit" by default. The `pending_text` is optional - if not provided, the button text will remain unchanged during form submission.

## Field Matching

The `match_field` property allows you to validate that two fields have the same value, commonly used for password confirmation or email verification.

```ts
const registration_form = form_create_schema({
	id: 'registration',
	endpoint: '/api/register',
	
	fields: {
		password: {
			type: 'password',
			label: 'Choose a strong password:',
			min_length: 8
		},
		
		password_confirm: {
			type: 'password',
			match_field: 'password',
			label: 'Re-type your password again:'
		},
		
		email: {
			type: 'email',
			label: 'Email address:'
		},
		
		email_confirm: {
			type: 'email',
			match_field: 'email',
			label: 'Confirm email address:'
		}
	}
});
```

## Event Handling

The `form_component` function returns an event bus which can be used to monitor the form flow.

```ts
const test_form = form_component(app, 'my_form');
test_form.events.on('submit_pending', () => {});
test_form.events.on('submit_success', () => {});
test_form.events.on('submit_failure', () => {});
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
test_form.events.on('submit_success', data => {
	console.log(data.foobar); // > 42
});
```

### 🔴 submit_failure

This event is fired when an error occurs anywhere in the process between `submit_pending` and `submit_success` and will prevent `submit_success` from firing.

All errors have the `.code` property which can be used to determine the origin of the error.

```ts
test_form.events.on('submit_failure', e => {
	console.log(e.code); // client_side_validation_error
});
```

Below are the possible error codes:

| Code | Reason | Parameters |
| --- | --- | --- |
| client_side_validation_error | One or more fields failed client-side validation | field_errors[] |
| http_error | Failed to send the HTTP request (auto-displays as form error) | status_code: number, status_text: string |
| form_error | One or more fields failed server-side validation | field_errors[] |
| generic_error | Generic exception (auto-displays as form error) | error: string |

**Automatic Error Display**: `http_error` and `generic_error` are automatically displayed as form-level errors using the templates:
- `http_error`: "HTTP Error {status_code}: {status_text}" (e.g., "HTTP Error 500: Internal Server Error")  
- `generic_error`: "Internal Error: {error}" (e.g., "Internal Error: Failed to fetch")

These default messages can be overridden using the form schema's `errors` property. The `submit_failure` event still fires for custom handling.

In the event of both `client_side_validation_error` and `form_error`, specific field errors will be automatically propgated to the component to render a relevant error message.

## Form Control

The `form_component` function returns an object with both the event bus and control methods for manually managing form state.

```ts
const form = form_component(app, 'register_form');

// Disable the form (prevents submission)
form.disable();

// Re-enable the form
form.enable();

// Example: disable form after successful registration
form.events.on('submit_success', () => {
	form.disable(); // Prevent further submissions
	// Redirect user or show success message
});
```

When a form is disabled:
- The `submit()` method will short-circuit and return early
- The form receives the `fx-state-disabled` CSS class for styling
- All form functionality is blocked until `enable()` is called

This is particularly useful for scenarios like user registration where you want to prevent duplicate submissions after success.

## Event Flow Classes

In addition to events, a CSS class is also applied to the containing `<form>` depending on the flow state, allowing you to control the styling depending on the state.

| Class | Scenario |
| --- | --- |
| fx-state-pending | The user submits the form, before any validation occurs. |
| fx-state-error | The form is in an error state. |
| fx-state-success | The form has successfully been submitted. |
| fx-state-disabled | The form has been manually disabled. |

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
	invalid_email: 'Please enter a valid email address',
	field_match_error: 'The fields do not match'
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

## Custom Field Errors in Endpoints

For validation logic specific to your application (like checking if a username is already taken), you can raise field-specific errors directly in your endpoints using the `raise_field_error` method:

```ts
server.json('/api/register', async (req, url, json) => {
	const form = form_validate_req(registration_form, json);
	if (form.error)
		return form;

	// Custom validation with field-specific error highlighting
	if (await user_is_username_registered(form.fields.username))
		return form.raise_field_error('username', 'That username is already taken');
	
	if (await user_is_email_registered(form.fields.email))
		return form.raise_field_error('email', 'That email address is already registered');

	// Continue with registration logic...
	return { success: true };
});
```

The `raise_field_error(field_name, message)` method:
- Automatically handles field ID generation (`schema.id-field_name`)
- Returns the proper error structure expected by the flux client
- Highlights the specific field with the custom error message
- Allows you to perform userland validation without modifying your schema

## Generic Form Errors in Endpoints

For application errors that affect the entire form (not specific fields), you can raise generic form errors using the `raise_form_error` method:

```ts
server.json('/api/register', async (req, url, json) => {
	const form = form_validate_req(registration_form, json);
	if (form.error)
		return form;

	// Generic form-level errors
	if (await system_maintenance_active())
		return form.raise_form_error('System is currently under maintenance. Please try again later.');
	
	if (await account_is_suspended(form.fields.username))
		return form.raise_form_error('Your account has been temporarily suspended');
	
	// Field-specific errors can still be used alongside form errors
	if (await user_is_username_registered(form.fields.username))
		return form.raise_field_error('username', 'That username is already taken');

	// Continue with registration logic...
	return { success: true };
});
```

The `raise_form_error(message)` method:
- Displays a generic error message above the form fields
- Renders in an unstyled `<p class="fx-form-error">` element for custom styling
- Can be used alongside field-specific errors
- Error message clears when the form is resubmitted
- Automatically sets the form to an error state with the `fx-state-error` CSS class