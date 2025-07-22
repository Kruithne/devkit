import { element } from '../../weave/src/weave';

const default_error_messages = {
	required: 'This field is required',
	invalid_number: 'Must be a valid number',
	number_too_small: 'Must be at least {min}',
	number_too_large: 'Must be no more than {max}',
	// todo: dual range error
	string_too_small: 'Must be at least {min} characters',
	string_too_large: 'Must not exceed {max} characters'
};

type ErrorCode = keyof typeof default_error_messages;
type ErrorMap = Partial<Record<ErrorCode, string>>;

type FormField = {
	type: 'text' | 'number' | 'password';
	label?: string;
	min?: number;
	max?: number;
	placeholder?: string;
	errors?: ErrorMap
};

type FormSchema = {
	id: string;
	endpoint: string;
	fields: Record<string, FormField>;
	errors?:ErrorMap
};

type ValidationResult = {
	error: string;
	field_errors: FieldErrors;
};

type FieldError = ErrorCode | {
	err: ErrorCode;
	params: Record<string, any>;
};

type FieldErrors = Record<string, FieldError>;

export function form_create_schema(schema: FormSchema): FormSchema {
	return schema;
}

export function form_validate_req(schema: FormSchema, json: Record<string, any>): ValidationResult | true {
	const field_errors: FieldErrors = {};

	for (const [field_id, field] of Object.entries(schema.fields)) {
		const uid = `${schema.id}-${field_id}`;
		const value = json[uid];

		if (value === undefined || value === null || value === '') {
			field_errors[uid] = 'required';
			continue;
		}

		if (field.type === 'number') {
			const num_value = Number(value);
			if (isNaN(num_value)) {
				field_errors[uid] = 'invalid_number';
				continue;
			}

			if (field.min !== undefined && num_value < field.min) {
				field_errors[uid] = { err: 'number_too_small', params: { min: field.min } };
				continue;
			}

			if (field.max !== undefined && num_value > field.max) {
				field_errors[uid] = { err: 'number_too_large', params: { max: field.max } };
				continue;
			}
		} else {
			const str_value = String(value).trim();

			if (field.min !== undefined && str_value.length < field.min) {
				field_errors[uid] = { err: 'string_too_small', params: { min: field.min } };
				continue;
			}

			if (field.max !== undefined && str_value.length > field.max) {
				field_errors[uid] = { err: 'string_too_large', params: { max: field.max } };
				continue;
			}
		}
	}

	if (Object.keys(field_errors).length > 0) {
		return {
			error: 'Validation failed',
			field_errors
		};
	}

	return true;
}

function add_custom_errors($form: ReturnType<typeof element>, errors?: ErrorMap, field_id?: string) {
	if (!errors)
		return;

	for (const [error_code, error_message] of Object.entries(errors)) {
		const $input = $form.child('input')
			.attr('type', 'hidden')
			.attr('data-fx-c-err', error_code)
			.attr('value', error_message);

		if (field_id !== undefined)
			$input.attr('data-fx-c-err-id', field_id);
	}
}

export function form_render_html(schema: FormSchema): string {
	const $container = element('div')
		.attr('is', `vue:component_${schema.id}`)
		.attr('id', schema.id)
		.attr('data-fx-endpoint', schema.endpoint)
		.cls('fx-form');

	const $form = $container.child('form')
		.attr('ref', 'form');

	// custom error messages
	add_custom_errors($form, schema.errors);

	let tab_index = 1;
	for (const [field_id, field] of Object.entries(schema.fields)) {
		const unique_field_id = `${schema.id}-${field_id}`;

		// custom per-field error messages
		add_custom_errors($form, field.errors, unique_field_id);

		const $label = $form.child('label')
			.attr('for', unique_field_id)
			.attr('data-fx-field-id', unique_field_id)
			.attr(':class', `{ 'fx-error': state['${unique_field_id}'].has_error }`)
			.cls('fx-field');

		if (field.min !== undefined)
			$label.attr('fx-v-min', field.min.toString());
		
		if (field.max !== undefined)
			$label.attr('fx-v-max', field.max.toString());

		if (field.label) {
			$label.child('span')
				.cls('fx-label')
				.text(field.label);
		}

		$label.child('span')
			.cls('fx-error-text')
			.attr('v-if', `state['${unique_field_id}'].has_error`)
			.text(`{{ state['${unique_field_id}'].error }}`);

		const $input = $label.child('input')
			.attr('type', field.type)
			.attr('id', unique_field_id)
			.attr('tabindex', tab_index.toString())
			.attr('@blur', `handle_field_blur('${unique_field_id}')`)
			.attr('@input', `handle_field_input('${unique_field_id}')`)
			.cls('fx-input', `fx-input-${field.type}`);

		tab_index++;

		if (field.max !== undefined)
			$input.attr('maxlength', field.max.toString());

		if (field.placeholder)
			$input.attr('placeholder', field.placeholder);
	}

	// placeholder
	const $submit = $form.child('input')
		.attr('type', 'button')
		.attr('value', 'Submit')
		.attr('@click', 'submit');

	return $container.toString();
}