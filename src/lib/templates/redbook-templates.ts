import type { UILang } from '$lib/i18n/lang';
import type { Template } from './pdf-templates';

export const REDBOOK_TEMPLATES: Record<UILang, Template[]> = {
	zh: [
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
		},
		{
			id: 'tutorial',
			name: '教程卡片',
			icon: '📖',
			content: `# 从零搭建个人博客

手把手教你用最新技术栈

[[pagebreak]]

## 你需要准备

- Node.js 18+
- 一个 GitHub 账号
- 15 分钟的时间 ⏰

[[pagebreak]]

## 第一步：创建项目

\`\`\`bash
npm create astro@latest my-blog
\`\`\`

选择 Blog 模板，等待安装完成

[[pagebreak]]

## 第二步：写你的第一篇文章

在 \`src/content/blog/\` 下创建 \`.md\` 文件

支持 Markdown 所有语法！

[[pagebreak]]

## 第三步：部署

推送到 GitHub，连接 Vercel

**三步完成，就这么简单！**
`
		}
	],
	en: [
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
		},
		{
			id: 'tutorial',
			name: 'Tutorial Card',
			icon: '📖',
			content: `# Build a Personal Blog from Scratch

Step-by-step with the latest tech stack

[[pagebreak]]

## What You Need

- Node.js 18+
- A GitHub account
- 15 minutes ⏰

[[pagebreak]]

## Step 1: Create the Project

\`\`\`bash
npm create astro@latest my-blog
\`\`\`

Pick the Blog template and wait for install

[[pagebreak]]

## Step 2: Write Your First Post

Create a \`.md\` file under \`src/content/blog/\`

Full Markdown syntax supported!

[[pagebreak]]

## Step 3: Deploy

Push to GitHub, connect Vercel

**Three steps, that's it!**
`
		}
	]
};
