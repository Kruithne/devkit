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

export function assert_dom_class(element: Element, class_name: string, message?: string): void {
	assert_defined(element, message || `Expected DOM element to be defined`);
	assert(element.classList.contains(class_name), message || `Expected element to have class ${class_name}`);
}

export function assert_array_length<T>(array: T[], expected_length: number, message?: string): void {
	assert_equal(array.length, expected_length, message || `Expected array length ${expected_length}, got ${array.length}`);
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