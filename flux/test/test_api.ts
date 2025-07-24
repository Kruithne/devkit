const COLORS = {
	RED: '\x1b[31m',
	GREEN: '\x1b[32m',
	YELLOW: '\x1b[33m',
	BLUE: '\x1b[34m',
	MAGENTA: '\x1b[35m',
	CYAN: '\x1b[36m',
	WHITE: '\x1b[37m',
	BOLD: '\x1b[1m',
	RESET: '\x1b[0m'
};

function log_success(message: string): void {
	const formatted = message.replace(/\{([^}]+)\}/g, `${COLORS.GREEN}$1${COLORS.RESET}`);
	console.log(formatted);
}

function log_error(message: string): void {
	const formatted = message.replace(/\{([^}]+)\}/g, `${COLORS.RED}$1${COLORS.RESET}`);
	console.error(formatted);
}

function log_info(message: string): void {
	const formatted = message.replace(/\{([^}]+)\}/g, `${COLORS.CYAN}$1${COLORS.RESET}`);
	console.log(formatted);
}

export function assert(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message || 'Assertion failed');
}

export function assert_equal<T>(actual: T, expected: T, message?: string): void {
	if (actual !== expected)
		throw new Error(message || `Expected ${expected}, got ${actual}`);
}

export function assert_defined<T>(value: T | undefined | null, message?: string): asserts value is T {
	if (value === undefined || value === null) {
		const error = new Error(message || 'Expected value to be defined');
		Error.captureStackTrace?.(error, assert_defined);
		throw error;
	}
}

export function run_test(name: string, test_fn: () => void | Promise<void>): void {
	try {
		const result = test_fn();
		if (result instanceof Promise) {
			result
				.then(() => log_success(`{✓} ${name}`))
				.catch(error => {
					log_error(`{✗} ${name}: {${error.message}}`);
					if (error.stack)
						console.error(error.stack.split('\n').slice(1).join('\n'));
					process.exit(1);
				});
		} else {
			log_success(`{✓} ${name}`);
		}
	} catch (e) {
		const error = e as Error;

		log_error(`{✗} ${name}: {${error.message || error}}`);

		if (error.stack)
			console.error(error.stack.split('\n').slice(1).join('\n'));

		process.exit(1);
	}
}

export async function run_async_test(name: string, test_fn: () => Promise<void>): Promise<void> {
	try {
		await test_fn();
		log_success(`{✓} ${name}`);
	} catch (e) {
		const error = e as Error;

		log_error(`{✗} ${name}: {${error.message || error}}`);

		if (error.stack)
			console.error(error.stack.split('\n').slice(1).join('\n'));

		process.exit(1);
	}
}

export function assert_contains(actual: string, expected: string, message?: string): void {
	if (!actual.includes(expected))
		throw new Error(message || `Expected "${actual}" to contain "${expected}"`);
}

export function assert_matches(actual: string, pattern: RegExp, message?: string): void {
	if (!pattern.test(actual))
		throw new Error(message || `Expected "${actual}" to match pattern ${pattern}`);
}

export function assert_throws(fn: () => void, message?: string): void {
	let threw = false;
	try {
		fn();
	} catch (error) {
		threw = true;
	}
	if (!threw)
		throw new Error(message || 'Expected function to throw an error');
}

export async function assert_throws_async(fn: () => Promise<void>, message?: string): Promise<void> {
	let threw = false;
	try {
		await fn();
	} catch (error) {
		threw = true;
	}
	if (!threw)
		throw new Error(message || 'Expected async function to throw an error');
}

export function assert_dom_element(element: Element, tag: string, message?: string): void {
	assert_defined(element, message || `Expected DOM element to be defined`);
	assert_equal(element.tagName.toLowerCase(), tag.toLowerCase(), message || `Expected element to be ${tag}`);
}

export function assert_dom_attribute(element: Element, attribute: string, expected_value?: string, message?: string): void {
	assert_defined(element, message || `Expected DOM element to be defined`);
	const actual_value = element.getAttribute(attribute);
	if (expected_value !== undefined) {
		assert_equal(actual_value, expected_value, message || `Expected attribute ${attribute} to be "${expected_value}"`);
	} else {
		assert_defined(actual_value, message || `Expected element to have attribute ${attribute}`);
	}
}

export function assert_dom_class(element: Element, class_name: string, message?: string): void {
	assert_defined(element, message || `Expected DOM element to be defined`);
	assert(element.classList.contains(class_name), message || `Expected element to have class ${class_name}`);
}

export function assert_dom_text(element: Element, expected_text: string, message?: string): void {
	assert_defined(element, message || `Expected DOM element to be defined`);
	assert_equal(element.textContent?.trim(), expected_text, message || `Expected element text to be "${expected_text}"`);
}

export function assert_http_response(response: { status: number; statusText?: string }, expected_status: number, message?: string): void {
	assert_equal(response.status, expected_status, message || `Expected HTTP status ${expected_status}, got ${response.status}`);
}

export function assert_array_length<T>(array: T[], expected_length: number, message?: string): void {
	assert_equal(array.length, expected_length, message || `Expected array length ${expected_length}, got ${array.length}`);
}

export function assert_object_keys(obj: object, expected_keys: string[], message?: string): void {
	const actual_keys = Object.keys(obj).sort();
	const sorted_expected = expected_keys.sort();
	assert_equal(JSON.stringify(actual_keys), JSON.stringify(sorted_expected), 
		message || `Expected object keys ${JSON.stringify(sorted_expected)}, got ${JSON.stringify(actual_keys)}`);
}

export function setup_dom_environment(): void {
	if (typeof document === 'undefined') {
		const { Window } = require('happy-dom');
		const window = new Window();
		global.document = window.document;
		global.HTMLElement = window.HTMLElement;
		global.Element = window.Element;
	}
}

export function cleanup_dom(): void {
	if (document?.body) {
		document.body.innerHTML = '';
	}
}

export function create_test_element(tag: string, attributes?: Record<string, string>, text_content?: string): Element {
	setup_dom_environment();
	const element = document.createElement(tag);
	
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			element.setAttribute(key, value);
		}
	}
	
	if (text_content) {
		element.textContent = text_content;
	}
	
	return element;
}

export function wait_for_condition(condition: () => boolean, timeout_ms: number = 1000, check_interval_ms: number = 10): Promise<void> {
	return new Promise((resolve, reject) => {
		const start_time = Date.now();
		
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - start_time > timeout_ms) {
				reject(new Error(`Condition not met within ${timeout_ms}ms`));
			} else {
				setTimeout(check, check_interval_ms);
			}
		};
		
		check();
	});
}