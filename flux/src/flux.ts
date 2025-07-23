import { element } from '../../weave/src/weave';

const default_error_messages = [
	'generic_validation',
	'generic_malformed',
	'required',
	'invalid_number',
	'number_too_small',
	'number_too_large',
	'text_too_small',
	'text_too_large'
] as const;

type ErrorCode = typeof default_error_messages[number];
type ErrorMap = Partial<Record<ErrorCode, string>>;

type FormFieldBase = {
	label?: string;
	placeholder?: string;
	errors?: ErrorMap;
	required?: boolean;
};

type FormField = FormFieldBase & ({
	type: 'number';
	min?: number;
	max?: number;
} | {
	type: 'text' | 'password';
	min_length?: number;
	max_length?: number;
});

type FormSchema = {
	id: string;
	endpoint: string;
	fields: Record<string, FormField>;
	context?: any;
	errors?:ErrorMap
};

type ValidationResult = {
	error?: ErrorCode;
	field_errors?: FieldErrors;
	context?: any;	
};

type FieldError = ErrorCode | {
	err: ErrorCode;
	params: Record<string, any>;
};

type FieldErrors = Record<string, FieldError>;

export function form_create_schema(schema: FormSchema): FormSchema {
	return schema;
}

export function form_validate_req(schema: FormSchema, json: Record<string, any>): ValidationResult {
	const field_errors: FieldErrors = {};

	if (typeof json.fields !== 'object' || json.fields === null)
		return { error: 'generic_malformed' };

	for (const [field_id, field] of Object.entries(schema.fields)) {
		const uid = `${schema.id}-${field_id}`;
		const value = json.fields[uid];

		// we are considering undefined, null, or an empty (trimmed) string
		// to be a missing field. missing fields are not included in the 
		// final field list. if they are marked as .required then this
		// will raise a field error

		const field_required = field.required ?? true;
		if (value === undefined || value === null || value.trim() === '') {
			if (field_required)
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

			if (field.min_length !== undefined && str_value.length < field.min_length) {
				field_errors[uid] = { err: 'text_too_small', params: { min: field.min_length } };
				continue;
			}

			if (field.max_length !== undefined && str_value.length > field.max_length) {
				field_errors[uid] = { err: 'text_too_large', params: { max: field.max_length } };
				continue;
			}
		}
	}

	if (Object.keys(field_errors).length > 0) {
		return {
			error: 'generic_validation',
			field_errors
		};
	}

	return {
		context: json.context ? JSON.parse(atob(json.context)) : undefined
	}
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

	if (schema.context) {
		const encoded = btoa(JSON.stringify(schema.context));
		$form.child('input')
			.attr('type', 'hidden')
			.attr('id', 'fx-context')
			.attr('value', encoded);
	}

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

		if (field.type === 'number') {
			if (field.min !== undefined)
				$label.attr('fx-v-min', field.min.toString());
			
			if (field.max !== undefined)
				$label.attr('fx-v-max', field.max.toString());
		} else {
			if (field.min_length !== undefined)
				$label.attr('fx-v-min-length', field.min_length.toString());

			if (field.max_length !== undefined)
				$label.attr('fx-v-max-length', field.max_length.toString());
		}

		if (field.required)
			$label.attr('fx-v-required', field.required.toString());

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

		if (field.type !== 'number' && field.max_length !== undefined)
			$input.attr('maxlength', field.max_length.toString());

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