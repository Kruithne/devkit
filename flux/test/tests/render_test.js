import { Window } from 'happy-dom';
import { run_test, assert, assert_equal, assert_defined } from '../test_api';
import { form_render_html } from '../../src/flux';
import { test_schemas, create_field_uid } from '../test_utils';

const window = new Window();
global.document = window.document;
global.HTMLElement = window.HTMLElement;

function test_basic_form_structure() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	
	const container = document.getElementById(schema.id);
	assert_defined(container);
	assert_equal(container.getAttribute('is'), `vue:component_${schema.id}`);
	assert(container.classList.contains('fx-form'));
	assert_equal(container.getAttribute('data-fx-endpoint'), schema.endpoint);
	
	const form = container.querySelector('form');
	assert_defined(form);
	assert_equal(form.getAttribute('ref'), 'form');
}

function test_field_rendering() {
	const schema = test_schemas.complex;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	for (const [field_id, field] of Object.entries(schema.fields)) {
		const unique_field_id = create_field_uid(schema.id, field_id);
		
		const label = container.querySelector(`label[for="${unique_field_id}"]`);
		assert_defined(label, `Label not found for field ${field_id}`);
		assert_equal(label.getAttribute('data-fx-field-id'), unique_field_id);
		assert(label.classList.contains('fx-field'));
		
		const input = container.querySelector(`input#${unique_field_id}`);
		assert_defined(input, `Input not found for field ${field_id}`);
		assert_equal(input.getAttribute('type'), field.type);
		assert(input.classList.contains('fx-input'));
		assert(input.classList.contains(`fx-input-${field.type}`));
		
		if (field.label) {
			const label_span = label.querySelector('.fx-label');
			assert_defined(label_span);
			assert_equal(label_span.textContent, field.label);
		}
		
		if (field.placeholder) {
			assert_equal(input.getAttribute('placeholder'), field.placeholder);
		}
	}
}

function test_validation_attributes() {
	const schema = test_schemas.complex;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const username_uid = create_field_uid(schema.id, 'username');
	const username_label = container.querySelector(`label[for="${username_uid}"]`);
	assert_defined(username_label);
	assert_equal(username_label.getAttribute('fx-v-required'), 'true');
	assert_equal(username_label.getAttribute('fx-v-min-length'), '3');
	assert_equal(username_label.getAttribute('fx-v-max-length'), '20');
	
	const age_uid = create_field_uid(schema.id, 'age');
	const age_label = container.querySelector(`label[for="${age_uid}"]`);
	assert_defined(age_label);
	assert_equal(age_label.getAttribute('fx-v-required'), 'true');
	assert_equal(age_label.getAttribute('fx-v-min'), '18');
	assert_equal(age_label.getAttribute('fx-v-max'), '100');
	
	const bio_uid = create_field_uid(schema.id, 'bio');
	const bio_label = container.querySelector(`label[for="${bio_uid}"]`);
	assert_defined(bio_label);
	assert_equal(bio_label.getAttribute('fx-v-required'), 'false');
	assert_equal(bio_label.getAttribute('fx-v-max-length'), '500');
}

function test_required_field_attributes() {
	const schema = test_schemas.optional_fields;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const required_uid = create_field_uid(schema.id, 'required_name');
	const required_label = container.querySelector(`label[for="${required_uid}"]`);
	assert_defined(required_label);
	assert_equal(required_label.getAttribute('fx-v-required'), 'true');
	
	const optional_phone_uid = create_field_uid(schema.id, 'optional_phone');
	const optional_phone_label = container.querySelector(`label[for="${optional_phone_uid}"]`);
	assert_defined(optional_phone_label);
	assert_equal(optional_phone_label.getAttribute('fx-v-required'), 'false');
	
	const optional_count_uid = create_field_uid(schema.id, 'optional_count');
	const optional_count_label = container.querySelector(`label[for="${optional_count_uid}"]`);
	assert_defined(optional_count_label);
	assert_equal(optional_count_label.getAttribute('fx-v-required'), 'false');
}

function test_input_event_handlers() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const name_uid = create_field_uid(schema.id, 'name');
	const input = container.querySelector(`input#${name_uid}`);
	assert_defined(input);
	
	assert_equal(input.getAttribute('@blur'), `handle_field_blur('${name_uid}')`);
	assert_equal(input.getAttribute('@input'), `handle_field_input('${name_uid}')`);
}

function test_error_message_display() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const name_uid = create_field_uid(schema.id, 'name');
	const label = container.querySelector(`label[for="${name_uid}"]`);
	assert_defined(label);
	
	const error_span = label.querySelector('.fx-error-text');
	assert_defined(error_span);
	assert_equal(error_span.getAttribute('v-if'), `state['${name_uid}'].has_error`);
	assert(error_span.textContent.includes(`state['${name_uid}'].error`));
}

