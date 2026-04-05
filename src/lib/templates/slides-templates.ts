import type { UILang } from '$lib/i18n/lang';
import type { Template } from './pdf-templates';

export const SLIDES_TEMPLATES: Record<UILang, Template[]> = {
	zh: [
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

---

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

---

## const 类型参数

\`\`\`typescript
function routes<const T extends string[]>(paths: T) {
  return paths;
}

// 类型是 readonly ["/home", "/about"]
const r = routes(["/home", "/about"]);
\`\`\`

---

## 总结

- **satisfies** — 更安全的类型检查
- **装饰器** — 标准化的元编程
- **const 类型参数** — 更精确的字面量推断

> 升级到 TypeScript 5.0，享受更好的开发体验！
`
		},
		{
			id: 'product-pitch',
			name: '产品介绍',
			icon: '🚀',
			content: `---
title: MDXport — Markdown 转专业文档
authors:
  - MDXport Team
lang: zh
---

## 痛点

- AI 生成的 Markdown 格式混乱
- 复制到 Word/Notion 排版全乱
- 手动调格式浪费大量时间
- 代码块、公式、表格难以导出

---

## 解决方案

**MDXport** 将 Markdown 一键转为精美 PDF

- 工程级分页与排版
- 代码高亮 + 数学公式
- 多种专业模板
- 100% 浏览器本地运行

---

## 三种模式

| 模式 | 用途 | 输出 |
|------|------|------|
| PDF | 报告/文档 | A4 PDF |
| 卡片 | 社交媒体 | PNG 图片 |
| 幻灯片 | 演示文稿 | 16:9 PDF |

---

## 立即体验

访问 **mdxport.com** 开始使用

> 你的 Markdown，你的文档，你的数据安全。
`
		}
	],
	en: [
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

---

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

---

## const Type Parameters

\`\`\`typescript
function routes<const T extends string[]>(paths: T) {
  return paths;
}

// Type is readonly ["/home", "/about"]
const r = routes(["/home", "/about"]);
\`\`\`

---

## Summary

- **satisfies** — Safer type checking
- **Decorators** — Standardized metaprogramming
- **const type params** — Precise literal inference

> Upgrade to TypeScript 5.0 for a better developer experience!
`
		},
		{
			id: 'product-pitch',
			name: 'Product Pitch',
			icon: '🚀',
			content: `---
title: MDXport — Markdown to Professional Documents
authors:
  - MDXport Team
lang: en
---

## The Problem

- AI-generated Markdown is poorly formatted
- Copy-pasting to Word/Notion breaks layout
- Manual formatting wastes hours
- Code blocks, formulas, tables are hard to export

---

## The Solution

**MDXport** converts Markdown to beautiful PDFs in one click

- Professional pagination & typography
- Syntax highlighting + math formulas
- Multiple professional templates
- 100% runs locally in your browser

---

## Three Modes

| Mode | Purpose | Output |
|------|---------|--------|
| PDF | Reports/Docs | A4 PDF |
| Card | Social Media | PNG Images |
| Slides | Presentations | 16:9 PDF |

---

## Get Started

Visit **mdxport.com** to start using it

> Your Markdown, your documents, your data stays safe.
`
		}
	]
};
