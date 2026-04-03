import type { UILang } from '$lib/i18n/lang';

export interface Template {
	id: string;
	name: string;
	icon: string;
	content: string;
}

const date = new Date().toISOString().split('T')[0];

const WELCOME_ZH = `---
lang: zh
title: MDXport 功能演示
authors:
  - MDXport Team
date: ${date}
---

# 将原始 Markdown 和 AI 草稿转化为专业级 PDF

### 您 LLM 输出与专业报告之间更近的一步
MDXport 旨在提供稳定的分页、尝试自动修复常见的格式错误并为品牌规范提供支持——100% 在您的浏览器本地运行。

- **工程级分页**：表格表头尝试自动重复、处理标题孤行、智能换页建议。
- **主动预检**：检测并提示损坏的数学块、溢出的代码块和常见的嵌套问题。
- **确定性构建**：相同的输入 + 锁定的模板/引擎版本 = 每次都是完全相同的 PDF。
- **本地优先安全**：您的商业机密永远不会离开您的设备。

---

## 排版功能演示

### 文本格式

这是一段普通段落，包含 **加粗**、_斜体_、\`行内代码\`、以及一个 [内联链接](https://example.com)。

### 扩展语法
- ~~删除文本~~
- 上标^sup^ 下标~sub~
- 脚注支持[^1]

[^1]: 这是一个脚注示例。

### 代码块
\`\`\`typescript
const pdf = await compile(markdown);
\`\`\`

### 数学公式

行内公式：$ E = m c^2 $，复杂公式：$ \\frac{a}{b} + \\sqrt{x} $

块级公式：
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

### 流程图 (Mermaid)

\`\`\`mermaid
graph LR;
    Markdown-->Typst;
    Typst-->PDF;
\`\`\`

> **提示**：你可以将 Markdown 粘贴到编辑器，或使用顶部的模板快速开始。
`;

const WELCOME_EN = `---
lang: en
title: MDXport Feature Demo
authors:
  - MDXport Team
date: ${date}
---

# Turn Raw Markdown & AI Drafts into Client-Ready PDFs.

### A better bridge between LLM output and professional reports.
MDXport aims for stable pagination, attempts to catch common formatting errors, and provides a path for branding—running 100% locally in your browser.

- **Engineered Pagination**: Strives for repeating table headers, orphan prevention, and smart breaks.
- **Active Preflight**: Detects & flags common math block issues, overflowing code, and bad nesting.
- **Reproducible Output**: Same input + Pinned template/engine versions = Same PDF.
- **Local-First Security**: Your commercial specs never leave your device.

---

## Typesetting Demo

### Text Formatting
This is a regular paragraph with **bold**, _italic_, \`inline code\`, and an [inline link](https://example.com).

### Extended Syntax
- ~~Strikethrough~~
- Super^sup^ Sub~sub~
- Footnote[^Note]

[^Note]: This is a footnote example.

### Code Block
\`\`\`typescript
const pdf = await compile(markdown);
\`\`\`

### Math Formula

Inline: $ E = m c^2 $, Complex: $ \\frac{a}{b} + \\sqrt{x} $

Block:
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

### Diagram (Mermaid)

\`\`\`mermaid
graph LR;
    Markdown-->Typst;
    Typst-->PDF;
\`\`\`

> **Tip**: Paste Markdown into the editor, or use the templates above to get started.
`;

export const PDF_TEMPLATES: Record<UILang, Template[]> = {
	zh: [
		{ id: 'welcome', name: '快速入门', icon: '🚀', content: WELCOME_ZH },
		{
			id: 'techDoc',
			name: '技术方案',
			icon: '📝',
			content: `---\ntitle: 技术方案文档\ndate: ${date}\n---\n\n# 项目概述\n\n## 背景\n\n## 方案设计\n\n## 实施计划\n1. Phase 1\n2. Phase 2\n3. Phase 3\n\n## 风险评估\n\n## 总结\n`
		},
		{
			id: 'weeklyReport',
			name: '工作周报',
			icon: '📊',
			content: `# 工作周报 - ${date}\n\n## 本周完成\n\n- [ ] 任务 1\n- [ ] 任务 2\n\n## 下周计划\n\n- [ ] 计划 1\n- [ ] 计划 2\n\n## 问题与风险\n\n## 备注\n`
		}
	],
	en: [
		{ id: 'welcome', name: 'Get Started', icon: '🚀', content: WELCOME_EN },
		{
			id: 'techDoc',
			name: 'Technical Spec',
			icon: '📝',
			content: `---\ntitle: Technical Design Document\ndate: ${date}\n---\n\n# Overview\n\n## Context\n\n## Proposed Solution\n\n## Rollout Plan\n`
		},
		{
			id: 'weeklyReport',
			name: 'Weekly Report',
			icon: '📊',
			content: `# Weekly Report - ${date}\n\n## Accomplishments\n\n## Plans for Next Week\n\n## Blockers\n`
		}
	]
};
