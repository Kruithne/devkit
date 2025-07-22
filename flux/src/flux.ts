import { element } from '../../weave/src/weave';

type FormField = {
	type: 'text' | 'number' | 'password';
	label?: string;
	min?: number;
	max?: number;
	placeholder?: string;
};

type FormSchema = {
	id: string;
	fields: Record<string, FormField>;
};

export function form_create_schema(schema: FormSchema): FormSchema {
	return schema;
}

export function form_render_html(schema: FormSchema) {
	const $form = element('form')
		.attr('id', schema.id)
		.attr('is', `vue:component_${schema.id}`)
		.cls('fx-form');

	let tab_index = 1;
	for (const [field_id, field] of Object.entries(schema.fields)) {
		const unique_field_id = `${schema.id}-${field_id}`;
		const $label = $form.child('label')
			.attr('for', unique_field_id)
			.attr('data-fx-id', field_id)
			.cls('fx-field');

		if (field.label) {
			$label.child('span')
				.cls('fx-label')
				.text(field.label);
		}

		$label.child('span')
			.cls('fx-error-text')
			.attr('v-if', `state['${field_id}'].has_error`)
			.text(`{{ state['${field_id}'].error }}`);

		const $input = $label.child('input')
			.attr('type', field.type)
			.attr('id', unique_field_id)
			.attr('tabindex', tab_index.toString())
			.attr('@blur', `validate_field('${field_id}')`)
			.cls('fx-input', `fx-input-${field.type}`);

		tab_index++;

		if (field.max !== undefined)
			$input.attr('maxlength', field.max.toString());

		if (field.placeholder)
			$input.attr('placeholder', field.placeholder);
	}

	// placeholder
	const $submit = $form.child('input')
		.attr('type', 'button')
		.attr('value', 'Submit')
		.attr('@click', 'submit');

	return $form.toString();
}