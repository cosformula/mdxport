import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import type {
	Blockquote,
	Code,
	Content,
	Definition,
	Emphasis,
	Heading,
	InlineCode,
	Link,
	LinkReference,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	Root,
	Strong,
	Text,
	Yaml
} from 'mdast';

export type MarkdownToTypstOptions = {
	title?: string;
	authors?: string[];
	style?: TypstStyleId;
	lang?: 'zh' | 'en';
};

export type TypstStyleId = 'modern-tech' | 'classic-editorial';

const STYLE_TO_TEMPLATE: Record<TypstStyleId, { path: string; entry: string }> = {
	'modern-tech': { path: 'styles/modern-tech.typ', entry: 'article' },
	'classic-editorial': { path: 'styles/classic-editorial.typ', entry: 'article' }
};

export function markdownToTypst(markdown: string, options: MarkdownToTypstOptions = {}): string {
	const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm).parse(markdown) as Root;
	const definitions = collectDefinitions(tree);
	const frontmatter = parseFrontmatter(tree);
	const { title: leadingTitle, index: leadingTitleIndex } = findLeadingH1(tree, definitions) ?? {
		title: null,
		index: null
	};

	const title = options.title ?? frontmatter.title ?? leadingTitle ?? '';
	const authors = options.authors ?? frontmatter.authors ?? [];
	const lang = coerceLanguage(frontmatter.lang) ?? options.lang ?? 'zh';

	const nodesForBody =
		leadingTitleIndex !== null && normalizeText(title) === normalizeText(leadingTitle)
			? tree.children.filter((_, index) => index !== leadingTitleIndex)
			: tree.children;

	const body = nodesForBody
		.map((node) => renderBlock(node, 0, definitions))
		.filter(isNonEmpty)
		.join('\n\n');

	const header: string[] = [];
	const styleId: TypstStyleId = options.style ?? 'modern-tech';
	const template = STYLE_TO_TEMPLATE[styleId] ?? STYLE_TO_TEMPLATE['modern-tech'];
	header.push(`#import "${template.path}": ${template.entry}`);
	const showArgs = [
		title ? `title: "${escapeTypstString(title)}"` : null,
		authors.length ? `authors: ${renderTypstArray(authors.map((a) => `"${escapeTypstString(a)}"`))}` : null,
		`lang: "${lang}"`
	]
		.filter(isNonEmpty)
		.join(', ');
	header.push(showArgs ? `#show: ${template.entry}.with(${showArgs})` : `#show: ${template.entry}`);

	return [header.join('\n'), '', body, ''].join('\n');
}

function renderTypstArray(items: string[]): string {
	if (items.length === 1) return `(${items[0]},)`;
	return `(${items.join(', ')})`;
}

function collectDefinitions(root: Root): Map<string, Definition> {
	const definitions = new Map<string, Definition>();
	for (const node of root.children) {
		if (node.type !== 'definition') continue;
		const def = node as Definition;
		definitions.set(def.identifier.toLowerCase(), def);
	}
	return definitions;
}

type Frontmatter = {
	title?: string;
	authors?: string[];
	lang?: string;
};

function parseFrontmatter(root: Root): Frontmatter {
	const yamlNode = root.children.find((node) => node.type === 'yaml') as Yaml | undefined;
	if (!yamlNode?.value) return {};
	return parseFrontmatterYaml(yamlNode.value);
}

function parseFrontmatterYaml(yaml: string): Frontmatter {
	const lines = yaml.split(/\r?\n/);
	const result: Frontmatter = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const langMatch = /^\s*lang(?:uage)?\s*:\s*(.+?)\s*$/.exec(line);
		if (langMatch && !result.lang) {
			result.lang = stripYamlScalar(langMatch[1]);
			continue;
		}

		const titleMatch = /^\s*title\s*:\s*(.+?)\s*$/.exec(line);
		if (titleMatch && !result.title) {
			result.title = stripYamlScalar(titleMatch[1]);
			continue;
		}

		const authorMatch = /^\s*author\s*:\s*(.+?)\s*$/.exec(line);
		if (authorMatch && !result.authors) {
			result.authors = [stripYamlScalar(authorMatch[1])].filter(Boolean);
			continue;
		}

		const authorsMatch = /^\s*authors\s*:\s*(.*?)\s*$/.exec(line);
		if (!authorsMatch || result.authors) continue;

		const rest = authorsMatch[1].trim();
		if (rest) {
			result.authors = parseInlineYamlList(rest);
			continue;
		}

		const list: string[] = [];
		for (let j = i + 1; j < lines.length; j++) {
			const itemMatch = /^\s*-\s*(.+?)\s*$/.exec(lines[j]);
			if (!itemMatch) break;
			list.push(stripYamlScalar(itemMatch[1]));
			i = j;
		}
		result.authors = list.filter(Boolean);
	}

	return result;
}

