import { run_test, assert, assert_equal, assert_defined, assert_array_length } from '../test_api';
import { form_create_schema, form_validate_req } from '../../src/flux';
import { test_schemas, create_test_request, create_malformed_requests, create_field_uid } from '../test_utils';

function test_form_create_schema() {
	const schema = form_create_schema({
		id: 'test_form',
		endpoint: '/test',
		fields: {
			name: { type: 'text', required: true }
		}
	});

	assert_equal(schema.id, 'test_form');
	assert_equal(schema.endpoint, '/test');
	assert_defined(schema.fields.name);
	assert_equal(schema.fields.name.type, 'text');
	assert_equal(schema.fields.name.required, true);
}

function test_basic_text_field_validation() {
	const schema = test_schemas.minimal;
	
	const valid_request = create_test_request(schema, { name: 'John Doe' });
	const result = form_validate_req(schema, valid_request);
	
	assert(!result.error);
	assert_defined(result.fields);
	assert_equal(result.fields.name, 'John Doe');
}

function test_required_field_validation() {
	const schema = test_schemas.minimal;
	
	const test_cases = [
		{ value: undefined, name: 'undefined' },
		{ value: null, name: 'null' },
		{ value: '', name: 'empty string' },
		{ value: '   ', name: 'whitespace only' }
	];

	for (const test_case of test_cases) {
		const request = create_test_request(schema, { name: test_case.value });
		const result = form_validate_req(schema, request);
		
		assert_equal(result.error, 'generic_validation', `Required validation failed for ${test_case.name}`);
		const field_uid = create_field_uid(schema.id, 'name');
		assert_equal(result.field_errors[field_uid], 'required', `Required error not set for ${test_case.name}`);
	}
}

function test_text_length_validation() {
	const schema = test_schemas.complex;
	const username_uid = create_field_uid(schema.id, 'username');
	
	const too_short_request = create_test_request(schema, { 
		username: 'ab',
		password: 'password123',
		age: 25
	});
	const short_result = form_validate_req(schema, too_short_request);
	assert_equal(short_result.error, 'generic_validation');
	assert(short_result.field_errors[username_uid]);

	const too_long_request = create_test_request(schema, { 
		username: 'a'.repeat(25),
		password: 'password123', 
		age: 25
	});
	const long_result = form_validate_req(schema, too_long_request);
	assert_equal(long_result.error, 'generic_validation');
	assert(long_result.field_errors[username_uid]);

	const valid_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 25
	});
	const valid_result = form_validate_req(schema, valid_request);
	assert(!valid_result.error);
	assert_defined(valid_result.fields);
	assert_equal(valid_result.fields.username, 'validuser');
}

function test_number_field_validation() {
	const schema = test_schemas.complex;
	const age_uid = create_field_uid(schema.id, 'age');
	
	const invalid_number_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 'not_a_number'
	});
	const invalid_result = form_validate_req(schema, invalid_number_request);
	assert_equal(invalid_result.error, 'generic_validation');
	assert_equal(invalid_result.field_errors[age_uid], 'invalid_number');

	const too_small_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 15
	});
	const small_result = form_validate_req(schema, too_small_request);
	assert_equal(small_result.error, 'generic_validation');
	assert(small_result.field_errors[age_uid]);

	const too_large_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 150
	});
	const large_result = form_validate_req(schema, too_large_request);
	assert_equal(large_result.error, 'generic_validation');
	assert(large_result.field_errors[age_uid]);

	const valid_request = create_test_request(schema, {
		username: 'validuser',
		password: 'password123',
		age: 25
	});
	const valid_result = form_validate_req(schema, valid_request);
	assert(!valid_result.error);
	assert_defined(valid_result.fields);
	assert_equal(valid_result.fields.age, 25);
}

function test_number_range_validation() {
	const schema = form_create_schema({
		id: 'range_test',
		endpoint: '/test',
		fields: {
			score: {
				type: 'number',
				required: true,
				min: 0,
				max: 100
			}
		}
	});

	const score_uid = create_field_uid(schema.id, 'score');

	const below_range_request = create_test_request(schema, { score: -5 });
	const below_result = form_validate_req(schema, below_range_request);
	assert_equal(below_result.error, 'generic_validation');
	const below_error = below_result.field_errors[score_uid];
	assert(typeof below_error === 'object' && below_error.err === 'number_too_small');

	const above_range_request = create_test_request(schema, { score: 150 });
	const above_result = form_validate_req(schema, above_range_request);
	assert_equal(above_result.error, 'generic_validation');
	const above_error = above_result.field_errors[score_uid];
	assert(typeof above_error === 'object' && above_error.err === 'number_too_large');
}

function test_text_range_validation() {
	const schema = form_create_schema({
		id: 'text_range_test',
		endpoint: '/test',
		fields: {
			username: {
				type: 'text',
				required: true,
				min_length: 3,
				max_length: 10
			}
		}
	});

	const username_uid = create_field_uid(schema.id, 'username');

	const too_short_request = create_test_request(schema, { username: 'ab' });
	const short_result = form_validate_req(schema, too_short_request);
	assert_equal(short_result.error, 'generic_validation');
	const short_error = short_result.field_errors[username_uid];
	assert(typeof short_error === 'object' && short_error.err === 'text_too_small');

	const too_long_request = create_test_request(schema, { username: 'very_long_username' });
	const long_result = form_validate_req(schema, too_long_request);
	assert_equal(long_result.error, 'generic_validation');
	const long_error = long_result.field_errors[username_uid];
	assert(typeof long_error === 'object' && long_error.err === 'text_too_large');
}

