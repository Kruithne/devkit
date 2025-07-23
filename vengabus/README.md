# 🚌 vengabus &middot; ![typescript](https://img.shields.io/badge/language-typescript-blue) [![license badge](https://img.shields.io/github/license/Kruithne/devkit?color=yellow)](LICENSE)

`vengabus` is a tiny TypeScript event bus.

# Example

```typescript
const bus = create_event_bus();

// Regular event listener
bus.on('data_received', (data) => {
	console.log('Received:', data);
});

// One-time listener (auto-removes after first call)
bus.once('startup_complete', () => {
	console.log('App started successfully!');
});

// Emit events with typed payloads
bus.emit('data_received', { message: 'Hello World', timestamp: Date.now() });
bus.emit('startup_complete', null);

// Remove specific listener
const handler = (error) => console.error('Error:', error);
bus.on('error', handler);
bus.off('error', handler); // Remove specific handler

// Remove all listeners for an event
bus.off('error'); // Remove all error listeners
```

# API

## `create_event_bus()`

Creates a new event bus instance. Returns an event bus object with methods for managing events.

```typescript
const bus = create_event_bus();
```

## Methods

### `.on<T>(event: string, callback: EventCallback<T>)`

Adds an event listener for the specified event. The listener will be called every time the event is emitted.

```typescript
bus.on('user_login', (user) => {
	console.log(`Welcome ${user.name}!`);
});
```

### `.once<T>(event: string, callback: EventCallback<T>)`

Adds a one-time event listener that automatically removes itself after being called once.

```typescript
bus.once('initialization', (config) => {
	console.log('App initialized with config:', config);
});
```

### `.off(event: string, callback?: EventCallback)`

Removes event listeners. If `callback` is provided, removes only that specific listener. If `callback` is omitted, removes all listeners for the event.

```typescript
// Remove specific listener
const handler = (data) => console.log(data);
bus.on('test', handler);
bus.off('test', handler);

// Remove all listeners for event
bus.off('test');
```

### `.emit<T>(event: string, payload: T)`

Emits an event with the specified payload. All listeners for the event will be called with the payload.

```typescript
bus.emit('user_action', { 
	action: 'click', 
	target: 'button',
	timestamp: Date.now() 
});
```

## Type Safety

The event bus is fully typed and supports generic type parameters for event payloads:

```typescript
interface UserData {
	id: number;
	name: string;
	email: string;
}

// Type-safe event handling
bus.on<UserData>('user_updated', (user) => {
	// user is properly typed as UserData
	console.log(`User ${user.name} (${user.email}) was updated`);
});

bus.emit<UserData>('user_updated', {
	id: 1,
	name: 'John Doe', 
	email: 'john@example.com'
});
```