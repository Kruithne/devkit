const get_nested_value = (obj, path) => {
	return path.split('.').reduce((current, key) => {
		return current?.[key];
	}, obj);
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

		for (const $el of container.querySelectorAll('[data-text]')) {
			const path = $el.dataset.text;
			const value = get_nested_value(proxy, path);
			$el.textContent = value;
		}

		for (const $el of container.querySelectorAll('[data-class]')) {
			const bindings = $el.dataset.class.split(',');
			for (const binding of bindings) {
				const [statePath, className] = binding.split(':');
				const value = get_nested_value(proxy, statePath.trim());
	
				if (value)
					$el.classList.add(className.trim());
				else
					$el.classList.remove(className.trim());
			}
		}

		for (const $el of container.querySelectorAll('*')) {
			for (const attr of $el.attributes) {
				if (attr.name.startsWith('data-attr-')) {
					const attrName = attr.name.slice(10);
					const path = attr.value;
					const value = get_nested_value(proxy, path);
					$el.setAttribute(attrName, value);
				}
			}
		}

		for (const $el of container.querySelectorAll('[data-show]')) {
			const path = $el.dataset.show;
			const value = get_nested_value(proxy, path);
			$el.style.display = value ? '' : 'none';
		}

		for (const $el of container.querySelectorAll('[data-model]')) {
			const path = $el.dataset.model;
			const value = get_nested_value(proxy, path);

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
			
			for (const $el of container.querySelectorAll('[data-model]')) {
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
			
			for (const $el of container.querySelectorAll('*')) {
				for (const attr of $el.attributes) {
					if (attr.name.startsWith('data-on-')) {
						const eventName = attr.name.slice(8);
						const methodName = attr.value;
						
						$el.addEventListener(eventName, (e) => {
							if (typeof proxy[methodName] === 'function') {
								proxy[methodName](e);
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