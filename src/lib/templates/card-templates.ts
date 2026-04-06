import type { UILang } from '$lib/i18n/lang';
import type { Template } from './pdf-templates';

export const CARD_TEMPLATES: Record<UILang, Template[]> = {
	zh: [
		{
			id: 'quick-start',
			name: '快速上手',
			icon: '📖',
			content: `# 社交卡片快速上手

用 Markdown 制作精美社交媒体卡片

[[pagebreak]]

## 如何分页

用 \`[[pagebreak]]\` 将内容分成多张卡片。

每张卡片的内容不宜过多，留白才好看。

[[pagebreak]]

## 支持的格式

**加粗**、*斜体*、~~删除线~~、\`行内代码\`

- 无序列表
- 支持嵌套
  - 像这样

1. 有序列表
2. 也支持

> 引用块非常适合用来突出重点

[[pagebreak]]

## 代码与公式

代码块支持语法高亮：

\`\`\`python
print("Hello, MDXport!")
\`\`\`

数学公式使用 LaTeX 语法：

行内公式 $E = mc^2$，或独立公式：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

[[pagebreak]]

## 表格

| 功能 | 支持 |
|------|------|
| Markdown 基础语法 | ✓ |
| GFM 扩展语法 | ✓ |
| LaTeX 数学公式 | ✓ |
| 代码语法高亮 | ✓ |

[[pagebreak]]

## 小贴士

1. 第一张卡片通常是「封面」，建议只放标题
2. 每张卡片内容控制在屏幕一屏以内
3. 善用标题、列表和引用来组织内容
4. 右侧面板可以切换不同的卡片样式

**现在就删掉这些内容，开始创作吧！**
`
		},
		{
			id: 'knowledge',
			name: '知识分享',
			icon: '💡',
			content: `# 5 个你可能不知道的 TypeScript 技巧

提升你的代码质量，让同事刮目相看 ✨

[[pagebreak]]

## 1. 用 satisfies 替代类型断言

\`\`\`typescript
const config = {
  port: 3000,
  host: "localhost"
} satisfies Config;
\`\`\`

比 \`as Config\` 更安全，保留字面量类型！

[[pagebreak]]

## 2. 模板字面量类型

\`\`\`typescript
type Route = \`/api/\${string}\`;
\`\`\`

编译时就能捕获错误路径 🎯

[[pagebreak]]

## 3. 用 Record 替代 any

> **永远不要用 any！**
> Record<string, unknown> 是更安全的选择。

[[pagebreak]]

## 总结

- \`satisfies\` 优于 \`as\`
- 模板字面量优于手写字符串
- \`Record\` 优于 \`any\`

**关注我，获取更多编程技巧！**
`
		}
	],
	en: [
		{
			id: 'quick-start',
			name: 'Quick Start',
			icon: '📖',
			content: `# Social Cards Quick Start

Create beautiful social media cards with Markdown

[[pagebreak]]

## How to Paginate

Use \`[[pagebreak]]\` to split content into separate cards.

Keep each card concise. White space is your friend.

[[pagebreak]]

## Supported Formatting

**Bold**, *italic*, ~~strikethrough~~, \`inline code\`

- Unordered lists
- With nesting support
  - Like this

1. Ordered lists
2. Work too

> Blockquotes are great for highlighting key points

[[pagebreak]]

## Code & Math

Code blocks with syntax highlighting:

\`\`\`python
print("Hello, MDXport!")
\`\`\`

Math uses LaTeX syntax:

Inline $E = mc^2$, or display math:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

[[pagebreak]]

## Tables

| Feature | Supported |
|---------|-----------|
| Basic Markdown | ✓ |
| GFM Extensions | ✓ |
| LaTeX Math | ✓ |
| Syntax Highlighting | ✓ |

[[pagebreak]]

## Tips

1. The first card is your "cover" — keep it title-only
2. Keep each card to one screen of content
3. Use headings, lists, and quotes to structure content
4. Switch card styles in the right panel

**Delete this and start creating!**
`
		},
		{
			id: 'knowledge',
			name: 'Knowledge Share',
			icon: '💡',
			content: `# 5 TypeScript Tips You Might Not Know

Level up your code quality ✨

[[pagebreak]]

## 1. Use satisfies Instead of Type Assertion

\`\`\`typescript
const config = {
  port: 3000,
  host: "localhost"
} satisfies Config;
\`\`\`

Safer than \`as Config\` — preserves literal types!

[[pagebreak]]

## 2. Template Literal Types

\`\`\`typescript
type Route = \`/api/\${string}\`;
\`\`\`

Catch invalid paths at compile time 🎯

[[pagebreak]]

## 3. Record Over any

> **Never use any!**
> Record<string, unknown> is the safer choice.

[[pagebreak]]

## Summary

- \`satisfies\` over \`as\`
- Template literals over manual strings
- \`Record\` over \`any\`

**Follow for more coding tips!**
`
		}
	]
};
