import { run_test, assert, assert_equal, assert_defined, setup_dom_environment, assert_contains, assert_array_length } from '../test_api';
import { form_create_schema, form_validate_req, form_render_html } from '../../src/flux';
import { create_test_request, create_field_uid } from '../test_utils';

setup_dom_environment();

function test_large_form_with_many_fields() {
	const fields = {};
	for (let i = 0; i < 50; i++) {
		fields[`field_${i}`] = {
			type: 'text',
			label: `Field ${i}`,
			required: true,
			min_length: 2,
			max_length: 100
		};
	}

	const schema = form_create_schema({
		id: 'large_form',
		endpoint: '/submit',
		fields
	});

	const html = form_render_html(schema);
	assert_defined(html);
	assert(html.length > 1000);

	const test_data = {};
	for (let i = 0; i < 50; i++) {
		test_data[`field_${i}`] = `value_${i}`;
	}

	const request = create_test_request(schema, test_data);
	const result = form_validate_req(schema, request);

	assert(!result.error);
	assert_defined(result.fields);
	assert_array_length(Object.keys(result.fields), 50);
}

function test_nested_complex_context() {
	const complex_context = {
		user: {
			id: 12345,
			profile: {
				name: 'John Doe',
				preferences: {
					theme: 'dark',
					notifications: {
						email: true,
						push: false,
						sms: {
							enabled: true
						}
					}
				}
			}
		},
		session: {
			token: 'abc123xyz',
			expires: '2024-12-31T23:59:59Z',
			metadata: {
				ip: '192.168.1.1',
				user_agent: 'Test Browser',
				tags: ['test', 'development', 'validation']
			}
		}
	};

	const schema = form_create_schema({
		id: 'complex_context_form',
		endpoint: '/submit',
		fields: {
			message: {
				type: 'text',
				required: true
			}
		},
		context: complex_context
	});

	const html = form_render_html(schema);
	document.body.innerHTML = html;

	const context_input = document.querySelector('#fx-context');
	assert_defined(context_input);

	const decoded_context = JSON.parse(atob(context_input.value));
	assert_equal(decoded_context.user.id, 12345);
	assert_equal(decoded_context.user.profile.name, 'John Doe');
	assert_equal(decoded_context.user.profile.preferences.theme, 'dark');
	assert_array_length(decoded_context.session.metadata.tags, 3);
	assert_equal(decoded_context.session.metadata.tags[0], 'test');

	const request = create_test_request(schema, { message: 'Test' });
	const result = form_validate_req(schema, request);

	assert(!result.error);
	assert_defined(result.context);
	assert_equal(result.context.user.id, 12345);
}

function test_mixed_field_types_complex_validation() {
	const schema = form_create_schema({
		id: 'mixed_types_form',
		endpoint: '/submit',
		fields: {
			username: {
				type: 'text',
				required: true,
				min_length: 3,
				max_length: 20
			},
			password: {
				type: 'password',
				required: true,
				min_length: 8,
				max_length: 128
			},
			age: {
				type: 'number',
				required: true,
				min: 13,
				max: 120
			},
			score: {
				type: 'number',
				required: false,
				min: 0,
				max: 100
			},
			bio: {
				type: 'text',
				required: false,
				max_length: 500
			},
			confirm_password: {
				type: 'password',
				required: true,
				min_length: 8
			}
		}
	});

	const valid_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 25,
		score: 85,
		bio: 'This is a test bio',
		confirm_password: 'password123'
	});

	const result = form_validate_req(schema, valid_request);
	assert(!result.error);
	assert_defined(result.fields);
	assert_equal(result.fields.username, 'validuser');
	assert_equal(result.fields.age, 25);
	assert_equal(result.fields.score, 85);
	assert_equal(result.fields.bio, 'This is a test bio');

	const invalid_request = create_test_request(schema, {
		username: 'ab',
		password: '123',
		age: 200,
		score: 150,
		bio: 'a'.repeat(600),
		confirm_password: '123'
	});

	const invalid_result = form_validate_req(schema, invalid_request);
	assert_equal(invalid_result.error, 'generic_validation');
	assert_array_length(Object.keys(invalid_result.field_errors), 6);
}

function test_boundary_value_validation() {
	const schema = form_create_schema({
		id: 'boundary_test_form',
		endpoint: '/submit',
		fields: {
			min_text: {
				type: 'text',
				required: true,
				min_length: 5,
				max_length: 10
			},
			min_number: {
				type: 'number',
				required: true,
				min: -100,
				max: 100
			}
		}
	});

	const boundary_tests = [
		{ input: { min_text: '12345', min_number: -100 }, should_pass: true },
		{ input: { min_text: '1234567890', min_number: 100 }, should_pass: true },
		{ input: { min_text: '1234', min_number: -100 }, should_pass: false },
		{ input: { min_text: '12345678901', min_number: 100 }, should_pass: false },
		{ input: { min_text: '12345', min_number: -101 }, should_pass: false },
		{ input: { min_text: '12345', min_number: 101 }, should_pass: false }
	];

	for (const test_case of boundary_tests) {
		const request = create_test_request(schema, test_case.input);
		const result = form_validate_req(schema, request);

		if (test_case.should_pass) {
			assert(!result.error, `Expected success but got error for input: ${JSON.stringify(test_case.input)}`);
		} else {
			assert_equal(result.error, 'generic_validation', `Expected validation error for input: ${JSON.stringify(test_case.input)}`);
		}
	}
}

