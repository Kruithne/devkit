const get_nested_value = (obj, path) => {
	return path.split('.').reduce((current, key) => {
		return current?.[key];
	}, obj);
};

export function atom(target, root_proxy = null) {
	const deps = new Map();
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
			if (old_val !== value)
				update();

			return true;
		}
	};
	
	const proxy = new Proxy(target, handler);
	
	if (!root_proxy) {
		proxy._update = update;
		proxy.mount = (selector) => {
			container = typeof selector === 'string' ? document.querySelector(selector) : selector;
			update();
			return proxy;
		};
	}
	
	return proxy;
};