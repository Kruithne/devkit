import puppeteer from 'puppeteer';
import { http_serve } from 'spooder';
import { assert_defined, assert_equal, run_async_test } from '../test_api';
import { form_render_html, form_validate_req } from '../../src/flux';
import { test_schemas, create_field_uid } from '../test_utils';

const server = http_serve(9001);

server.bootstrap({
	drop_missing_subs: false,
	static: {
		directory: './test/static',
		route: '/static'
	},
	routes: {
		'/': {
			content: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8"/>
		<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
		<title>Flux Test Page</title>
		<style>
			.fx-form { display: flex; flex-direction: column; border: 1px solid red; padding: 10px; gap: 10px; margin-top: 20px; }
			.fx-field { border: 1px solid blue; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
			.fx-input { border: 1px solid orange; padding: 5px; }
			.fx-label { border: 1px dotted purple; padding: 10px; }
			.fx-error-text { color: red; font-weight: bold; }
			.fx-error { background: rgba(255, 0, 0, 0.5); }
			.fx-error .fx-input { border: 1px solid red; }
			.fx-state-pending { background-color: rgba(255, 165, 0, 0.5); }
			.fx-state-success { background-color: rgba(0, 128, 0, 0.5); }
			.fx-state-error { background-color: rgba(255, 0, 0, 0.5); }
		</style>
	</head>
	<body>
		<div id="container">
			<h1>Flux Form Test</h1>
			{{ form }}
		</div>
		<script type="module">
			import { createApp } from '/static/vue.esm.prod.js';
			import { form_component } from '/flux_client.js';

			const app = createApp({
				data() {
					return {
						message: 'Flux form test running!'
					}
				}
			});

			const test_form = form_component(app, '${test_schemas.complex.id}');

			test_form.on('submit_pending', () => console.log('Form submission pending...'));
			test_form.on('submit_success', () => console.log('Form submission success!'));
			test_form.on('submit_failure', e => console.error('Form submission failure:', e));

			const state = app.mount('#container');
		</script>
	</body>
</html>`,
			subs: {
				form: () => form_render_html(test_schemas.complex)
			}
		},
		'/simple': {
			content: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8"/>
		<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
		<title>Flux Test Page</title>
		<style>
			.fx-form { display: flex; flex-direction: column; border: 1px solid red; padding: 10px; gap: 10px; margin-top: 20px; }
			.fx-field { border: 1px solid blue; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
			.fx-input { border: 1px solid orange; padding: 5px; }
			.fx-label { border: 1px dotted purple; padding: 10px; }
			.fx-error-text { color: red; font-weight: bold; }
			.fx-error { background: rgba(255, 0, 0, 0.5); }
			.fx-error .fx-input { border: 1px solid red; }
			.fx-state-pending { background-color: rgba(255, 165, 0, 0.5); }
			.fx-state-success { background-color: rgba(0, 128, 0, 0.5); }
			.fx-state-error { background-color: rgba(255, 0, 0, 0.5); }
		</style>
	</head>
	<body>
		<div id="container">
			<h1>Flux Form Test</h1>
			{{ form }}
		</div>
		<script type="module">
			import { createApp } from '/static/vue.esm.prod.js';
			import { form_component } from '/flux_client.js';

			const app = createApp({
				data() {
					return {
						message: 'Flux form test running!'
					}
				}
			});

			const test_form = form_component(app, '${test_schemas.minimal.id}');
			test_form.on('submit_pending', () => console.log('Form submission pending...'));
			test_form.on('submit_success', () => console.log('Form submission success!'));
			test_form.on('submit_failure', e => console.error('Form submission failure:', e));

			const state = app.mount('#container');
		</script>
	</body>
</html>`,
			subs: {
				form: () => form_render_html(test_schemas.minimal)
			}
		},
		'/custom-errors': {
			content: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8"/>
		<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
		<title>Flux Test Page</title>
		<style>
			.fx-form { display: flex; flex-direction: column; border: 1px solid red; padding: 10px; gap: 10px; margin-top: 20px; }
			.fx-field { border: 1px solid blue; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
			.fx-input { border: 1px solid orange; padding: 5px; }
			.fx-label { border: 1px dotted purple; padding: 10px; }
			.fx-error-text { color: red; font-weight: bold; }
			.fx-error { background: rgba(255, 0, 0, 0.5); }
			.fx-error .fx-input { border: 1px solid red; }
			.fx-state-pending { background-color: rgba(255, 165, 0, 0.5); }
			.fx-state-success { background-color: rgba(0, 128, 0, 0.5); }
			.fx-state-error { background-color: rgba(255, 0, 0, 0.5); }
		</style>
	</head>
	<body>
		<div id="container">
			<h1>Flux Form Test</h1>
			{{ form }}
		</div>
		<script type="module">
			import { createApp } from '/static/vue.esm.prod.js';
			import { form_component } from '/flux_client.js';

			const app = createApp({
				data() {
					return {
						message: 'Flux form test running!'
					}
				}
			});

			const test_form = form_component(app, '${test_schemas.custom_errors.id}');
			test_form.on('submit_pending', () => console.log('Form submission pending...'));
			test_form.on('submit_success', () => console.log('Form submission success!'));
			test_form.on('submit_failure', e => console.error('Form submission failure:', e));

			const state = app.mount('#container');
		</script>
	</body>
</html>`,
			subs: {
				form: () => form_render_html(test_schemas.custom_errors)
			}
		},
		'/context': {
			content: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8"/>
		<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
		<title>Flux Test Page</title>
		<style>
			.fx-form { display: flex; flex-direction: column; border: 1px solid red; padding: 10px; gap: 10px; margin-top: 20px; }
			.fx-field { border: 1px solid blue; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
			.fx-input { border: 1px solid orange; padding: 5px; }
			.fx-label { border: 1px dotted purple; padding: 10px; }
			.fx-error-text { color: red; font-weight: bold; }
			.fx-error { background: rgba(255, 0, 0, 0.5); }
			.fx-error .fx-input { border: 1px solid red; }
			.fx-state-pending { background-color: rgba(255, 165, 0, 0.5); }
			.fx-state-success { background-color: rgba(0, 128, 0, 0.5); }
			.fx-state-error { background-color: rgba(255, 0, 0, 0.5); }
		</style>
	</head>
	<body>
		<div id="container">
			<h1>Flux Form Test</h1>
			{{ form }}
		</div>
		<script type="module">
			import { createApp } from '/static/vue.esm.prod.js';
			import { form_component } from '/flux_client.js';

			const app = createApp({
				data() {
					return {
						message: 'Flux form test running!'
					}
				}
			});

			const test_form = form_component(app, '${test_schemas.context_form.id}');
			test_form.on('submit_pending', () => console.log('Form submission pending...'));
			test_form.on('submit_success', () => console.log('Form submission success!'));
			test_form.on('submit_failure', e => console.error('Form submission failure:', e));

			const state = app.mount('#container');
		</script>
	</body>
</html>`,
			subs: {
				form: () => form_render_html(test_schemas.context_form)
			}
		}
	}
});

server.route('/flux_client.js', () => Bun.file('./src/flux_client.js'));

server.json('/submit', (req, url, json) => {
	const validation = form_validate_req(test_schemas.complex, json);
	if (validation.error)
		return validation;
	return { success: true, data: validation.fields };
});

server.json('/submit-server-error', (req, url, json) => {
	return {
		error: 'generic_validation',
		field_errors: {
			[create_field_uid(test_schemas.complex.id, 'username')]: 'Username already taken'
		}
	};
});

server.json('/submit-http-error', (req, url, json) => {
	return new Response('Internal Server Error', { status: 500 });
});

async function run_e2e_test(name, path, test_fn) {
	await run_async_test(name, async () => {
		const browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});

		const page = await browser.newPage();
		await page.goto(`http://127.0.0.1:9001${path}`);
		await page.waitForSelector('.fx-form', { timeout: 5000 });

		try {
			await test_fn(page);
		} finally {
			await browser.close();
		}
	});
}

