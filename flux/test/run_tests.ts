import { readdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

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

function log_warning(message: string): void {
	const formatted = message.replace(/\{([^}]+)\}/g, `${COLORS.YELLOW}$1${COLORS.RESET}`);
	console.log(formatted);
}

function log_bold(message: string): void {
	const formatted = message.replace(/\{([^}]+)\}/g, `${COLORS.BOLD}$1${COLORS.RESET}`);
	console.log(formatted);
}

const tests_dir = join(import.meta.dirname, 'tests');

async function run_all_tests() {
	try {
		const files = await readdir(tests_dir);
		const test_files = files.filter(file => file.endsWith('.ts'));
		
		let passed = 0;
		let failed = 0;
		
		for (const test_file of test_files) {
			const test_path = join(tests_dir, test_file);
			log_info(`\nRunning {${test_file}}:`);
			
			const result = await run_test_file(test_path);
			if (result) {
				passed++;
			} else {
				failed++;
			}
		}
		
		log_bold(`\n\n{Test Results:}`);
		log_success(`{✓ Passed:} ${passed}`);
		log_error(`{✗ Failed:} ${failed}`);
		log_warning(`Total: {${passed + failed}}`);
		
		if (failed > 0) {
			process.exit(1);
		}
	} catch (error) {
		console.error('Error running tests:', error);
		process.exit(1);
	}
}

function run_test_file(test_path: string): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn('bun', [test_path], {
			stdio: ['inherit', 'pipe', 'inherit']
		});
		
		let output = '';
		child.stdout?.on('data', (data) => {
			const text = data.toString();
			if (text.includes('✓') || text.includes('✗'))
				process.stdout.write(text);

			output += text;
		});
		
		child.on('close', (code) => {
			resolve(code === 0);
		});
		
		child.on('error', (error) => {
			console.error(`Error running ${test_path}:`, error);
			resolve(false);
		});
	});
}

run_all_tests();