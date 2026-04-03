<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'Typst 在线编辑器替代方案: 基于 Markdown 的文档排版工具 - MDXport',
      description:
        '提供比官方 Typst 更易上手的在线替代方案。MDXport 利用 Markdown 语法输出专业级 PDF。无需学习语法，无需注册，本地极速渲染。',
      content: `
# 免费 Typst 在线编辑器替代方案

Typst 是一个革命性的排版系统，但对于许多用户来说，**直接编写 Typst 代码门槛较高**。

如果你正在寻找一种更简单、更符合直觉的方式来生成精美文档，MDXport 是你的绝佳选择。

## MDXport vs Typst 官方编辑器

| 特性 | Typst 官方 App | MDXport |
| :--- | :--- | :--- |
| **语法** | 需要学习 Typst 语法 | **Markdown** (人人都会) |
| **账号** | 必须注册登录 | **无需注册** |
| **速度** | 受服务器网络影响 | **本地秒开** |
| **底层** | Typst | Typst (自动生成的) |

## 它是如何工作的？

MDXport 实际上是一个 **Markdown 到 Typst 的编译器**。

1. 你写 Markdown。
2. 我们在后台自动生成高质量的 Typst 代码。
3. 利用 Typst 引擎渲染成 PDF。

这样你既享受了 **Markdown 的写作效率**，又拥有了 **Typst 的排版质量**。

## 试一试

修改下面的 Markdown，感受 Typst 引擎带来的极速渲染：

### 数学公式
$ E = mc^2 $

### 复杂布局
无需编写 \`#grid(...)\`，只需 Markdown 表格：

| 模块 A | 模块 B |
| :--- | :--- |
| 内容 1 | 内容 2 |
`,
    },
    en: {
      title:
        'Typst Online Editor Alternative: Markdown-Powered Typesetting - MDXport',
      description:
        'Find the official Typst Web App too complex? MDXport offers a lightweight, Markdown-based alternative. No sign-up, instant local preview, and professional results without learning new code.',
      content: `
# Free Typst Online Editor Alternative

Typst is revolutionary, but **learning a new syntax can be a barrier**.

If you want the power of Typst without the learning curve, MDXport is the perfect alternative.

## MDXport vs Official Typst App

| Feature | Typst Web App | MDXport |
| :--- | :--- | :--- |
| **Syntax** | Typst Code (Complex) | **Markdown** (Simple) |
| **Account** | Registration Required | **No Sign-up** |
| **Speed** | Server dependent | **Instant Local Render** |
| **Engine** | Typst | Typst (Auto-generated) |

## How it works?

MDXport acts as a **Markdown-to-Typst bridge**.

1. You write simple Markdown.
2. We compile it to professional Typst code in the background.
3. We render it using the Typst engine.

You get the **speed of Markdown** with the **beauty of Typst**.

## Live Demo

Edit below to feel the power of the engine:

### Math Equations
$ E = mc^2 $

### Layouts
No need for \`#grid(...)\`, just use tables:

| Module A | Module B |
| :--- | :--- |
| Content 1 | Content 2 |
`,
    },
  }
</script>

<PdfEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
  initialMarkdown={SEO[data.lang].content}
/>
