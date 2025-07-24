import { form_create_schema } from '../src/flux';
import type { FormSchema } from '../src/flux';

export const test_schemas = {
	minimal: form_create_schema({
		id: 'minimal_form',
		endpoint: '/submit',
		fields: {
			name: {
				type: 'text',
				label: 'Name',
				required: true
			}
		}
	}),

	complex: form_create_schema({
		id: 'complex_form',
		endpoint: '/submit',
		fields: {
			username: {
				type: 'text',
				label: 'Username',
				required: true,
				min_length: 3,
				max_length: 20
			},
			password: {
				type: 'password',
				label: 'Password',
				required: true,
				min_length: 8
			},
			age: {
				type: 'number',
				label: 'Age',
				required: true,
				min: 18,
				max: 100
			},
			bio: {
				type: 'text',
				label: 'Bio',
				required: false,
				max_length: 500
			}
		}
	}),

	custom_errors: form_create_schema({
		id: 'custom_errors_form',
		endpoint: '/submit',
		fields: {
			email: {
				type: 'text',
				label: 'Email',
				required: true,
				errors: {
					required: 'Email is required for registration',
					text_too_small: 'Email must be at least {min} characters'
				}
			},
			score: {
				type: 'number',
				label: 'Score',
				required: true,
				min: 0,
				max: 100,
				errors: {
					number_range: 'Score must be between {min} and {max}',
					invalid_number: 'Please enter a valid score'
				}
			}
		},
		errors: {
			generic_validation: 'Please fix the errors below',
			generic_malformed: 'Invalid form data received'
		}
	}),

	optional_fields: form_create_schema({
		id: 'optional_form',
		endpoint: '/submit',
		fields: {
			required_name: {
				type: 'text',
				label: 'Required Name',
				required: true
			},
			optional_phone: {
				type: 'text',
				label: 'Phone Number',
				required: false,
				min_length: 10
			},
			optional_count: {
				type: 'number',
				label: 'Count',
				required: false,
				min: 1
			}
		}
	}),

	context_form: form_create_schema({
		id: 'context_form',
		endpoint: '/submit',
		fields: {
			message: {
				type: 'text',
				label: 'Message',
				required: true
			}
		},
		context: {
			user_id: 123,
			session_token: 'abc123',
			preferences: {
				theme: 'dark',
				notifications: true
			}
		}
	})
};

export function create_field_uid(schema_id: string, field_id: string): string {
	return `${schema_id}-${field_id}`;
}

export function create_test_request(schema: FormSchema, field_values: Record<string, any>, context?: any): Record<string, any> {
	const fields: Record<string, any> = {};
	
	for (const [field_id, value] of Object.entries(field_values)) {
		const uid = create_field_uid(schema.id, field_id);
		fields[uid] = value;
	}

	const request: Record<string, any> = { fields };
	
	if (context || schema.context) {
		const context_data = context || schema.context;
		request.context = btoa(JSON.stringify(context_data));
	}

	return request;
}

export function create_malformed_requests(): Record<string, any>[] {
	return [
		{},
		{ fields: null },
		{ fields: undefined },
		{ fields: 'not_an_object' },
		{ fields: 123 }
	];
}

export const test_field_values = {
	valid: {
		text: 'valid text',
		long_text: 'a'.repeat(100),
		short_text: 'ab',
		password: 'password123',
		number: 42,
		zero: 0,
		negative: -5,
		decimal: 3.14,
		min_number: 18,
		max_number: 100
	},
	
	invalid: {
		empty_string: '',
		whitespace_only: '   ',
		null_value: null,
		undefined_value: undefined,
		invalid_number: 'not_a_number',
		too_small_number: 10,
		too_large_number: 150,
		too_short_text: 'a',
		too_long_text: 'a'.repeat(1000)
	}
};

export function create_validation_test_cases(schema: FormSchema) {
	const cases: Array<{
		name: string;
		request: Record<string, any>;
		should_pass: boolean;
		expected_field_errors?: string[];
	}> = [];

	for (const [field_id, field] of Object.entries(schema.fields)) {
		const uid = create_field_uid(schema.id, field_id);
		
		if (field.required !== false) {
			cases.push({
				name: `${field_id} missing (required)`,
				request: create_test_request(schema, {}),
				should_pass: false,
				expected_field_errors: [uid]
			});

			cases.push({
				name: `${field_id} empty string (required)`,
				request: create_test_request(schema, { [field_id]: '' }),
				should_pass: false,
				expected_field_errors: [uid]
			});

			cases.push({
				name: `${field_id} whitespace only (required)`,
				request: create_test_request(schema, { [field_id]: '   ' }),
				should_pass: false,
				expected_field_errors: [uid]
			});
		}

		if (field.type === 'number') {
			cases.push({
				name: `${field_id} invalid number`,
				request: create_test_request(schema, { [field_id]: 'not_a_number' }),
				should_pass: false,
				expected_field_errors: [uid]
			});

			if (field.min !== undefined) {
				cases.push({
					name: `${field_id} below minimum`,
					request: create_test_request(schema, { [field_id]: field.min - 1 }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}

			if (field.max !== undefined) {
				cases.push({
					name: `${field_id} above maximum`,
					request: create_test_request(schema, { [field_id]: field.max + 1 }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}

			if (field.min !== undefined && field.max !== undefined) {
				cases.push({
					name: `${field_id} range violation (both min and max)`,
					request: create_test_request(schema, { [field_id]: field.min - 1 }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}
		} else {
			if (field.min_length !== undefined) {
				cases.push({
					name: `${field_id} below minimum length`,
					request: create_test_request(schema, { [field_id]: 'a'.repeat(field.min_length - 1) }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}

			if (field.max_length !== undefined) {
				cases.push({
					name: `${field_id} above maximum length`,
					request: create_test_request(schema, { [field_id]: 'a'.repeat(field.max_length + 1) }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}

			if (field.min_length !== undefined && field.max_length !== undefined) {
				cases.push({
					name: `${field_id} length range violation`,
					request: create_test_request(schema, { [field_id]: 'a'.repeat(field.min_length - 1) }),
					should_pass: false,
					expected_field_errors: [uid]
				});
			}
		}
	}

	return cases;
}