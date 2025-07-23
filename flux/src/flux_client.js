const default_error_messages = {
	required: 'This field is required',
	invalid_number: 'Must be a valid number',
	number_too_small: 'Must be at least {min}',
	number_too_large: 'Must be no more than {max}',
	// todo: dual range error
	text_too_small: 'Must be at least {min} characters',
	text_too_large: 'Must not exceed {max} characters'
};

export function form_component(app, container_id) {
	const container_selector = `#${container_id}.fx-form`;
	const component_id = `component_${container_id}`;
	const $container = document.querySelector(container_selector);

	if (!$container) {
		console.error(`failed to add ${component_id}, selector ${container_selector} failed`);
		return;
	}

	const component = {
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

				const $form = this.$refs.form;

				const form_data = {};
				const fields = $form.querySelectorAll(`[data-fx-field-id]`);
				
				for (const field of fields) {
					const field_id = field.getAttribute('data-fx-field-id');
					const $input = field.querySelector('.fx-input');

					if ($input)
						form_data[field_id] = $input.value;
				}

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
								state.error = this.resolve_error_message(data.field_errors[field_id], field_id);
							}
						}
					}
				} catch (error) {
					console.error('Submission failed:', error); // todo: get rid of this
				}
			},

			handle_field_input(field_id) {
				const $field = this.$refs.form.querySelector(`[data-fx-field-id='${field_id}']`);
				if (!$field.classList.contains('fx-error'))
					return;

				this.validate_field($field, field_id);
			},

			handle_field_blur(field_id) {
				const $field = this.$refs.form.querySelector(`[data-fx-field-id='${field_id}']`);
				this.validate_field($field, field_id);
			},

			resolve_custom_error_message(error_code, field_id) {
				const $form = this.$refs.form;

				// per-field custom error
				const $field_cst = $form.querySelector(`[data-fx-c-err='${error_code}'][data-fx-c-err-id='${field_id}']`);
				if ($field_cst)
					return $field_cst.value;

				// global custom error
				const $global_cst = $form.querySelector(`[data-fx-c-err='${error_code}']:not([data-fx-c-err-id])`);
				if ($global_cst)
					return $global_cst.value;

				return default_error_messages[error_code];
			},

			resolve_error_message(message, field_id) {
				if (typeof message === 'string')
					return this.resolve_custom_error_message(message, field_id);

				let error_message = this.resolve_custom_error_message(message.err, field_id);
				if (message.params) {
					for (const param in message.params)
						error_message = error_message.replace(`{${param}}`, message.params[param]);
				}
				
				return error_message;
			},
			
			validate_field($field, field_id) {
				const $input = $field.querySelector('.fx-input');

				if (!$field || !$input)
					return;

				const state = this.state[field_id];
				if (!state)
					return;
				
				// clear error state
				state.has_error = false;
				state.error = '';		

				const value = $input.value?.trim();
				const input_type = $input.getAttribute('type');

				// fields are required if fx-v-required is 'true' or undefined
				const field_required = $field.getAttribute('fx-v-required') !== 'false';
				if (field_required && value.length === 0) {
					state.has_error = true;
					state.error = this.resolve_error_message('required', field_id);
					return;
				}
				
				if (input_type === 'number') {
					const min = $field.getAttribute('fx-v-min');
					const max = $field.getAttribute('fx-v-max');

					const num_value = parseFloat(value);
					if (isNaN(num_value) && value !== '') {
						state.has_error = true;
						state.error = this.resolve_error_message('invalid_number', field_id);
						return;
					}
					
					if (min !== null && num_value < parseFloat(min)) {
						state.has_error = true;
						state.error = `Must be at least ${min}`;
						state.error = this.resolve_error_message({ err: 'number_too_small', params: { min } }, field_id);
						return;
					}
					
					if (max !== null && num_value > parseFloat(max)) {
						state.has_error = true;
						state.error = this.resolve_error_message({ err: 'number_too_large', params: { max } }, field_id);
						return;
					}
				} else {
					const min = $field.getAttribute('fx-v-min-length');
					const max = $field.getAttribute('fx-v-max-length');

					if (min !== null && value.length < parseInt(min)) {
						state.has_error = true;
						state.error = this.resolve_error_message({ err: 'text_too_small', params: { min } }, field_id);
						return;
					}
					
					if (max !== null && value.length > parseInt(max)) {
						state.has_error = true;
						state.error = this.resolve_error_message({ err: 'text_too_large', params: { max } }, field_id);
						return;
					}
				}
			}
		}
    }

	app.component(component_id, component);

	return component; // todo: do we need to return this now?
}