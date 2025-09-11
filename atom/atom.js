const get_nested_value = (obj, path) => {
	return path.split('.').reduce((current, key) => {
		return current?.[key];
	}, obj);
};

const should_skip_child = (element) => {
	return element.closest('[data-for]') && !element.getAttribute('data-atom-generated');
};

const parse_method_call = (expression) => {
	const match = expression.match(/^(\w+)\s*\((.*)\)$/);
	if (match) {
		const [, methodName, argsString] = match;
		const args = argsString.trim() ? argsString.split(',').map(arg => arg.trim()) : [];
		return { methodName, args };
	}
	return { methodName: expression, args: [] };
};

const evaluate_expression = (proxy, expression, context = null) => {
	const state = context ? { ...proxy, ...context } : proxy;
	
	if (expression.startsWith("'") && expression.endsWith("'"))
		return expression.slice(1, -1);

	if (expression.startsWith('"') && expression.endsWith('"'))
		return expression.slice(1, -1);
	
	if (/^-?\d+(\.\d+)?$/.test(expression))
		return parseFloat(expression);
	
	if (!/[<>=!&|+\-*/\s()]/.test(expression))
		return get_nested_value(state, expression);
	
	try {
		const func = new Function('state', `with(state) { return ${expression}; }`);
		return func(state);
	} catch (e) {
		console.warn('Expression evaluation failed:', expression, e);
		return false;
	}
};

const apply_bindings = (proxy, element, context = null) => {
	// Text binding
	if (element.hasAttribute('data-text')) {
		const path = element.dataset.text;
		const value = evaluate_expression(proxy, path, context);
		element.textContent = value;
	}
	
	// Class binding
	if (element.hasAttribute('data-class')) {
		const bindings = element.dataset.class.split(',');
		for (const binding of bindings) {
			const [statePath, className] = binding.split(':');
			const value = evaluate_expression(proxy, statePath.trim(), context);

			if (value)
				element.classList.add(className.trim());
			else
				element.classList.remove(className.trim());
		}
	}
	
	// Attribute binding
	for (const attr of element.attributes) {
		if (attr.name.startsWith('data-attr-')) {
			const attrName = attr.name.slice(10);
			const path = attr.value;
			const value = evaluate_expression(proxy, path, context);
			element.setAttribute(attrName, value);
		}
	}
	
	// Conditional rendering
	if (element.hasAttribute('data-if')) {
		const shouldShow = Boolean(evaluate_expression(proxy, element.dataset.if, context));
		element.style.display = shouldShow ? '' : 'none';
	} else if (element.hasAttribute('data-else-if')) {
		const shouldShow = Boolean(evaluate_expression(proxy, element.dataset.elseIf, context));
		element.style.display = shouldShow ? '' : 'none';
	}
	
	// Event binding
	for (const attr of element.attributes) {
		if (attr.name.startsWith('data-on-')) {
			const eventName = attr.name.slice(8);
			const expression = attr.value;
			const { methodName, args } = parse_method_call(expression);

			element.addEventListener(eventName, (e) => {
				if (typeof proxy[methodName] === 'function') {
					if (args.length > 0) {
						const evaluatedArgs = args.map(arg => evaluate_expression(proxy, arg, context));
						proxy[methodName](e, ...evaluatedArgs);
					} else {
						proxy[methodName](e);
					}
				}
			});
		}
	}
};

