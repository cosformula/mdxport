import { visit } from 'unist-util-visit';
import type { Node, Parent } from 'unist';
import type { Paragraph, Text } from 'mdast';
import { PAGEBREAK_TOKEN } from '$lib/pagebreak';

export default function remarkPagebreakToken() {
	return (tree: Node) => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | undefined, parent: Parent | undefined) => {
			if (index === undefined || parent?.type !== 'root') return;
			if (node.children.length !== 1 || node.children[0]?.type !== 'text') return;

			const text = ((node.children[0] as Text).value ?? '').trim();
			if (text !== PAGEBREAK_TOKEN) return;

			parent.children.splice(index, 1, { type: 'pageBreak' } as any);
			return index + 1;
		});
	};
}
