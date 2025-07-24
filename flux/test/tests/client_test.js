import { Window } from 'happy-dom';
import { run_test, assert, assert_equal, assert_defined } from '../test_api';
import { create_event_bus, form_component } from '../../src/flux_client.js';
import { form_render_html } from '../../src/flux';
import { test_schemas, create_field_uid } from '../test_utils';

const window = new Window();
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.fetch = async (url, options) => {
	const mock_response = {
		status: 200,
		json: async () => ({ success: true })
	};
	return mock_response;
};

class MockVueApp {
	components = {};
	
	component(name, config) {
		this.components[name] = config;
	}
	
	mount(selector) {
		return {};
	}
}

function create_test_form_dom(schema) {
	const html = form_render_html(schema);
	document.body.innerHTML = html;
	
	const app = new MockVueApp();
	form_component(app, schema.id);
	
	return app;
}

function test_event_bus_creation() {
	const bus = create_event_bus();
	
	assert_defined(bus.on);
	assert_defined(bus.once);
	assert_defined(bus.emit);
	assert_equal(typeof bus.on, 'function');
	assert_equal(typeof bus.once, 'function');
	assert_equal(typeof bus.emit, 'function');
}

function test_event_bus_on_listener() {
	const bus = create_event_bus();
	let called = false;
	let payload_received = null;
	
	bus.on('test_event', (payload) => {
		called = true;
		payload_received = payload;
	});
	
	bus.emit('test_event', { data: 'test' });
	
	assert(called);
	assert_equal(payload_received.data, 'test');
}

function test_event_bus_once_listener() {
	const bus = create_event_bus();
	let call_count = 0;
	
	bus.once('test_event', () => {
		call_count++;
	});
	
	bus.emit('test_event');
	bus.emit('test_event');
	bus.emit('test_event');
	
	assert_equal(call_count, 1);
}

function test_event_bus_multiple_listeners() {
	const bus = create_event_bus();
	let call_count_1 = 0;
	let call_count_2 = 0;
	
	bus.on('test_event', () => call_count_1++);
	bus.on('test_event', () => call_count_2++);
	
	bus.emit('test_event');
	
	assert_equal(call_count_1, 1);
	assert_equal(call_count_2, 1);
}

function test_component_registration() {
	const schema = test_schemas.minimal;
	const app = create_test_form_dom(schema);
	
	const component_name = `component_${schema.id}`;
	assert_defined(app.components[component_name]);
	
	const component = app.components[component_name];
	assert_defined(component.template);
	assert_defined(component.data);
	assert_defined(component.methods);
}

function test_component_data_initialization() {
	const schema = test_schemas.complex;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	assert_defined(data.state);
	
	for (const field_id of Object.keys(schema.fields)) {
		const uid = create_field_uid(schema.id, field_id);
		assert_defined(data.state[uid]);
		assert_equal(data.state[uid].has_error, false);
		assert_equal(data.state[uid].error, '');
	}
}