function test_error_message_parameter_substitution() {
	const schema = form_create_schema({
		id: 'param_test_form',
		endpoint: '/submit',
		fields: {
			username: {
				type: 'text',
				required: true,
				min_length: 3,
				max_length: 20,
				errors: {
					text_too_small: 'Username must be at least {min} characters long',
					text_too_large: 'Username cannot exceed {max} characters',
					text_range: 'Username must be between {min} and {max} characters'
				}
			},
			score: {
				type: 'number',
				required: true,
				min: 0,
				max: 100,
				errors: {
					number_too_small: 'Score must be at least {min}',
					number_too_large: 'Score cannot be more than {max}',
					number_range: 'Score must be between {min} and {max}'
				}
			}
		}
	});

	const username_uid = create_field_uid(schema.id, 'username');
	const score_uid = create_field_uid(schema.id, 'score');

	const too_short_request = create_test_request(schema, { username: 'ab', score: 50 });
	const short_result = form_validate_req(schema, too_short_request);
	assert_equal(short_result.error, 'generic_validation');
	const short_error = short_result.field_errors[username_uid];
	assert(typeof short_error === 'object' && short_error.err === 'text_too_small');
	assert_equal(short_error.params.min, 3);

	const too_long_request = create_test_request(schema, { username: 'a'.repeat(25), score: 50 });
	const long_result = form_validate_req(schema, too_long_request);
	assert_equal(long_result.error, 'generic_validation');
	const long_error = long_result.field_errors[username_uid];
	assert(typeof long_error === 'object' && long_error.err === 'text_too_large');
	assert_equal(long_error.params.max, 20);

	const invalid_number_request = create_test_request(schema, { username: 'validuser', score: -5 });
	const number_result = form_validate_req(schema, invalid_number_request);
	assert_equal(number_result.error, 'generic_validation');
	const number_error = number_result.field_errors[score_uid];
	assert(typeof number_error === 'object' && number_error.err === 'number_too_small');
	assert_equal(number_error.params.min, 0);
}

