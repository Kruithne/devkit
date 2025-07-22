class WeaveElement {
	private static readonly void_elements = new Set([
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
		'link', 'meta', 'source', 'track', 'wbr'
	]);

	private tag: string;
	private children: WeaveElement[] = [];
	private attributes: Record<string, string> = {};
	private classes: Set<string> = new Set();
	private inner_text: string = '';
	private styles: Record<string, string> = {};

	constructor(tag: string) {
		this.tag = tag;
	}

	child(tag: string): WeaveElement {
		const child_element = new WeaveElement(tag);
		this.children.push(child_element);
		return child_element;
	}

	attr(key: string, value: string): WeaveElement {
		this.attributes[key] = value;
		return this;
	}

	text(content: string): WeaveElement {
		this.inner_text = content;
		return this;
	}

	cls(...names: string[]): WeaveElement {
		names.forEach(name => this.classes.add(name));
		return this;
	}

	style(styles: Record<string, string>): WeaveElement {
		Object.assign(this.styles, styles);
		return this;
	}

	toString(indent: boolean = true, indent_level: number = 0): string {
		const tabs = indent ? '\t'.repeat(indent_level) : '';
		
		const all_attributes = { ...this.attributes };
		if (this.classes.size > 0)
			all_attributes.class = Array.from(this.classes).join(' ');
		if (Object.keys(this.styles).length > 0)
			all_attributes.style = Object.entries(this.styles)
				.map(([key, value]) => `${key}: ${value}`)
				.join('; ');
		
		const attr_string = Object.entries(all_attributes)
			.map(([key, value]) => ` ${key}="${value}"`)
			.join('');

		if (WeaveElement.void_elements.has(this.tag))
			return `${tabs}<${this.tag}${attr_string}>`;

		if (this.children.length === 0 && this.inner_text === '')
			return `${tabs}<${this.tag}${attr_string}></${this.tag}>`;

		if (this.children.length === 0 && this.inner_text !== '')
			return `${tabs}<${this.tag}${attr_string}>${this.inner_text}</${this.tag}>`;

		const children_html = this.children
			.map(child => child.toString(indent, indent_level + 1))
			.join(indent ? '\n' : '');

		if (this.inner_text !== '') {
			if (indent)
				return `${tabs}<${this.tag}${attr_string}>\n${tabs}\t${this.inner_text}\n${children_html}\n${tabs}</${this.tag}>`;
			else
				return `${tabs}<${this.tag}${attr_string}>${this.inner_text}${children_html}</${this.tag}>`;
		}

		if (indent)
			return `${tabs}<${this.tag}${attr_string}>\n${children_html}\n${tabs}</${this.tag}>`;
		else
			return `${tabs}<${this.tag}${attr_string}>${children_html}</${this.tag}>`;
	}
}

export function element(tag: string): WeaveElement {
	return new WeaveElement(tag);
}