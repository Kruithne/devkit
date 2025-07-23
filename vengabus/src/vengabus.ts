type EventCallback<T = any> = (payload: T) => void;

export interface VengabusInstance {
	on<T = any>(event: string, callback: EventCallback<T>): void;
	once<T = any>(event: string, callback: EventCallback<T>): void;
	off(event: string, callback?: EventCallback): void;
	emit<T = any>(event: string, payload: T): void;
}

export function create_event_bus(): VengabusInstance {
	const listeners = new Map<string, Set<EventCallback>>();

	return {
		on: <T = any>(event: string, callback: EventCallback<T>) => {
			const existing_callbacks = listeners.get(event);
			if (existing_callbacks)
				existing_callbacks.add(callback);
			else
				listeners.set(event, new Set([callback]));
		},

		once: <T = any>(event: string, callback: EventCallback<T>) => {
			const wrapped_callback = (payload: T) => {
				callback(payload);
				const callbacks = listeners.get(event);
				if (callbacks) {
					callbacks.delete(wrapped_callback);
					
					if (callbacks.size === 0)
						listeners.delete(event);
				}
			};
			
			const existing_callbacks = listeners.get(event);
			if (existing_callbacks)
				existing_callbacks.add(wrapped_callback);
			else
				listeners.set(event, new Set([wrapped_callback]));
		},

		off: (event: string, callback?: EventCallback) => {
			if (!callback) {
				listeners.delete(event);
				return;
			}

			const callbacks = listeners.get(event);
			if (callbacks) {
				callbacks.delete(callback);
				if (callbacks.size === 0)
					listeners.delete(event);
			}
		},

		emit: <T = any>(event: string, payload: T) => {
			const callbacks = listeners.get(event);
			if (callbacks) {
				for (const callback of callbacks)
					callback(payload);
			}
		}
	};
}