await run_e2e_test('form renders correctly with Vue', '/', async (page) => {
	const form_exists = await page.$('.fx-form');
	assert_defined(form_exists);

	const username_uid = create_field_uid(test_schemas.complex.id, 'username');
	const password_uid = create_field_uid(test_schemas.complex.id, 'password');
	const age_uid = create_field_uid(test_schemas.complex.id, 'age');

	const username_field = await page.$(`.fx-field[data-fx-field-id="${username_uid}"]`);
	const password_field = await page.$(`.fx-field[data-fx-field-id="${password_uid}"]`);
	const age_field = await page.$(`.fx-field[data-fx-field-id="${age_uid}"]`);

	assert_defined(username_field);
	assert_defined(password_field);
	assert_defined(age_field);

	const submit_button = await page.$('input[type="button"][value="Submit"]');
	assert_defined(submit_button);
});

await run_e2e_test('successful form submission works', '/', async (page) => {
	// page.on('console', msg => console.log('PAGE LOG:', msg.text()));
	
	const username_uid = create_field_uid(test_schemas.complex.id, 'username');
	const password_uid = create_field_uid(test_schemas.complex.id, 'password');
	const age_uid = create_field_uid(test_schemas.complex.id, 'age');

	const username_input = `#${username_uid}`;
	const password_input = `#${password_uid}`;
	const age_input = `#${age_uid}`;

	await page.type(username_input, 'testuser');
	await page.type(password_input, 'password123');
	await page.type(age_input, '25');

	await page.click('input[value="Submit"]');
	try {
		await page.waitForSelector('.fx-state-success, .fx-state-error', { timeout: 5000 });
		// State change detected
	} catch (e) {
		// No state change detected
		throw e;
	}

	const has_success_state = await page.$('.fx-state-success');
	assert_defined(has_success_state);

	const has_error_state = await page.$('.fx-state-error');
	assert_equal(has_error_state, null);
});

await run_e2e_test('client-side validation error display', '/', async (page) => {
	await page.click('input[value="Submit"]');

	await page.waitForSelector('.fx-state-error', { timeout: 3000 });

	const has_error_state = await page.$('.fx-state-error');
	assert_defined(has_error_state);
});

await run_e2e_test('basic user input and submission flow', '/', async (page) => {
	const username_uid = create_field_uid(test_schemas.complex.id, 'username');
	const password_uid = create_field_uid(test_schemas.complex.id, 'password');
	const age_uid = create_field_uid(test_schemas.complex.id, 'age');

	await page.type(`#${username_uid}`, 'validuser');
	await page.type(`#${password_uid}`, 'password123');
	await page.type(`#${age_uid}`, '25');

	const username_value = await page.$eval(`#${username_uid}`, el => el.value);
	const password_value = await page.$eval(`#${password_uid}`, el => el.value);
	const age_value = await page.$eval(`#${age_uid}`, el => el.value);

	assert_equal(username_value, 'validuser');
	assert_equal(password_value, 'password123');
	assert_equal(age_value, '25');
});

await run_e2e_test('form submission with validation errors', '/', async (page) => {
	await page.click('input[value="Submit"]');
	
	await page.waitForSelector('.fx-state-error', { timeout: 3000 });

	const has_error_state = await page.$('.fx-state-error');
	assert_defined(has_error_state);
});

await server.stop();