function test_optional_field_validation() {
	const schema = test_schemas.optional_fields;
	
	const minimal_valid_request = create_test_request(schema, { 
		required_name: 'John' 
	});
	const minimal_result = form_validate_req(schema, minimal_valid_request);
	assert(!minimal_result.error);
	assert_defined(minimal_result.fields);
	assert_equal(minimal_result.fields.required_name, 'John');
	assert_array_length(Object.keys(minimal_result.fields), 1);

	const optional_valid_request = create_test_request(schema, {
		required_name: 'John',
		optional_phone: '1234567890',
		optional_count: 5
	});
	const optional_result = form_validate_req(schema, optional_valid_request);
	assert(!optional_result.error);
	assert_defined(optional_result.fields);
	assert_equal(optional_result.fields.required_name, 'John');
	assert_equal(optional_result.fields.optional_phone, '1234567890');
	assert_equal(optional_result.fields.optional_count, 5);

	const optional_invalid_request = create_test_request(schema, {
		required_name: 'John',
		optional_phone: '123',
		optional_count: 0
	});
	const invalid_result = form_validate_req(schema, optional_invalid_request);
	assert_equal(invalid_result.error, 'generic_validation');
	
	const phone_uid = create_field_uid(schema.id, 'optional_phone');
	const count_uid = create_field_uid(schema.id, 'optional_count');
	assert(invalid_result.field_errors[phone_uid]);
	assert(invalid_result.field_errors[count_uid]);
}

function test_context_handling() {
	const schema = test_schemas.context_form;
	const context_data = { user_id: 456, extra: 'data' };
	
	const request = create_test_request(schema, { message: 'Hello' }, context_data);
	const result = form_validate_req(schema, request);
	
	assert(!result.error);
	assert_defined(result.fields);
	assert_defined(result.context);
	assert_equal(result.context.user_id, 456);
	assert_equal(result.context.extra, 'data');
}

function test_malformed_request_handling() {
	const schema = test_schemas.minimal;
	
	const malformed_requests = create_malformed_requests();
	
	for (const malformed_request of malformed_requests) {
		const result = form_validate_req(schema, malformed_request);
		assert_equal(result.error, 'generic_malformed');
		assert_array_length(Object.keys(result.field_errors), 0);
	}
}

function test_text_trimming() {
	const schema = test_schemas.minimal;
	
	const request = create_test_request(schema, { name: '  John Doe  ' });
	const result = form_validate_req(schema, request);
	
	assert(!result.error);
	assert_defined(result.fields);
	assert_equal(result.fields.name, 'John Doe');
}

function test_edge_case_numbers() {
	const schema = form_create_schema({
		id: 'number_edge_test',
		endpoint: '/test',
		fields: {
			zero_allowed: { type: 'number', required: true, min: 0 },
			negative_allowed: { type: 'number', required: true, min: -10 },
			decimal_value: { type: 'number', required: true }
		}
	});

	const request = create_test_request(schema, {
		zero_allowed: 0,
		negative_allowed: -5,
		decimal_value: 3.14
	});
	
	const result = form_validate_req(schema, request);
	assert(!result.error);
	assert_defined(result.fields);
	assert_equal(result.fields.zero_allowed, 0);
	assert_equal(result.fields.negative_allowed, -5);
	assert_equal(result.fields.decimal_value, 3.14);
}

function test_multiple_field_errors() {
	const schema = test_schemas.complex;
	
	const request = create_test_request(schema, {
		username: 'ab',
		password: '123',
		age: 'invalid'
	});
	
	const result = form_validate_req(schema, request);
	assert_equal(result.error, 'generic_validation');
	
	const username_uid = create_field_uid(schema.id, 'username');
	const password_uid = create_field_uid(schema.id, 'password');
	const age_uid = create_field_uid(schema.id, 'age');
	
	assert(result.field_errors[username_uid]);
	assert(result.field_errors[password_uid]);
	assert_equal(result.field_errors[age_uid], 'invalid_number');
}

run_test('form_create_schema creates valid schema', test_form_create_schema);
run_test('basic text field validation works', test_basic_text_field_validation);
run_test('required field validation works', test_required_field_validation);
run_test('text length validation works', test_text_length_validation);
run_test('number field validation works', test_number_field_validation);
run_test('number range validation works', test_number_range_validation);
run_test('text range validation works', test_text_range_validation);
run_test('optional field validation works', test_optional_field_validation);
run_test('context handling works', test_context_handling);
run_test('malformed request handling works', test_malformed_request_handling);
run_test('text trimming works', test_text_trimming);
run_test('edge case numbers work', test_edge_case_numbers);
run_test('multiple field errors work', test_multiple_field_errors);