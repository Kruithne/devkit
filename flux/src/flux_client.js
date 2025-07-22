const default_error_messages = {
	required: 'This field is required',
	invalid_number: 'Must be a valid number',
	number_too_small: 'Must be at least {min}',
	number_too_large: 'Must be no more than {max}',
	// todo: dual range error
	string_too_small: 'Must be at least {min} characters',
	string_too_large: 'Must not exceed {max} characters'
};

function resolve_error_message(message) {
	if (typeof message === 'string')
		return default_error_messages[message];

	let error_message = default_error_messages[message.err];
	if (message.params) {
		for (const param in message.params)
			error_message = error_message.replace(`{${param}}`, message.params[param]);
	}
	
	return error_message;
}

export function form_component($container) {
	return {
		template: $container.innerHTML ?? '',
		
		data() {
			const state = {};
			const fields = $container.querySelectorAll('.fx-field');
			
			for (const field of fields) {
				state[field.getAttribute('data-fx-field-id')] = {
					has_error: false,
					error: ''
				};
			}
			
			return {
				state
			};
		},

		methods: {
			async submit() {
				for (const field_id in this.state) {
					if (this.state[field_id].has_error)
						return;
				}

				const form_data = {};
				const fields = document.querySelectorAll(`[data-fx-field-id]`);
				
				for (const field of fields) {
					const field_id = field.getAttribute('data-fx-field-id');
					const $input = field.querySelector('.fx-input');

					if ($input)
						form_data[field_id] = $input.value;
				}

				const $form = document.querySelector('.fx-form');
				const endpoint = $form.getAttribute('data-fx-endpoint');

				try {
					const response = await fetch(endpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(form_data)
					});

					if (response.status !== 200)
						throw new Error('Internal server error'); // todo
					
					const data = await response.json();
					
					if (data.error) // todo: placeholder
						console.error(data.error);
					
					if (data.field_errors) {
						for (const field_id in data.field_errors) {
							const state = this.state[field_id];
							if (state) {
								state.has_error = true;
								state.error = resolve_error_message(data.field_errors[field_id]);
							}
						}
					}
				} catch (error) {
					console.error('Submission failed:', error); // todo: get rid of this
				}
			},
			
			validate_field(field_id) {
				const $field = document.querySelector(`[data-fx-field-id='${field_id}'`);
				const $input = $field.querySelector('.fx-input');

				if (!$field || !$input)
					return;

				const state = this.state[field_id];
				if (!state)
					return;
				
				// clear error state
				state.has_error = false;
				state.error = '';		

				const value = $input.value;
				const min = $field.getAttribute('fx-v-min');
				const max = $field.getAttribute('fx-v-max');
				const input_type = $input.getAttribute('type');
				
				if (input_type === 'number') {
					const num_value = parseFloat(value);
					if (isNaN(num_value) && value !== '') {
						state.has_error = true;
						state.error = resolve_error_message('invalid_number');
						return;
					}
					
					if (min !== null && num_value < parseFloat(min)) {
						state.has_error = true;
						state.error = `Must be at least ${min}`;
						state.error = resolve_error_message({ err: 'number_too_small', params: { min } });
						return;
					}
					
					if (max !== null && num_value > parseFloat(max)) {
						state.has_error = true;
						state.error = resolve_error_message({ err: 'number_too_large', params: { max } });
						return;
					}
				} else {
					if (min !== null && value.length < parseInt(min)) {
						state.has_error = true;
						state.error = resolve_error_message({ err: 'string_too_small', params: { min } });
						return;
					}
					
					if (max !== null && value.length > parseInt(max)) {
						state.has_error = true;
						state.error = resolve_error_message({ err: 'string_too_large', params: { ax } });
						return;
					}
				}
			}
		}
    }
}

export function form_auto_components() {
	const containers = document.querySelectorAll('.fx-form');
	const components = {};
	
	for (const $container of containers)
		components[`component_${$container.id}`] = form_component($container);
	
	return components;
}