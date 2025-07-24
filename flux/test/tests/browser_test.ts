import puppeteer from 'puppeteer';
import { http_serve } from 'spooder';
import { assert_defined, assert_equal, run_async_test } from '../test_api';

const server = http_serve(9000);
server.route('/', () => {
	return '<p>Hello, world!</p>';
});

await run_async_test('browser can load and render page', async () => {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();
	await page.goto('http://127.0.0.1:9000');

	const content = await page.content();
	assert_defined(content);
	assert_equal(content.includes('<p>Hello, world!</p>'), true);

	await browser.close();
	await server.stop();
});