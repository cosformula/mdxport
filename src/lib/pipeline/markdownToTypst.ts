import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
// @ts-ignore
import remarkMark from 'remark-mark';
// @ts-ignore
// @ts-ignore
import remarkSupersub from './plugins/remark-simple-supersub';
import remarkParse from 'remark-parse';
import type {
	Blockquote,
	Code,
	Content,
	Delete,
	Definition,
	Emphasis,
	FootnoteDefinition,
	FootnoteReference,
	Heading,
	Html,
	Image,
	InlineCode,
	Link,
	LinkReference,
	List,
	ListItem,
	Literal,
	Paragraph,
	PhrasingContent,
	Root,
	Strong,
	Table,
	TableCell,
	TableRow,
	Text,
	Yaml
} from 'mdast';

interface Mark extends Literal {
	type: 'mark';
	children: PhrasingContent[];
}

interface SuperScript extends Literal {
	type: 'superscript';
	children: PhrasingContent[];
}

interface SubScript extends Literal {
	type: 'subscript';
	children: PhrasingContent[];
}

interface MathNode extends Literal {
	type: 'math';
}

interface InlineMathNode extends Literal {
	type: 'inlineMath';
}

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
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter, ['yaml'])
		.use(remarkGfm, { singleTilde: false })
		.use(remarkMath)
		//.use(remarkMark)
		.use(remarkSupersub);

	const parsedTree = processor.parse(markdown);
	const tree = processor.runSync(parsedTree) as Root;
	const definitions = collectDefinitions(tree);
	const footnoteDefinitions = collectFootnotes(tree);
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
		.map((node) => renderBlock(node, 0, definitions, footnoteDefinitions))
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

