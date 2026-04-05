import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkPagebreakToken from './plugins/remark-pagebreak-token';
import type { Root, Content, Heading, Text, List, ListItem, Paragraph, Table, TableRow, TableCell, Strong, Emphasis, Link, InlineCode } from 'mdast';

/**
 * A specialized, lightweight Markdown to HTML renderer for SEO purposes.
 * It focuses on semantic tags that search engines love (h1, p, ul, li, table, etc.)
 */
export function markdownToHtml(markdown: string): string {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkPagebreakToken);

    const tree = processor.parse(markdown) as Root;
    return renderNodes(tree.children);
  } catch (e) {
    console.error('SEO Markdown to HTML failed', e);
    return '';
  }
}

function renderNodes(nodes: Content[]): string {
  return nodes.map(renderNode).join('\n');
}

function renderNode(node: Content): string {
  switch ((node as any).type) {
    case 'heading': {
      const h = node as Heading;
      const tag = `h${Math.min(6, h.depth)}`;
      return `<${tag}>${renderNodes(h.children as any)}</${tag}>`;
    }
    case 'paragraph':
      return `<p>${renderNodes((node as Paragraph).children as any)}</p>`;
    case 'list': {
      const l = node as List;
      const tag = l.ordered ? 'ol' : 'ul';
      return `<${tag}>${renderNodes(l.children as any)}</${tag}>`;
    }
    case 'listItem':
      return `<li>${renderNodes((node as ListItem).children as any)}</li>`;
    case 'table':
      return `<table>${renderNodes((node as Table).children as any)}</table>`;
    case 'tableRow':
      return `<tr>${renderNodes((node as TableRow).children as any)}</tr>`;
    case 'tableCell':
      return `<td>${renderNodes((node as TableCell).children as any)}</td>`;
    case 'strong':
      return `<strong>${renderNodes((node as Strong).children as any)}</strong>`;
    case 'emphasis':
      return `<em>${renderNodes((node as Emphasis).children as any)}</em>`;
    case 'link':
      return `<a href="${(node as Link).url}">${renderNodes((node as Link).children as any)}</a>`;
    case 'text':
      return (node as Text).value;
    case 'inlineCode':
      return `<code>${(node as InlineCode).value}</code>`;
    case 'code':
      return `<pre><code>${(node as any).value}</code></pre>`;
    case 'blockquote':
      return `<blockquote>${renderNodes((node as any).children as any)}</blockquote>`;
    case 'thematicBreak':
    case 'pageBreak':
      return '<hr />';
    default:
      return '';
  }
}
