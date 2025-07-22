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
		.attr('class', 'fx-form');

	let tab_index = 1;
	for (const [field_id, field] of Object.entries(schema.fields)) {
		const unique_field_id = `${schema.id}-${field_id}`;
		const $label = $form.child('label')
			.attr('for', unique_field_id);

		if (field.label) {
			$label.child('span')
				.attr('class', 'fx-label')
				.text(field.label);
		}

		const $input = $label.child('input')
			.attr('type', field.type)
			.attr('id', unique_field_id)
			.attr('class', `fx-input-${field.type}`)
			.attr('tabindex', tab_index.toString());

		tab_index++;

		if (field.max !== undefined)
			$input.attr('maxlength', field.max.toString());

		if (field.placeholder)
			$input.attr('placeholder', field.placeholder);
	}

	return $form.toString();
}