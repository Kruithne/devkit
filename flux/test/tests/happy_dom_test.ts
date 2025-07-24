/// <reference lib="dom" />

import { Window } from 'happy-dom';
import { assert, assert_equal, assert_defined, run_test } from '../test_api';

const window = new Window();
const document = window.document;
const Element = window.Element;

(global as any).window = window;
(global as any).document = document;
(global as any).Element = Element;

run_test('DOM globals are available', () => {
	assert_defined(document);
	assert_defined(window);
	assert_defined(Element);
});

run_test('can create and manipulate DOM elements', () => {
	const div = document.createElement('div');
	div.innerHTML = '<p>Hello World</p>';
	div.className = 'test-container';
	
	assert_equal(div.tagName, 'DIV');
	assert_equal(div.innerHTML, '<p>Hello World</p>');
	assert_equal(div.className, 'test-container');
});

run_test('Happy DOM document has expected properties', () => {
	assert_defined(document.documentElement);
	assert_defined(document.body);
	assert_defined(document.head);
	assert_defined(document.createElement);
});

run_test('can query DOM elements', () => {
	document.body.innerHTML = `
		<div id="test-element" class="test-class">
			<span>Test content</span>
		</div>
	`;
	
	const element = document.getElementById('test-element');
	const element_by_class = document.querySelector('.test-class');
	const span = document.querySelector('span');
	
	assert_defined(element);
	assert_equal(element_by_class, element);
	assert_equal(span?.textContent, 'Test content');
});

run_test('can handle events with Happy DOM', () => {
	const button = document.createElement('button');
	button.textContent = 'Click me';
	
	let clicked = false;
	button.addEventListener('click', () => {
		clicked = true;
	});
	
	button.click();
	assert_equal(clicked, true);
});

run_test('CSS manipulation works', () => {
	const div = document.createElement('div');
	div.style.color = 'red';
	div.style.fontSize = '16px';
	
	assert_equal(div.style.color, 'red');
	assert_equal(div.style.fontSize, '16px');
});