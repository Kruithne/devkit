import puppeteer from 'puppeteer';
import { http_serve } from 'spooder';
import { assert_defined, assert_equal, run_async_test } from '../test_api';
import { form_render_html, form_create_schema, form_validate_req } from '../../src/flux';

const test_form = form_create_schema({
	id: 'test_form',
	endpoint: '/api/submit-form',
	context: {
		uuid: 'test-uuid'
	},
	fields: {
		first_name: {
			type: 'text',
			label: 'First Name:',
			min_length: 2,
			max_length: 50,
			placeholder: 'Enter your first name...'
		}
	},
	errors: {
		text_too_small: 'Must be at least {min} characters',
		required: 'This field is required'
	}
});

const server = http_serve(9000);

server.bootstrap({
	drop_missing_subs: false,
	static: {
		directory: './test/static',
		route: '/static'
	},
	routes: {
		'/': {
			content: Bun.file('./test/static/test.html'),
			subs: {
				form: () => form_render_html(test_form)
			}
		}
	}
});

server.route('/flux_client.js', () => Bun.file('./src/flux_client.js'));

server.json('/api/submit-form', (req, url, json) => {
	const validation = form_validate_req(test_form, json);
	if (validation.error)
		return validation;
	return { success: true };
});

await run_async_test('browser can load flux form with Vue integration', async () => {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();
	await page.goto('http://127.0.0.1:9000');

	await page.waitForSelector('.fx-form', { timeout: 5000 });

	const form_exists = await page.$('.fx-form');
	assert_defined(form_exists);

	const field_exists = await page.$('.fx-field[data-fx-field-id="test_form-first_name"]');
	assert_defined(field_exists);

	const input_exists = await page.$('.fx-input');
	assert_defined(input_exists);

	await page.type('.fx-input', 'Test Name');
	const input_value = await page.$eval('.fx-input', el => (el as HTMLInputElement).value);
	assert_equal(input_value, 'Test Name');

	await page.click('input[value="Submit"]');
	
	await page.waitForSelector('.fx-state-success, .fx-state-error', { timeout: 3000 });

	const has_success_state = await page.$('.fx-state-success');
	const has_error_state = await page.$('.fx-state-error');

	assert_defined(has_success_state || has_error_state);

	await browser.close();
	await server.stop();
});