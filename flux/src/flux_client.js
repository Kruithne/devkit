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
							if (this.state[field_id]) {
								this.state[field_id].has_error = true;
								this.state[field_id].error = data.field_errors[field_id];
							}
						}
					}
				} catch (error) {
					console.error('Submission failed:', error);
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
				$field.classList.remove('fx-error');
				state.has_error = false;
				state.error = '';		

				const value = $input.value;
				const min_attr = $field.getAttribute('fx-v-min');
				const max_attr = $field.getAttribute('fx-v-max');
				const input_type = $input.getAttribute('type');
				
				if (input_type === 'number') {
					const num_value = parseFloat(value);
					if (isNaN(num_value) && value !== '') {
						$field.classList.add('fx-error');
						state.has_error = true;
						state.error = 'Must be a valid number';
						return;
					}
					
					if (min_attr !== null && num_value < parseFloat(min_attr)) {
						$field.classList.add('fx-error');
						state.has_error = true;
						state.error = `Must be at least ${min_attr}`;
						return;
					}
					
					if (max_attr !== null && num_value > parseFloat(max_attr)) {
						$field.classList.add('fx-error');
						state.has_error = true;
						state.error = `Must be no more than ${max_attr}`;
						return;
					}
				} else {
					if (min_attr !== null && value.length < parseInt(min_attr)) {
						$field.classList.add('fx-error');
						state.has_error = true;
						state.error = `Must be at least ${min_attr} characters`;
						return;
					}
					
					if (max_attr !== null && value.length > parseInt(max_attr)) {
						$field.classList.add('fx-error');
						state.has_error = true;
						state.error = `Must be no more than ${max_attr} characters`;
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