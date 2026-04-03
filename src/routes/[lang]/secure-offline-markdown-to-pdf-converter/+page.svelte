<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: '安全离线 Markdown 转 PDF: 本地优先，无数据上传风险 - MDXport',
      description:
        '专注于隐私保护的 Markdown 转换工具。MDXport 使用 WebAssembly 在浏览器本地运行，避免敏感文档上传到服务器，保障您的数据安全。',
      content: `
# 安全、离线的 Markdown 转 PDF 工具

在处理**机密合同、内部报告或个人日记**时，你敢把文件上传到在线转换网站吗？

大多数在线工具不仅保存你的文件，甚至可能泄露你的数据。

**MDXport 不一样。**

## 为什么 MDXport 更安全？

MDXport 采用了最先进的 **WebAssembly (WASM)** 技术，将排版引擎直接嵌入到网页中。这意味着：

1. **0 数据上传**：所有计算都在你的电脑（本地浏览器）中完成。
2. **断网可用**：加载网页后，即使断开网络也能正常工作。
3. **彻底隐私**：你可以打开浏览器的 "开发者工具 -> 网络" 监控，你会发现没有任何文件被上传。

## 适合场景

- 📄 **法律合同**：保护条款不外泄
- 💼 **商业计划书**：核心创意不被窃取
- 📝 **私人日记**：个人隐私绝对安全

---

## 立即测试

你可以尝试粘贴一段敏感文本（或者断开网络）：

**[机密] 2024年战略规划**

1. 核心目标：...
2. 市场策略：...

> *MDXport 承诺：如果你发现任何数据上传行为，我们将承担法律责任。*
`,
    },
    en: {
      title:
        'Secure Offline Markdown to PDF: 100% Privacy, Zero Data Upload - MDXport',
      description:
        'No data upload required. MDXport runs locally in your browser using WebAssembly. The safest way to convert confidential contracts and sensitive documents to PDF, even offline.',
      content: `
# Secure, Offline Markdown to PDF

When dealing with **NDAs, legal contracts, or personal journals**, do you trust online converters with your data?

Most tools upload your files to their servers. We don't.

**MDXport is different.**

## How is it secure?

We use **WebAssembly (WASM)** technology to run the full typesetting engine inside your browser.

1. **Zero Uploads**: Your data never leaves your device.
2. **Works Offline**: Load the page once, then turn off your Wi-Fi. It still works.
3. **Verifiable**: Open your browser's "Network" tab. You'll see zero file uploads.

## Use Cases

- 📄 **Legal Docs**: Keep sensitive clauses private.
- 💼 **Business Plans**: Protect your IP.
- 📝 **Personal Notes**: Your thoughts are yours alone.

---

## Try it now

Paste some text below (feel free to disconnect your internet first):

**[CONFIDENTIAL] Project X Strategy**

1. Core Objective: ...
2. Market entry: ...

> *Our Promise: We build software that we trust with our own data.*
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