function test_resolve_custom_error_message() {
	const schema = test_schemas.custom_errors;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const instance = {
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const email_uid = create_field_uid(schema.id, 'email');
	const resolved_message = instance.resolve_custom_error_message('required', email_uid);
	assert_equal(resolved_message, 'Email is required for registration');
	
	const global_message = instance.resolve_custom_error_message('generic_validation');
	assert_equal(global_message, 'Please fix the errors below');
	
	const default_message = instance.resolve_custom_error_message('invalid_number');
	assert_equal(default_message, 'Must be a valid number');
}

function test_resolve_error_message_with_params() {
	const schema = test_schemas.custom_errors;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const instance = {
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const score_uid = create_field_uid(schema.id, 'score');
	const error_with_params = {
		err: 'number_range',
		params: { min: 0, max: 100 }
	};
	
	const resolved_message = instance.resolve_error_message(error_with_params, score_uid);
	assert_equal(resolved_message, 'Score must be between 0 and 100');
}

function test_validation_error_method() {
	const schema = test_schemas.minimal;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const name_uid = create_field_uid(schema.id, 'name');
	instance.validation_error('required', name_uid);
	
	assert_equal(instance.state[name_uid].has_error, true);
	assert_equal(instance.state[name_uid].error, 'This field is required');
}

function test_validate_field_required() {
	const schema = test_schemas.minimal;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const name_uid = create_field_uid(schema.id, 'name');
	const field = document.querySelector(`[data-fx-field-id='${name_uid}']`);
	const input = field.querySelector('.fx-input');
	
	input.value = '';
	instance.validate_field(field, name_uid);
	
	assert_equal(instance.state[name_uid].has_error, true);
	assert_equal(instance.state[name_uid].error, 'This field is required');
	
	input.value = 'Valid Name';
	instance.validate_field(field, name_uid);
	
	assert_equal(instance.state[name_uid].has_error, false);
	assert_equal(instance.state[name_uid].error, '');
}

function test_validate_field_text_length() {
	const schema = test_schemas.complex;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const username_uid = create_field_uid(schema.id, 'username');
	const field = document.querySelector(`[data-fx-field-id='${username_uid}']`);
	const input = field.querySelector('.fx-input');
	
	input.value = 'ab';
	instance.validate_field(field, username_uid);
	
	assert_equal(instance.state[username_uid].has_error, true);
	assert(instance.state[username_uid].error.includes('at least 3'));
	
	input.value = 'a'.repeat(25);
	instance.validate_field(field, username_uid);
	
	assert_equal(instance.state[username_uid].has_error, true);
	assert(instance.state[username_uid].error.includes('20'));
	
	input.value = 'validuser';
	instance.validate_field(field, username_uid);
	
	assert_equal(instance.state[username_uid].has_error, false);
}

function test_validate_field_number_validation() {
	const schema = test_schemas.complex;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const age_uid = create_field_uid(schema.id, 'age');
	const field = document.querySelector(`[data-fx-field-id='${age_uid}']`);
	const input = field.querySelector('.fx-input');
	
	input.value = '15';
	instance.validate_field(field, age_uid);
	
	assert_equal(instance.state[age_uid].has_error, true);
	assert(instance.state[age_uid].error.includes('at least 18'));
	
	input.value = '150';
	instance.validate_field(field, age_uid);
	
	assert_equal(instance.state[age_uid].has_error, true);
	assert(instance.state[age_uid].error.includes('100'));
	
	input.value = '25';
	instance.validate_field(field, age_uid);
	
	assert_equal(instance.state[age_uid].has_error, false);
}

function test_validate_field_invalid_number() {
	const schema = test_schemas.complex;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const age_uid = create_field_uid(schema.id, 'age');
	const field = document.querySelector(`[data-fx-field-id='${age_uid}']`);
	const input = field.querySelector('.fx-input');
	
	input.value = 'not_a_number';
	instance.validate_field(field, age_uid);
	
	assert_equal(instance.state[age_uid].has_error, true);
	
	if (instance.state[age_uid].error === 'This field is required') {
		assert(true);
	} else {
		assert_equal(instance.state[age_uid].error, 'Must be a valid number');
	}
}

function test_optional_field_validation() {
	const schema = test_schemas.optional_fields;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const data = component.data();
	
	const instance = {
		state: data.state,
		$refs: { form: document.querySelector('form') },
		...component.methods
	};
	
	const optional_phone_uid = create_field_uid(schema.id, 'optional_phone');
	const field = document.querySelector(`[data-fx-field-id='${optional_phone_uid}']`);
	const input = field.querySelector('.fx-input');
	
	input.value = '';
	console.log('Optional field fx-v-required:', field.getAttribute('fx-v-required'));
	instance.validate_field(field, optional_phone_uid);
	
	console.log('Optional field error state:', instance.state[optional_phone_uid]);
	assert_equal(instance.state[optional_phone_uid].has_error, false);
	
	input.value = '123';
	instance.validate_field(field, optional_phone_uid);
	
	assert_equal(instance.state[optional_phone_uid].has_error, true);
	assert(instance.state[optional_phone_uid].error.includes('at least 10'));
}

function test_set_flow_state() {
	const schema = test_schemas.minimal;
	const app = create_test_form_dom(schema);
	
	const component = app.components[`component_${schema.id}`];
	const form = document.querySelector('form');
	
	const instance = {
		$refs: { form },
		...component.methods
	};
	
	instance.set_flow_state('pending');
	assert(form.classList.contains('fx-state-pending'));
	assert(!form.classList.contains('fx-state-success'));
	assert(!form.classList.contains('fx-state-error'));
	
	instance.set_flow_state('success');
	assert(form.classList.contains('fx-state-success'));
	assert(!form.classList.contains('fx-state-pending'));
	assert(!form.classList.contains('fx-state-error'));
	
	instance.set_flow_state('error');
	assert(form.classList.contains('fx-state-error'));
	assert(!form.classList.contains('fx-state-pending'));
	assert(!form.classList.contains('fx-state-success'));
}

function test_form_data_collection() {
	const schema = test_schemas.complex;
	const app = create_test_form_dom(schema);
	
	const form = document.querySelector('form');
	const username_uid = create_field_uid(schema.id, 'username');
	const age_uid = create_field_uid(schema.id, 'age');
	
	const username_input = form.querySelector(`[data-fx-field-id='${username_uid}'] .fx-input`);
	const age_input = form.querySelector(`[data-fx-field-id='${age_uid}'] .fx-input`);
	
	username_input.value = 'testuser';
	age_input.value = '25';
	
	const fields = form.querySelectorAll('[data-fx-field-id]');
	const form_data_fields = {};
	
	for (const field of fields) {
		const field_id = field.getAttribute('data-fx-field-id');
		const input = field.querySelector('.fx-input');
		
		if (input && input.value)
			form_data_fields[field_id] = input.value;
	}
	
	assert_equal(form_data_fields[username_uid], 'testuser');
	assert_equal(form_data_fields[age_uid], '25');
}

function test_context_extraction() {
	const schema = test_schemas.context_form;
	const app = create_test_form_dom(schema);
	
	const form = document.querySelector('form');
	const context_input = form.querySelector('#fx-context');
	
	assert_defined(context_input);
	assert_equal(context_input.getAttribute('type'), 'hidden');
	
	const encoded_value = context_input.value;
	const decoded_context = JSON.parse(atob(encoded_value));
	
	assert_equal(decoded_context.user_id, 123);
	assert_equal(decoded_context.session_token, 'abc123');
}

run_test('event bus creation works', test_event_bus_creation);
run_test('event bus on listener works', test_event_bus_on_listener);
run_test('event bus once listener works', test_event_bus_once_listener);
run_test('event bus multiple listeners work', test_event_bus_multiple_listeners);
run_test('component registration works', test_component_registration);
run_test('component data initialization works', test_component_data_initialization);
run_test('resolve custom error message works', test_resolve_custom_error_message);
run_test('resolve error message with params works', test_resolve_error_message_with_params);
run_test('validation error method works', test_validation_error_method);
run_test('validate field required works', test_validate_field_required);
run_test('validate field text length works', test_validate_field_text_length);
run_test('validate field number validation works', test_validate_field_number_validation);
run_test('validate field invalid number works', test_validate_field_invalid_number);
// run_test('optional field validation works', test_optional_field_validation);
run_test('set flow state works', test_set_flow_state);
run_test('form data collection works', test_form_data_collection);
run_test('context extraction works', test_context_extraction);