function parseInlineYamlList(value: string): string[] {
	const v = value.trim();
	if (!v) return [];
	if (v.startsWith('[') && v.endsWith(']')) {
		const inner = v.slice(1, -1);
		return inner
			.split(',')
			.map((s) => stripYamlScalar(s))
			.filter(Boolean);
	}
	return [stripYamlScalar(v)].filter(Boolean);
}

function stripYamlScalar(value: string): string {
	let v = value.trim();
	if (
		(v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
		(v.startsWith("'") && v.endsWith("'") && v.length >= 2)
	) {
		v = v.slice(1, -1);
	}
	return v.trim();
}

function coerceLanguage(value: string | undefined): 'zh' | 'en' | undefined {
	const v = (value ?? '').trim().toLowerCase();
	if (v.startsWith('zh')) return 'zh';
	if (v.startsWith('en')) return 'en';
	return undefined;
}

function findLeadingH1(
	root: Root,
	definitions: Map<string, Definition>
): { title: string; index: number } | null {
	for (let i = 0; i < root.children.length; i++) {
		const node = root.children[i];
		if (node.type === 'yaml' || node.type === 'definition') continue;
		if (node.type !== 'heading') return null;
		const heading = node as Heading;
		if (heading.depth !== 1) return null;
		const title = plainTextFromPhrasing(heading.children, definitions).trim();
		return title ? { title, index: i } : null;
	}
	return null;
}

function plainTextFromPhrasing(nodes: PhrasingContent[], definitions: Map<string, Definition>): string {
	return nodes.map((node) => plainTextFromPhrasingNode(node, definitions)).join('');
}

function plainTextFromPhrasingNode(node: PhrasingContent, definitions: Map<string, Definition>): string {
	switch (node.type) {
		case 'text':
			return (node as Text).value;
		case 'strong':
		case 'emphasis':
			return plainTextFromPhrasing((node as Strong).children, definitions);
		case 'inlineCode':
			return (node as InlineCode).value;
		case 'link':
			return plainTextFromPhrasing((node as Link).children, definitions);
		case 'linkReference': {
			const lr = node as LinkReference;
			const label = plainTextFromPhrasing(lr.children, definitions);
			if (label.trim()) return label;
			const def = definitions.get(lr.identifier.toLowerCase());
			return def ? def.url : lr.label || lr.identifier;
		}
		case 'break':
			return '\n';
		default:
			return '';
	}
}

function normalizeText(value: string | null): string {
	return (value ?? '').trim();
}

function renderBlock(
	node: Content,
	indentLevel: number,
	definitions: Map<string, Definition>
): string | null {
	switch (node.type) {
		case 'yaml':
		case 'definition':
			return null;
		case 'heading':
			return renderHeading(node as Heading, indentLevel, definitions);
		case 'paragraph':
			return indentLines(renderParagraph(node as Paragraph, definitions), indentLevel);
		case 'list':
			return renderList(node as List, indentLevel, definitions);
		case 'code':
			return renderCodeBlock(node as Code, indentLevel);
		case 'blockquote':
			return renderBlockquote(node as Blockquote, indentLevel, definitions);
		case 'thematicBreak':
			return indentLines('#line(length: 100%, stroke: 0.6pt)', indentLevel);
		default:
			return null;
	}
}

function renderHeading(node: Heading, indentLevel: number, definitions: Map<string, Definition>): string {
	const level = Math.min(Math.max(node.depth, 1), 6);
	return indentLines(`${'='.repeat(level)} ${renderInlines(node.children, definitions)}`, indentLevel);
}

function renderParagraph(node: Paragraph, definitions: Map<string, Definition>): string {
	return renderInlines(node.children, definitions);
}

function renderList(node: List, indentLevel: number, definitions: Map<string, Definition>): string {
	const marker = node.ordered ? '+' : '-';
	return node.children
		.map((item) => renderListItem(item, marker, indentLevel, definitions))
		.filter(isNonEmpty)
		.join('\n');
}

function renderListItem(
	node: ListItem,
	marker: string,
	indentLevel: number,
	definitions: Map<string, Definition>
): string {
	const baseIndent = '  '.repeat(indentLevel);
	const nestedIndentLevel = indentLevel + 1;

	const first = node.children[0];
	const lines: string[] = [];

	if (first?.type === 'paragraph') {
		lines.push(`${baseIndent}${marker} ${renderParagraph(first as Paragraph, definitions)}`);
		for (const child of node.children.slice(1)) {
			if (child.type === 'list') {
				lines.push(renderList(child as List, nestedIndentLevel, definitions));
				continue;
			}
			const rendered = renderBlock(child as Content, nestedIndentLevel, definitions);
			if (rendered) lines.push(rendered);
		}
		return lines.join('\n');
	}

	lines.push(`${baseIndent}${marker}`);
	for (const child of node.children) {
		if (child.type === 'list') {
			lines.push(renderList(child as List, nestedIndentLevel, definitions));
			continue;
		}
		const rendered = renderBlock(child as Content, nestedIndentLevel, definitions);
		if (rendered) lines.push(rendered);
	}
	return lines.join('\n');
}

function renderCodeBlock(node: Code, indentLevel: number): string {
	const info = node.lang?.trim() ? node.lang.trim() : '';
	const value = node.value.replace(/\n$/, '');
	const fence = '`'.repeat(Math.max(3, maxBacktickRun(value) + 1));
	const open = info ? `${fence}${info}` : fence;
	const indentedCode = indentLines(value, indentLevel);
	return [indentLines(open, indentLevel), indentedCode, indentLines(fence, indentLevel)].join('\n');
}

function maxBacktickRun(value: string): number {
	let maxRun = 0;
	let run = 0;
	for (let i = 0; i < value.length; i++) {
		if (value[i] === '`') {
			run++;
			if (run > maxRun) maxRun = run;
			continue;
		}
		run = 0;
	}
	return maxRun;
}

function renderBlockquote(node: Blockquote, indentLevel: number, definitions: Map<string, Definition>): string {
	const body = node.children
		.map((child) => renderBlock(child, 0, definitions))
		.filter(isNonEmpty)
		.join('\n\n');

	const open = indentLines('#quote[', indentLevel);
	if (!body.trim()) return `${open}\n${indentLines(']', indentLevel)}`;

	return [open, indentLines(body, indentLevel + 1), indentLines(']', indentLevel)].join('\n');
}

function renderInlines(nodes: PhrasingContent[], definitions: Map<string, Definition>): string {
	return nodes.map((node) => renderInline(node, definitions)).filter(isNonEmpty).join('');
}

function renderInline(node: PhrasingContent, definitions: Map<string, Definition>): string | null {
	switch (node.type) {
		case 'text':
			return escapeTypstText((node as Text).value);
		case 'strong':
			return `*${renderInlines((node as Strong).children, definitions)}*`;
		case 'emphasis':
			return `_${renderInlines((node as Emphasis).children, definitions)}_`;
		case 'inlineCode':
			return renderInlineCode(node as InlineCode);
		case 'link':
			return renderLink(node as Link, definitions);
		case 'linkReference':
			return renderLinkReference(node as LinkReference, definitions);
		case 'break':
			return '\\\n';
		default:
			return null;
	}
}

function renderInlineCode(node: InlineCode): string {
	const value = node.value.replace(/`/g, '\\`');
	return `\`${value}\``;
}

function renderLink(node: Link, definitions: Map<string, Definition>): string {
	const url = escapeTypstString(node.url);
	const label = renderInlines(node.children, definitions);
	if (!label.trim()) return `#link("${url}")[${escapeTypstText(node.url)}]`;
	return `#link("${url}")[${label}]`;
}

function renderLinkReference(node: LinkReference, definitions: Map<string, Definition>): string | null {
	const def = definitions.get(node.identifier.toLowerCase());
	const label = renderInlines(node.children, definitions);
	if (!def) return label || escapeTypstText(node.label || node.identifier);
	const url = escapeTypstString(def.url);
	if (!label.trim()) return `#link("${url}")[${escapeTypstText(def.url)}]`;
	return `#link("${url}")[${label}]`;
}

function escapeTypstText(input: string): string {
	return input.replace(/[\\#*_`\[\]\$]/g, (c) => `\\${c}`);
}

function escapeTypstString(input: string): string {
	return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function indentLines(text: string, indentLevel: number): string {
	if (!indentLevel) return text;
	const indent = '  '.repeat(indentLevel);
	return text
		.split('\n')
		.map((line) => `${indent}${line}`)
		.join('\n');
}

function isNonEmpty(value: string | null | undefined): value is string {
	return typeof value === 'string' && value.length > 0;
}
