import { element } from '../../weave/src/weave';

const email_regex = /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i;

const default_error_messages = [
	'generic_validation',
	'generic_malformed',
	'required',
	'invalid_number',
	'number_too_small',
	'number_too_large',
	'number_range',
	'text_too_small',
	'text_too_large',
	'text_range',
	'regex_validation',
	'invalid_email',
	'field_match_error'
] as const;

type ErrorCode = typeof default_error_messages[number];
type ErrorMap = Partial<Record<ErrorCode, string>>;

type FormFieldBase = {
	label?: string;
	placeholder?: string;
	errors?: ErrorMap;
	required?: boolean;
	match_field?: string;
};

type FormButton = {
	text?: string;
	pending_text?: string;
};

type FormField = FormFieldBase & ({
	type: 'number';
	min?: number;
	max?: number;
} | {
	type: 'text' | 'password' | 'email';
	min_length?: number;
	max_length?: number;
	regex?: string;
});

type InferFieldType<T extends FormField> = T extends { type: 'number' } ? number : string;
type InferSchemaFields<T extends FormSchema> = {
	[K in keyof T['fields'] as T['fields'][K]['required'] extends false ? never : K]: InferFieldType<T['fields'][K]>
} & {
	[K in keyof T['fields'] as T['fields'][K]['required'] extends false ? K : never]?: InferFieldType<T['fields'][K]>
};

type DeepPartial<T> = T extends object ? {
	[P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type FormSchema<TId extends string = string, TFields extends Record<string, FormField> = Record<string, FormField>, TContext = any> = {
	id?: TId;
	endpoint?: string;
	fields: TFields;
	context?: TContext;
	errors?: ErrorMap;
	buttons?: {
		submit?: FormButton;
	};
};

type ValidationResult<T extends FormSchema> = 
	| {
		error: ErrorCode;
		field_errors: FieldErrors;
		fields?: never;
		context?: never;
	}
	| {
		error?: never;
		field_errors?: never;
		fields: InferSchemaFields<T>;
		context?: T extends FormSchema<any, any, infer C> ? DeepPartial<C> : never;
	};

type FieldError = ErrorCode | {
	err: ErrorCode;
	params: Record<string, any>;
};

type FieldErrors = Record<string, FieldError>;

export function form_create_schema<TId extends string, TFields extends Record<string, FormField>, TContext = any>(
	schema: FormSchema<TId, TFields, TContext>
): FormSchema<TId, TFields, TContext> {
	return schema;
}

export function form_validate_req<T extends FormSchema>(
	schema: T,
	json: Record<string, any>
): ValidationResult<T> {
	const field_errors: FieldErrors = {};
	const validated_fields: Record<string, any> = {};

	if (typeof json.fields !== 'object' || json.fields === null)
		return { 
			error: 'generic_malformed',
			field_errors: {}
		};

	for (const [field_id, field] of Object.entries(schema.fields)) {
		const uid = schema.id ? `${schema.id}-${field_id}` : field_id;
		const value = json.fields[uid];

		// we are considering undefined, null, or an empty (trimmed) string
		// to be a missing field. missing fields are not included in the 
		// final field list. if they are marked as .required then this
		// will raise a field error

		const field_required = field.required ?? true;
		if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
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

			let min_error = field.min !== undefined && num_value < field.min;
			let max_error = field.max !== undefined && num_value > field.max;

			if (min_error && max_error) {
				field_errors[uid] = { err: 'number_range', params: { min: field.min, max: field.max } };
				continue;
			} else {
				if (min_error) {
					field_errors[uid] = { err: 'number_too_small', params: { min: field.min } };
					continue;
				}

				if (max_error) {
					field_errors[uid] = { err: 'number_too_large', params: { max: field.max } };
					continue;
				}
			}

			validated_fields[field_id] = num_value;
		} else {
			const str_value = String(value).trim();

			let min_error = field.min_length !== undefined && str_value.length < field.min_length;
			let max_error = field.max_length !== undefined && str_value.length > field.max_length;

			if (min_error && max_error) {
				field_errors[uid] = { err: 'text_range', params: { min: field.min_length, max: field.max_length } };
				continue;
			} else {
				if (min_error) {
					field_errors[uid] = { err: 'text_too_small', params: { min: field.min_length } };
					continue;
				}

				if (max_error) {
					field_errors[uid] = { err: 'text_too_large', params: { max: field.max_length } };
					continue;
				}
			}

			if (field.type === 'email') {
				if (!email_regex.test(str_value)) {
					field_errors[uid] = 'invalid_email';
					continue;
				}
			}

			if (field.regex !== undefined) {
				const regex = new RegExp(field.regex);
				if (!regex.test(str_value)) {
					field_errors[uid] = 'regex_validation';
					continue;
				}
			}

			validated_fields[field_id] = str_value;
		}
	}

	// match_field validation
	for (const [field_id, field] of Object.entries(schema.fields)) {
		if (!field.match_field)
			continue;

		const uid = schema.id ? `${schema.id}-${field_id}` : field_id;
		const target_uid = schema.id ? `${schema.id}-${field.match_field}` : field.match_field;

		// skip if either field already has errors or is missing
		if (field_errors[uid] || field_errors[target_uid] || !(field_id in validated_fields) || !(field.match_field in validated_fields))
			continue;

		if (validated_fields[field_id] !== validated_fields[field.match_field]) {
			field_errors[uid] = 'field_match_error';
			field_errors[target_uid] = 'field_match_error';
		}
	}

	if (Object.keys(field_errors).length > 0) {
		return {
			error: 'generic_validation',
			field_errors
		};
	}

	return {
		fields: validated_fields as InferSchemaFields<T>,
		context: json.context ? JSON.parse(atob(json.context)) : undefined
	};
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
	if (schema.endpoint === undefined)
		throw new Error('endpoint is required for form generation');
	
	if (schema.id === undefined)
		throw new Error('id is required for form generation');

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

			if (field.regex !== undefined)
				$label.attr('fx-v-regex', field.regex);
		}

		if (field.required !== undefined)
			$label.attr('fx-v-required', field.required.toString());

		if (field.match_field !== undefined) {
			const match_field_uid = `${schema.id}-${field.match_field}`;
			$label.attr('fx-v-match-field', match_field_uid);
		}

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
			.attr('type', field.type === 'email' ? 'text' : field.type)
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

	const submit_text = schema.buttons?.submit?.text ?? 'Submit';
	const submit_pending_text = schema.buttons?.submit?.pending_text;

	const $submit = $form.child('input')
		.attr('type', 'button')
		.attr('@click', 'submit');

	if (submit_pending_text !== undefined)
		$submit.attr(':value', `pending ? '${submit_pending_text}' : '${submit_text}'`);
	else
		$submit.attr('value', submit_text);

	return $container.toString();
}