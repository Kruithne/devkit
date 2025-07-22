export function form_component(id) {
	const element = document.getElementById(id);
	
	return {
		template: element?.innerHTML ?? '',
		
		data() {
			const state = {};
			const fields = element.querySelectorAll('.fx-field');
			
			for (const field of fields) {
				state[field.getAttribute('data-fx-id')] = {
					has_error: false,
					error: ''
				};
			}
			
			return {
				state
			};
		},

		methods: {
			submit() {
				alert('Test');
			},
			
			validate_field(field_id) {
				const $field = document.querySelector(`[data-fx-id='${field_id}'`);
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

				if ($input.value !== 'test') {
					$field.classList.add('fx-error');
					state.has_error = true;
					state.error = 'User did not write test';
				}
			}
		}
    }
}

export function form_auto_components() {
	const form_elements = document.querySelectorAll('.fx-form');
	const components = {};
	
	for (const element of form_elements) {
		if (element.id)
			components[`component_${element.id}`] = form_component(element.id);
	}
	
	return components;
}