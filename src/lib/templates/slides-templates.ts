import type { UILang } from '$lib/i18n/lang';
import type { Template } from './pdf-templates';

export const SLIDES_TEMPLATES: Record<UILang, Template[]> = {
	zh: [
		{
			id: 'quick-start',
			name: '快速上手',
			icon: '📖',
			content: `---
title: 幻灯片模式快速上手
authors:
  - MDXport
lang: zh
---

## 基本结构

用 \`[[pagebreak]]\` 分隔每一页幻灯片

顶部用 YAML frontmatter 设置标题和作者：

\`\`\`yaml
---
title: 你的演示文稿标题
authors:
  - 作者名
lang: zh
---
\`\`\`

设置了 title 会自动生成首页标题页

[[pagebreak]]

## 文本格式

支持完整的 Markdown 格式：

**加粗**、*斜体*、~~删除线~~、\`行内代码\`

- 无序列表
- 支持嵌套
  - 像这样

1. 有序列表
2. 自动编号

> 引用块适合放关键观点或名言

[[pagebreak]]

## 代码块

代码块支持语法高亮：

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

行内代码用反引号：\`console.log("hello")\`

[[pagebreak]]

## 数学公式

使用 LaTeX 语法书写数学公式。

行内公式：$E = mc^2$

独立公式块：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

[[pagebreak]]

## 表格

| 语法 | 支持情况 |
|------|----------|
| \`[[pagebreak]]\` 分页 | ✓ |
| YAML frontmatter | ✓ |
| GFM 表格 | ✓ |
| LaTeX 数学 | ✓ |
| 代码高亮 | ✓ |
| 链接和图片 | ✓ |

[[pagebreak]]

## 小贴士

1. 每页内容不宜过多，留白让观众更聚焦
2. 善用标题层级：\`##\` 做页面标题，\`###\` 做小节
3. 右侧面板可以切换幻灯片主题

**删掉这些内容，开始制作你的演示文稿吧！**
`
		},
		{
			id: 'tech-talk',
			name: '技术分享',
			icon: '🎤',
			content: `---
title: TypeScript 5.0 新特性
authors:
  - 开发者
lang: zh
---

## satisfies 关键字

比类型断言更安全的类型检查方式：

\`\`\`typescript
const config = {
  port: 3000,
  host: "localhost"
} satisfies ServerConfig;
\`\`\`

- 保留字面量类型推断
- 编译时检查类型兼容性
- 不会丢失类型信息

[[pagebreak]]

## 装饰器 (Decorators)

ES 标准装饰器终于稳定：

\`\`\`typescript
function log(target: any, context: ClassMethodDecoratorContext) {
  return function (...args: any[]) {
    console.log(\`Calling \${String(context.name)}\`);
    return target.apply(this, args);
  };
}
\`\`\`

[[pagebreak]]

## const 类型参数

\`\`\`typescript
function routes<const T extends string[]>(paths: T) {
  return paths;
}

// 类型是 readonly ["/home", "/about"]
const r = routes(["/home", "/about"]);
\`\`\`

[[pagebreak]]

## 总结

- **satisfies** — 更安全的类型检查
- **装饰器** — 标准化的元编程
- **const 类型参数** — 更精确的字面量推断

> 升级到 TypeScript 5.0，享受更好的开发体验！
`
		}
	],
	en: [
		{
			id: 'quick-start',
			name: 'Quick Start',
			icon: '📖',
			content: `---
title: Slides Mode Quick Start
authors:
  - MDXport
lang: en
---

## Basic Structure

Use \`[[pagebreak]]\` to separate slides

Set title and authors in YAML frontmatter at the top:

\`\`\`yaml
---
title: Your Presentation Title
authors:
  - Author Name
lang: en
---
\`\`\`

A title slide is auto-generated when \`title\` is set

[[pagebreak]]

## Text Formatting

Full Markdown formatting is supported:

**Bold**, *italic*, ~~strikethrough~~, \`inline code\`

- Unordered lists
- With nesting
  - Like this

1. Ordered lists
2. Auto-numbered

> Blockquotes work great for key takeaways

[[pagebreak]]

## Code Blocks

Syntax highlighting is built in:

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

Use backticks for inline code: \`console.log("hello")\`

[[pagebreak]]

## Math

Write math using LaTeX syntax.

Inline: $E = mc^2$

Display block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

[[pagebreak]]

## Tables

| Syntax | Supported |
|--------|-----------|
| \`[[pagebreak]]\` | ✓ |
| YAML frontmatter | ✓ |
| GFM tables | ✓ |
| LaTeX math | ✓ |
| Syntax highlighting | ✓ |
| Links & images | ✓ |

[[pagebreak]]

## Tips

1. Keep each slide focused — white space helps your audience
2. Use heading levels: \`##\` for slide titles, \`###\` for sections
3. Switch slide themes in the right panel

**Delete this and start building your presentation!**
`
		},
		{
			id: 'tech-talk',
			name: 'Tech Talk',
			icon: '🎤',
			content: `---
title: "TypeScript 5.0: What's New"
authors:
  - Developer
lang: en
---

## The satisfies Keyword

A safer alternative to type assertions:

\`\`\`typescript
const config = {
  port: 3000,
  host: "localhost"
} satisfies ServerConfig;
\`\`\`

- Preserves literal type inference
- Compile-time type compatibility check
- No type information loss

[[pagebreak]]

## Decorators (Stable)

ES standard decorators are finally stable:

\`\`\`typescript
function log(target: any, context: ClassMethodDecoratorContext) {
  return function (...args: any[]) {
    console.log(\`Calling \${String(context.name)}\`);
    return target.apply(this, args);
  };
}
\`\`\`

[[pagebreak]]

## const Type Parameters

\`\`\`typescript
function routes<const T extends string[]>(paths: T) {
  return paths;
}

// Type is readonly ["/home", "/about"]
const r = routes(["/home", "/about"]);
\`\`\`

[[pagebreak]]

## Summary

- **satisfies** — Safer type checking
- **Decorators** — Standardized metaprogramming
- **const type params** — Precise literal inference

> Upgrade to TypeScript 5.0 for a better developer experience!
`
		}
	]
};