function collectFootnotes(root: Root): Map<string, FootnoteDefinition> {
	const definitions = new Map<string, FootnoteDefinition>();
	for (const node of root.children) {
		if (node.type !== 'footnoteDefinition') continue;
		const def = node as FootnoteDefinition;
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
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string | null {
	switch (node.type) {
		case 'yaml':
		case 'definition':
		case 'footnoteDefinition':
			return null;
		case 'heading':
			return renderHeading(node as Heading, indentLevel, definitions, footnoteDefinitions);
		case 'paragraph':
			return indentLines(
				renderParagraph(node as Paragraph, definitions, footnoteDefinitions),
				indentLevel
			);
		case 'list':
			return renderList(node as List, indentLevel, definitions, footnoteDefinitions);
		case 'code':
			return renderCodeBlock(node as Code, indentLevel);
		case 'blockquote':
			return renderBlockquote(node as Blockquote, indentLevel, definitions, footnoteDefinitions);
		case 'thematicBreak':
			return indentLines('#line(length: 100%, stroke: 0.6pt)', indentLevel);
		case 'table':
			return renderTable(node as Table, indentLevel, definitions, footnoteDefinitions);
		case 'math':
			return renderMathBlock(node as MathNode, indentLevel);
		default:
			return null;
	}
}

function renderMathBlock(node: MathNode, indentLevel: number): string {
	// Block math in Typst uses spaces: $ block $
	return indentLines(`$ ${node.value.trim()} $`, indentLevel);
}

function renderHeading(
	node: Heading,
	indentLevel: number,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const level = Math.min(Math.max(node.depth, 1), 6);
	return indentLines(
		`${'='.repeat(level)} ${renderInlines(node.children, definitions, footnoteDefinitions)}`,
		indentLevel
	);
}

function renderParagraph(
	node: Paragraph,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	// Check for [toc]
	const text = plainTextFromPhrasing(node.children, definitions).trim().toLowerCase();
	if (text === '[toc]') {
		return `#outline(title: auto, indent: auto)`;
	}
	return renderInlines(node.children, definitions, footnoteDefinitions);
}

function renderList(
	node: List,
	indentLevel: number,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const marker = node.ordered ? '+' : '-';
	return node.children
		.map((item) => renderListItem(item, marker, indentLevel, definitions, footnoteDefinitions))
		.filter(isNonEmpty)
		.join('\n');
}

function renderListItem(
	node: ListItem,
	marker: string,
	indentLevel: number,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const baseIndent = '  '.repeat(indentLevel);
	const nestedIndentLevel = indentLevel + 1;

	const first = node.children[0];
	const lines: string[] = [];

	if (first?.type === 'paragraph') {
		lines.push(
			`${baseIndent}${marker} ${renderParagraph(first as Paragraph, definitions, footnoteDefinitions)}`
		);
		for (const child of node.children.slice(1)) {
			if (child.type === 'list') {
				lines.push(renderList(child as List, nestedIndentLevel, definitions, footnoteDefinitions));
				continue;
			}
			const rendered = renderBlock(child as Content, nestedIndentLevel, definitions, footnoteDefinitions);
			if (rendered) lines.push(rendered);
		}
		return lines.join('\n');
	}

	lines.push(`${baseIndent}${marker}`);
	for (const child of node.children) {
		if (child.type === 'list') {
			lines.push(renderList(child as List, nestedIndentLevel, definitions, footnoteDefinitions));
			continue;
		}
		const rendered = renderBlock(child as Content, nestedIndentLevel, definitions, footnoteDefinitions);
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

function renderTable(
	node: Table,
	indentLevel: number,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const rows = node.children as TableRow[];
	if (rows.length === 0) return '';

	// Get column count from first row
	const headerRow = rows[0];
	const colCount = headerRow.children.length;

	// Get alignment from node.align
	const alignMap: Record<string, string> = {
		left: 'left',
		right: 'right',
		center: 'center'
	};
	const aligns = (node.align ?? []).map((a) => alignMap[a ?? 'left'] ?? 'left');

	// Build column specification
	const columns = Array(colCount).fill('1fr').join(', ');

	// Build table content
	const headerCells: string[] = [];
	for (const cell of headerRow.children as TableCell[]) {
		const content = renderInlines(cell.children, definitions, footnoteDefinitions);
		headerCells.push(`[*${content}*]`);
	}

	const dataCells: string[] = [];
	for (let i = 1; i < rows.length; i++) {
		const row = rows[i];
		for (const cell of row.children as TableCell[]) {
			const content = renderInlines(cell.children, definitions, footnoteDefinitions);
			dataCells.push(`[${content}]`);
		}
	}

	// Build align argument
	const alignArgs = aligns.slice(0, colCount).map((a) => a).join(', ');

	const lines = [
		`#table(`,
		`  columns: (${columns}),`,
		`  align: (${alignArgs}),`,
		`  table.header(${headerCells.join(', ')}),`,
		`  ${dataCells.join(', ')}`,
		`)`
	];

	return indentLines(lines.join('\n'), indentLevel);
}

function renderBlockquote(
	node: Blockquote,
	indentLevel: number,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const body = node.children
		.map((child) => renderBlock(child, 0, definitions, footnoteDefinitions))
		.filter(isNonEmpty)
		.join('\n\n');

	const open = indentLines('#quote[', indentLevel);
	if (!body.trim()) return `${open}\n${indentLines(']', indentLevel)}`;

	return [open, indentLines(body, indentLevel + 1), indentLines(']', indentLevel)].join('\n');
}

function renderInlines(
	nodes: PhrasingContent[],
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	return nodes
		.map((node) => renderInline(node, definitions, footnoteDefinitions))
		.filter(isNonEmpty)
		.join('');
}

function renderInline(
	node: PhrasingContent,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string | null {
	switch ((node as any).type) {
		case 'text':
			return escapeTypstText((node as Text).value);
		case 'strong':
			// Use #strong[] function form to avoid ambiguity with /* comments and other edge cases
			return `#strong[${renderInlines((node as Strong).children, definitions, footnoteDefinitions)}]`;
		case 'emphasis':
			// Use #emph[] function form to avoid potential parsing issues
			return `#emph[${renderInlines((node as Emphasis).children, definitions, footnoteDefinitions)}]`;
		case 'delete':
			return `#strike[${renderInlines((node as unknown as Delete).children, definitions, footnoteDefinitions)}]`;
		case 'mark':
			return `#highlight[${renderInlines((node as unknown as Mark).children, definitions, footnoteDefinitions)}]`;
		case 'subscript':
			return `#sub[${renderInlines((node as unknown as SubScript).children, definitions, footnoteDefinitions)}]`;
		case 'superscript':
			return `#super[${renderInlines((node as unknown as SuperScript).children, definitions, footnoteDefinitions)}]`;
		case 'footnoteReference': {
			const ref = node as FootnoteReference;
			const def = footnoteDefinitions.get(ref.identifier.toLowerCase());
			if (!def) return ''; // Or render failure?
			// Render footnote content inline
			const content = def.children
				.map((child) => renderBlock(child, 0, definitions, footnoteDefinitions))
				.filter(isNonEmpty)
				.join(' '); // Join blocks with space for inline footnote
			return `#footnote[${content.trim()}]`;
		}
		case 'inlineCode':
			return renderInlineCode(node as InlineCode);
		case 'inlineMath':
			return `$${(node as InlineMathNode).value.trim()}$`;
		case 'image':
			return renderImage(node as Image);
		case 'link':
			return renderLink(node as Link, definitions, footnoteDefinitions);
		case 'linkReference':
			return renderLinkReference(node as LinkReference, definitions, footnoteDefinitions);
		case 'break':
			return '\\\n';
		case 'html':
			// Treat inline HTML as literal text, escape it for Typst
			return escapeTypstText((node as Html).value);
		default:
			return null;
	}
}

function renderInlineCode(node: InlineCode): string {
	const value = node.value.replace(/`/g, '\\`');
	return `\`${value}\``;
}

function renderImage(node: Image): string {
	// Basic image support. 
	// If alt text exists, we could use it for accessibility or caption, but Typst #image doesn't strictly require it.
	// We'll just output the image function.
	return `#image("${escapeTypstString(node.url)}")`;
}

function renderLink(
	node: Link,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string {
	const url = escapeTypstString(node.url);
	const label = renderInlines(node.children, definitions, footnoteDefinitions);
	if (!label.trim()) return `#link("${url}")[${escapeTypstText(node.url)}]`;
	return `#link("${url}")[${label}]`;
}

function renderLinkReference(
	node: LinkReference,
	definitions: Map<string, Definition>,
	footnoteDefinitions: Map<string, FootnoteDefinition>
): string | null {
	const def = definitions.get(node.identifier.toLowerCase());
	const label = renderInlines(node.children, definitions, footnoteDefinitions);
	if (!def) return label || escapeTypstText(node.label || node.identifier);
	const url = escapeTypstString(def.url);
	if (!label.trim()) return `#link("${url}")[${escapeTypstText(def.url)}]`;
	return `#link("${url}")[${label}]`;
}

function escapeTypstText(input: string): string {
	return input.replace(/[\\#*_`\[\]\$<>@]/g, (c) => `\\${c}`);
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
