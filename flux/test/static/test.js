import { createApp } from '/static/vue.esm.prod.js';
import { form_component } from '/flux_client.js';

const app = createApp({
	data() {
		return {
			message: 'Flux form test running!'
		}
	}
});

const test_form = form_component(app, 'test_form');

test_form.on('submit_pending', () => console.log('Form submission pending...'));
test_form.on('submit_success', () => console.log('Form submission success!'));
test_form.on('submit_failure', e => console.error('Form submission failure:', e));

const state = app.mount('#container');