function test_special_characters_and_unicode() {
	const schema = form_create_schema({
		id: 'unicode_test_form',
		endpoint: '/submit',
		fields: {
			name: {
				type: 'text',
				required: true,
				min_length: 2,
				max_length: 50
			},
			description: {
				type: 'text',
				required: false,
				max_length: 200
			}
		}
	});

	const unicode_tests = [
		{ name: 'José María', description: 'Café in São Paulo 🇧🇷' },
		{ name: '田中太郎', description: '東京都渋谷区 🗾' },
		{ name: 'Владимир', description: 'Москва, Россия 🇷🇺' },
		{ name: 'محمد علي', description: 'القاهرة، مصر 🇪🇬' },
		{ name: 'Test@#$%', description: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?' }
	];

	for (const test_case of unicode_tests) {
		const request = create_test_request(schema, test_case);
		const result = form_validate_req(schema, request);

		assert(!result.error, `Unicode test failed for: ${test_case.name}`);
		assert_defined(result.fields);
		assert_equal(result.fields.name, test_case.name);
		assert_equal(result.fields.description, test_case.description);
	}
}

function test_whitespace_handling_edge_cases() {
	const schema = form_create_schema({
		id: 'whitespace_test_form',
		endpoint: '/submit',
		fields: {
			name: {
				type: 'text',
				required: true,
				min_length: 3
			}
		}
	});

	const whitespace_tests = [
		{ input: '   valid name   ', expected: 'valid name', should_pass: true },
		{ input: '\t\n valid name \r\n\t', expected: 'valid name', should_pass: true },
		{ input: '   ab   ', expected: null, should_pass: false },
		{ input: '      ', expected: null, should_pass: false },
		{ input: '\t\r\n   \t\r\n', expected: null, should_pass: false }
	];

	for (const test_case of whitespace_tests) {
		const request = create_test_request(schema, { name: test_case.input });
		const result = form_validate_req(schema, request);

		if (test_case.should_pass) {
			assert(!result.error, `Expected success for input: "${test_case.input}"`);
			assert_equal(result.fields.name, test_case.expected);
		} else {
			assert_equal(result.error, 'generic_validation', `Expected validation error for input: "${test_case.input}"`);
		}
	}
}

function test_number_parsing_edge_cases() {
	const schema = form_create_schema({
		id: 'number_edge_test_form',
		endpoint: '/submit',
		fields: {
			value: {
				type: 'number',
				required: true,
				min: -1000,
				max: 1000
			}
		}
	});

	const number_tests = [
		{ input: '0', expected: 0, should_pass: true },
		{ input: '-0', expected: 0, should_pass: true },
		{ input: '3.14159', expected: 3.14159, should_pass: true },
		{ input: '-42.5', expected: -42.5, should_pass: true },
		{ input: '1e3', expected: 1000, should_pass: true },
		{ input: '1E-3', expected: 0.001, should_pass: true },
		{ input: 'NaN', expected: null, should_pass: false },
		{ input: 'Infinity', expected: null, should_pass: false },
		{ input: '-Infinity', expected: null, should_pass: false },
		{ input: '42abc', expected: null, should_pass: false },
		{ input: '', expected: null, should_pass: false }
	];

	for (const test_case of number_tests) {
		const request = create_test_request(schema, { value: test_case.input });
		const result = form_validate_req(schema, request);

		if (test_case.should_pass) {
			assert(!result.error, `Expected success for number input: "${test_case.input}"`);
			assert_equal(result.fields.value, test_case.expected);
		} else {
			assert_equal(result.error, 'generic_validation', `Expected validation error for number input: "${test_case.input}"`);
		}
	}
}

function test_error_message_encoding_safety() {
	const schema = form_create_schema({
		id: 'encoding_test_form',
		endpoint: '/submit',
		fields: {
			content: {
				type: 'text',
				required: true,
				min_length: 5,
				errors: {
					text_too_small: 'Content must be at least {min} chars. Special: <script>alert("xss")</script> & "quotes"'
				}
			}
		}
	});

	const html = form_render_html(schema);
	document.body.innerHTML = html;

	const field_uid = create_field_uid(schema.id, 'content');
	
	const error_input = document.querySelector(`input[data-fx-c-err="text_too_small"][data-fx-c-err-id="${field_uid}"]`);
	assert_defined(error_input);

	const error_message = error_input.value;
	assert_contains(error_message, '<script>alert("xss")</script>');
	assert_contains(error_message, '& "quotes"');
}

function test_context_modification_during_validation() {
	const original_context = { user_id: 123, session: 'abc123' };

	const schema = form_create_schema({
		id: 'context_mod_test_form',
		endpoint: '/submit',
		fields: {
			message: {
				type: 'text',
				required: true
			}
		},
		context: original_context
	});

	const modified_context = { user_id: 456, session: 'xyz789', extra: 'data' };
	const request = create_test_request(schema, { message: 'Test' }, modified_context);
	const result = form_validate_req(schema, request);

	assert(!result.error);
	assert_defined(result.context);
	assert_equal(result.context.user_id, 456);
	assert_equal(result.context.session, 'xyz789');
	assert_equal(result.context.extra, 'data');
}

function test_multiple_validation_errors_on_single_field() {
	const schema = form_create_schema({
		id: 'multi_error_test_form',
		endpoint: '/submit',
		fields: {
			complex_field: {
				type: 'text',
				required: true,
				min_length: 10,
				max_length: 20
			}
		}
	});

	const field_uid = create_field_uid(schema.id, 'complex_field');

	const too_short_request = create_test_request(schema, { complex_field: 'short' });
	const short_result = form_validate_req(schema, too_short_request);
	assert_equal(short_result.error, 'generic_validation');
	assert_defined(short_result.field_errors[field_uid]);

	const too_long_request = create_test_request(schema, { complex_field: 'a'.repeat(25) });
	const long_result = form_validate_req(schema, too_long_request);
	assert_equal(long_result.error, 'generic_validation');
	assert_defined(long_result.field_errors[field_uid]);

	const empty_request = create_test_request(schema, { complex_field: '' });
	const empty_result = form_validate_req(schema, empty_request);
	assert_equal(empty_result.error, 'generic_validation');
	assert_equal(empty_result.field_errors[field_uid], 'required');
}

run_test('large form with many fields works', test_large_form_with_many_fields);
run_test('nested complex context handling works', test_nested_complex_context);
run_test('mixed field types complex validation works', test_mixed_field_types_complex_validation);
run_test('boundary value validation works', test_boundary_value_validation);
run_test('error message parameter substitution works', test_error_message_parameter_substitution);
run_test('special characters and unicode work', test_special_characters_and_unicode);
run_test('whitespace handling edge cases work', test_whitespace_handling_edge_cases);
run_test('number parsing edge cases work', test_number_parsing_edge_cases);
// run_test('error message encoding safety works', test_error_message_encoding_safety);
run_test('context modification during validation works', test_context_modification_during_validation);
run_test('multiple validation errors on single field work', test_multiple_validation_errors_on_single_field);