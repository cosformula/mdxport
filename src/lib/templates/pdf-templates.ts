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

## 目录

[toc]

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

> **提示**：使用 \`---\` 或 \`[[pagebreak]]\` 控制分页。你可以将 Markdown 粘贴到编辑器，或使用顶部的模板快速开始。
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

## Table of Contents

[toc]

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

> **Tip**: Use \`---\` or \`[[pagebreak]]\` to control page breaks. Paste Markdown into the editor, or use the templates above to get started.
`;

const RESUME_ZH = `---
lang: zh
title: 个人简历
---

# 张三

📧 zhangsan@email.com · 📱 138-0000-0000 · 🔗 github.com/zhangsan

---

## 工作经历

### 高级前端工程师 · ABC 科技有限公司
*2021.03 - 至今*

- 主导公司核心产品前端架构升级，将构建时间降低 60%
- 设计并实现组件库，覆盖 50+ 组件，团队复用率达 90%
- 推进 TypeScript 全量迁移，线上 Bug 率下降 35%

### 前端工程师 · XYZ 互联网公司
*2019.07 - 2021.02*

- 负责电商平台 H5 页面开发，日均 PV 50 万+
- 优化首屏加载速度，LCP 从 3.2s 降至 1.1s

## 教育背景

### 计算机科学与技术 · 某某大学
*2015.09 - 2019.06 · 本科*

## 技能

| 类别 | 技能 |
| :--- | :--- |
| 语言 | TypeScript, JavaScript, HTML, CSS |
| 框架 | React, Vue, Svelte, Next.js |
| 工具 | Git, Docker, Webpack, Vite |
`;

const RESUME_EN = `---
lang: en
title: Resume
---

# Jane Smith

📧 jane@email.com · 📱 (555) 123-4567 · 🔗 github.com/janesmith

---

## Experience

### Senior Frontend Engineer · ABC Tech Inc.
*Mar 2021 - Present*

- Led frontend architecture migration, reducing build times by 60%
- Designed component library with 50+ components, 90% team adoption
- Drove full TypeScript migration, reducing production bugs by 35%

### Frontend Developer · XYZ Internet Co.
*Jul 2019 - Feb 2021*

- Built e-commerce H5 pages serving 500K+ daily page views
- Optimized first contentful paint from 3.2s to 1.1s

## Education

### B.S. Computer Science · State University
*Sep 2015 - Jun 2019*

## Skills

| Category | Skills |
| :--- | :--- |
| Languages | TypeScript, JavaScript, HTML, CSS |
| Frameworks | React, Vue, Svelte, Next.js |
| Tools | Git, Docker, Webpack, Vite |
`;

const AI_CHAT_ZH = `---
lang: zh
title: AI 对话整理
date: ${date}
---

# AI 对话记录

## Q: 用 Python 实现快速排序

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

> 时间复杂度：平均 $O(n \\log n)$，最坏 $O(n^2)$

## Q: 快速排序与归并排序的区别？

| 特性 | 快速排序 | 归并排序 |
| :--- | :--- | :--- |
| 平均时间复杂度 | $O(n \\log n)$ | $O(n \\log n)$ |
| 最坏时间复杂度 | $O(n^2)$ | $O(n \\log n)$ |
| 空间复杂度 | $O(\\log n)$ | $O(n)$ |
| 稳定性 | 不稳定 | 稳定 |

---

*将你的 AI 对话粘贴到这里，替换以上示例内容。*
`;

const AI_CHAT_EN = `---
lang: en
title: AI Chat Notes
date: ${date}
---

# AI Conversation Log

## Q: Implement quicksort in Python

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

> Time complexity: Average $O(n \\log n)$, Worst $O(n^2)$

## Q: Quicksort vs Merge Sort?

| Feature | Quicksort | Merge Sort |
| :--- | :--- | :--- |
| Avg Time | $O(n \\log n)$ | $O(n \\log n)$ |
| Worst Time | $O(n^2)$ | $O(n \\log n)$ |
| Space | $O(\\log n)$ | $O(n)$ |
| Stable | No | Yes |

---

*Paste your AI conversation here, replacing the sample content above.*
`;

const NOTION_ZH = `---
lang: zh
title: Notion 笔记整理
date: ${date}
---

# Notion 导出笔记整理

> 💡 **使用方法**：在 Notion 中导出为 Markdown，然后将 .md 文件内容粘贴到这里。

## 项目概览

| 任务 ID | 描述 | 负责人 | 优先级 | 截止日期 | 状态 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TASK-001 | 首页重构 | 张三 | P0 | 2024-10-01 | 进行中 | 需要设计稿确认后开始开发 |
| TASK-002 | API 接口优化 | 李四 | P1 | 2024-10-15 | 待开始 | 依赖后端微服务升级完成 |
| TASK-003 | 用户反馈系统 | 王五 | P2 | 2024-11-01 | 已完成 | 已上线，监控中 |

## 会议纪要

### 2024-09-25 周会

**参会人**：张三、李四、王五

**讨论要点**：
1. 首页重构进度 — 设计稿已确认，预计下周开始开发
2. API 性能问题 — P99 延迟超标，需要排查慢查询
3. Q4 规划 — 重点放在用户体验优化

**Action Items**：
- [ ] 张三：完成首页技术方案
- [ ] 李四：输出 API 性能优化报告
- [ ] 王五：整理用户反馈 Top 10

> 📝 **下次会议**：2024-10-02

---

*将你的 Notion 导出内容粘贴到这里，替换以上示例。*
`;

const NOTION_EN = `---
lang: en
title: Notion Notes
date: ${date}
---

# Notion Export Cleanup

> 💡 **How to use**: Export from Notion as Markdown, then paste the .md file content here.

## Project Overview

| Task ID | Description | Owner | Priority | Due Date | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TASK-001 | Homepage Redesign | Alice | P0 | 2024-10-01 | In Progress | Waiting for design sign-off |
| TASK-002 | API Optimization | Bob | P1 | 2024-10-15 | Not Started | Depends on backend migration |
| TASK-003 | Feedback System | Charlie | P2 | 2024-11-01 | Done | Live, monitoring |

## Meeting Notes

### 2024-09-25 Weekly Sync

**Attendees**: Alice, Bob, Charlie

**Discussion**:
1. Homepage redesign — designs approved, dev starts next week
2. API latency — P99 over budget, need slow query investigation
3. Q4 planning — focus on UX improvements

**Action Items**:
- [ ] Alice: Finalize homepage tech spec
- [ ] Bob: Deliver API performance report
- [ ] Charlie: Compile Top 10 user feedback items

> 📝 **Next meeting**: 2024-10-02

---

*Paste your Notion export content here, replacing the sample above.*
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
		},
		{ id: 'resume', name: '简历', icon: '👤', content: RESUME_ZH },
		{ id: 'aiChat', name: 'AI 对话整理', icon: '🤖', content: AI_CHAT_ZH },
		{ id: 'notion', name: 'Notion 笔记整理', icon: '📋', content: NOTION_ZH }
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
		},
		{ id: 'resume', name: 'Resume', icon: '👤', content: RESUME_EN },
		{ id: 'aiChat', name: 'AI Chat Notes', icon: '🤖', content: AI_CHAT_EN },
		{ id: 'notion', name: 'Notion Notes', icon: '📋', content: NOTION_EN }
	]
};