export function atom(target, root_proxy = null) {
	const deps = new Map();
	const watchers = new Map();
	let container = null;
	
	const update = () => {
		if (root_proxy) {
			root_proxy._update();
			return;
		}

		if (!container)
			return;

		// List rendering
		for (const $template of container.querySelectorAll('[data-for]')) {
			if ($template.getAttribute('data-atom-generated'))
				continue;
			
			const forExpression = $template.dataset.for;
			const [itemName, arrayPath] = forExpression.split(':');
			
			if (!itemName || !arrayPath) {
				console.warn('Invalid data-for syntax. Expected "item:array":', forExpression);
				continue;
			}

			const array = evaluate_expression(proxy, arrayPath);
			
			if (!Array.isArray(array))
				continue;
			
			let sibling = $template.nextSibling;
			while (sibling && sibling.getAttribute?.('data-atom-generated') === 'true') {
				const nextSibling = sibling.nextSibling;
				sibling.remove();
				sibling = nextSibling;
			}
			
			$template.style.display = 'none';
			
			for (let i = 0; i < array.length; i++) {
				const item = array[i];
				const clone = $template.cloneNode(true);
				clone.removeAttribute('data-for');
				clone.setAttribute('data-atom-generated', 'true');
				clone.dataset.atomIndex = i;
				clone.style.display = '';
				
				const context = { [itemName]: item, $index: i };
				
				apply_bindings(proxy, clone, context);
				for (const child of clone.querySelectorAll('*')) {
					child.setAttribute('data-atom-generated', 'true');
					apply_bindings(proxy, child, context);
				}
				
				$template.parentNode.insertBefore(clone, $template.nextSibling);
			}
		}

		for (const $el of container.querySelectorAll('[data-text]:not([data-atom-generated])')) {
			if (should_skip_child($el))
				continue;

			const path = $el.dataset.text;
			const value = evaluate_expression(proxy, path);
			$el.textContent = value;
		}

		for (const $el of container.querySelectorAll('[data-class]:not([data-atom-generated])')) {
			if (should_skip_child($el))
				continue;

			const bindings = $el.dataset.class.split(',');
			for (const binding of bindings) {
				const [statePath, className] = binding.split(':');
				const value = evaluate_expression(proxy, statePath.trim());
	
				if (value)
					$el.classList.add(className.trim());
				else
					$el.classList.remove(className.trim());
			}
		}

		for (const $el of container.querySelectorAll('*:not([data-atom-generated])')) {
			if (should_skip_child($el))
				continue;

			for (const attr of $el.attributes) {
				if (attr.name.startsWith('data-attr-')) {
					const attrName = attr.name.slice(10);
					const path = attr.value;
					const value = evaluate_expression(proxy, path);
					$el.setAttribute(attrName, value);
				}
			}
		}

		const processed = new Set();
		for (const $if of container.querySelectorAll('[data-if]:not([data-atom-generated])')) {
			if (should_skip_child($if))
				continue;

			if (processed.has($if))
				continue;
			
			const group = [$if];
			let sibling = $if.nextElementSibling;
			
			while (sibling && (sibling.hasAttribute('data-else-if') || sibling.hasAttribute('data-else'))) {
				group.push(sibling);
				processed.add(sibling);

				if (sibling.hasAttribute('data-else'))
					break;

				sibling = sibling.nextElementSibling;
			}
			
			processed.add($if);
			
			let shown = false;
			for (const el of group) {
				let shouldShow = false;
				
				if (!shown) {
					if (el.hasAttribute('data-if')) {
						shouldShow = Boolean(evaluate_expression(proxy, el.dataset.if));
					} else if (el.hasAttribute('data-else-if')) {
						shouldShow = Boolean(evaluate_expression(proxy, el.dataset.elseIf));
					} else if (el.hasAttribute('data-else')) {
						shouldShow = true;
					}
				}
				
				el.style.display = shouldShow ? '' : 'none';
				if (shouldShow) shown = true;
			}
		}

		for (const $el of container.querySelectorAll('[data-model]:not([data-atom-generated])')) {
			if (should_skip_child($el))
				continue;

			const path = $el.dataset.model;
			const value = evaluate_expression(proxy, path);

			if ($el.type === 'checkbox')
				$el.checked = Boolean(value);
			else if ($el.value !== value)
				$el.value = value;
		}
	};
	
	const track = (key) => {
		if (!deps.has(key))
			deps.set(key, new Set());
	};
	
	const handler = {
		get(target, key) {
			track(key);
			const value = target[key];
			if (typeof value === 'object' && value !== null)
				return atom(value, root_proxy || proxy);

			return value;
		},
		
		set(target, key, value) {
			const old_val = target[key];
			target[key] = value;
			if (old_val !== value) {
				if (watchers.has(key)) {
					for (const callback of watchers.get(key))
						callback(value, old_val);
				}
				update();
			}

			return true;
		}
	};
	
	const proxy = new Proxy(target, handler);
	
	if (!root_proxy) {
		proxy._update = update;
		proxy.watch = (path, callback) => {
			if (!watchers.has(path))
				watchers.set(path, new Set());
			watchers.get(path).add(callback);
			return () => watchers.get(path).delete(callback);
		};
		proxy.mount = (selector) => {
			container = typeof selector === 'string' ? document.querySelector(selector) : selector;
			
			for (const $el of container.querySelectorAll('[data-model]:not([data-atom-generated])')) {
				if (should_skip_child($el))
					continue;

				const path = $el.dataset.model;
				const eventType = $el.type === 'checkbox' ? 'change' : 'input';

				$el.addEventListener(eventType, (e) => {
					const keys = path.split('.');
					let current = proxy;
					for (let i = 0; i < keys.length - 1; i++)
						current = current[keys[i]];

					const value = $el.type === 'checkbox' ? e.target.checked : e.target.value;
					current[keys[keys.length - 1]] = value;
				});
			}
			
			for (const $el of container.querySelectorAll('*:not([data-atom-generated])')) {
				if (should_skip_child($el))
					continue;
				
				for (const attr of $el.attributes) {
					if (attr.name.startsWith('data-on-')) {
						const eventName = attr.name.slice(8);
						const expression = attr.value;
						const { methodName, args } = parse_method_call(expression);

						$el.addEventListener(eventName, (e) => {
							if (typeof proxy[methodName] === 'function') {
								if (args.length > 0) {
									const evaluatedArgs = args.map(arg => evaluate_expression(proxy, arg));
									proxy[methodName](e, ...evaluatedArgs);
								} else {
									proxy[methodName](e);
								}
							}
						});
					}
				}
			}
			
			update();
			return proxy;
		};
	}
	
	return proxy;
};