function test_tab_index_assignment() {
	const schema = test_schemas.complex;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const inputs = container.querySelectorAll('input[type="text"], input[type="password"], input[type="number"]');
	let expected_tab_index = 1;
	
	for (const input of inputs) {
		assert_equal(input.getAttribute('tabindex'), expected_tab_index.toString());
		expected_tab_index++;
	}
}

function test_custom_global_error_messages() {
	const schema = test_schemas.custom_errors;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const global_validation_error = container.querySelector('input[data-fx-c-err="generic_validation"]');
	assert_defined(global_validation_error);
	assert_equal(global_validation_error.getAttribute('value'), 'Please fix the errors below');
	assert(!global_validation_error.hasAttribute('data-fx-c-err-id'));
	
	const global_malformed_error = container.querySelector('input[data-fx-c-err="generic_malformed"]');
	assert_defined(global_malformed_error);
	assert_equal(global_malformed_error.getAttribute('value'), 'Invalid form data received');
	assert(!global_malformed_error.hasAttribute('data-fx-c-err-id'));
}

function test_custom_field_error_messages() {
	const schema = test_schemas.custom_errors;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const email_uid = create_field_uid(schema.id, 'email');
	const email_required_error = container.querySelector(`input[data-fx-c-err="required"][data-fx-c-err-id="${email_uid}"]`);
	assert_defined(email_required_error);
	assert_equal(email_required_error.getAttribute('value'), 'Email is required for registration');
	
	const score_uid = create_field_uid(schema.id, 'score');
	const score_range_error = container.querySelector(`input[data-fx-c-err="number_range"][data-fx-c-err-id="${score_uid}"]`);
	assert_defined(score_range_error);
	assert_equal(score_range_error.getAttribute('value'), 'Score must be between {min} and {max}');
}

function test_context_rendering() {
	const schema = test_schemas.context_form;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const context_input = container.querySelector('input#fx-context');
	assert_defined(context_input);
	assert_equal(context_input.getAttribute('type'), 'hidden');
	
	const encoded_value = context_input.getAttribute('value');
	assert_defined(encoded_value);
	
	const decoded_context = JSON.parse(atob(encoded_value));
	assert_equal(decoded_context.user_id, 123);
	assert_equal(decoded_context.session_token, 'abc123');
	assert_equal(decoded_context.preferences.theme, 'dark');
	assert_equal(decoded_context.preferences.notifications, true);
}

function test_no_context_rendering() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const context_input = container.querySelector('input#fx-context');
	assert_equal(context_input, null);
}

function test_submit_button_rendering() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const submit_button = container.querySelector('input[type="button"]');
	assert_defined(submit_button);
	assert_equal(submit_button.getAttribute('value'), 'Submit');
	assert_equal(submit_button.getAttribute('@click'), 'submit');
}

function test_maxlength_attribute_for_text_fields() {
	const schema = test_schemas.complex;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const username_uid = create_field_uid(schema.id, 'username');
	const username_input = container.querySelector(`input#${username_uid}`);
	assert_defined(username_input);
	assert_equal(username_input.getAttribute('maxlength'), '20');
	
	const bio_uid = create_field_uid(schema.id, 'bio');
	const bio_input = container.querySelector(`input#${bio_uid}`);
	assert_defined(bio_input);
	assert_equal(bio_input.getAttribute('maxlength'), '500');
	
	const age_uid = create_field_uid(schema.id, 'age');
	const age_input = container.querySelector(`input#${age_uid}`);
	assert_defined(age_input);
	assert(!age_input.hasAttribute('maxlength'));
}

function test_vue_class_binding() {
	const schema = test_schemas.minimal;
	const html = form_render_html(schema);
	
	document.body.innerHTML = html;
	const container = document.getElementById(schema.id);
	assert_defined(container);
	
	const name_uid = create_field_uid(schema.id, 'name');
	const label = container.querySelector(`label[for="${name_uid}"]`);
	assert_defined(label);
	
	const class_binding = label.getAttribute(':class');
	assert_defined(class_binding);
	assert(class_binding.includes(`'fx-error': state['${name_uid}'].has_error`));
}

run_test('basic form structure renders correctly', test_basic_form_structure);
run_test('field rendering works correctly', test_field_rendering);
run_test('validation attributes are rendered', test_validation_attributes);
run_test('required field attributes work', test_required_field_attributes);
run_test('input event handlers are set', test_input_event_handlers);
run_test('error message display is configured', test_error_message_display);
run_test('tab index assignment works', test_tab_index_assignment);
run_test('custom global error messages render', test_custom_global_error_messages);
run_test('custom field error messages render', test_custom_field_error_messages);
run_test('context rendering works', test_context_rendering);
run_test('no context rendering works', test_no_context_rendering);
run_test('submit button renders correctly', test_submit_button_rendering);
run_test('maxlength attribute for text fields', test_maxlength_attribute_for_text_fields);
run_test('Vue class binding is configured', test_vue_class_binding);