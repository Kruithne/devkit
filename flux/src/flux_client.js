export function form_component(id) {
	const element = document.getElementById(id);
	
	return {
		template: element?.innerHTML ?? '',
		
		data() {
			return {
				comp_test: 'Foobar'
			};
		},

		methods: {
			submit() {
				alert('Test');
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