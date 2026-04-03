<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'ChatGPT 表格转 PDF: 更专业的排版优化工具 - MDXport',
      description:
        '尝试解决从 ChatGPT 复制表格到 Word 格式不一致的问题。MDXport 针对常用 Markdown 格式优化，辅助将对话表格转换为排版整洁的 PDF 文档。',
      content: `
# ChatGPT 表格转 PDF

你是否经常遇到这样的问题：**从 ChatGPT 复制表格到 Word 或 Excel，格式容易出现错乱？**

MDXport 专为解决这个问题而生。

## 为什么选择 MDXport？

| 问题 | 传统方法 (Word/Excel) | MDXport |
| :--- | :--- | :--- |
| **表格边框** | 有时丢失或错位 | ✅ 倾向于保留 |
| **长表格** | 这是一个长表格的截断问题 | ✅ 自动分页、自动调整列宽 |
| **复合内容** | 文本与表格混合排版困难 | ✅ 像写文章一样自然 |

## 如何使用？

1. 在 ChatGPT 中点击 "Copy" 复制代码块
2. 粘贴到左侧编辑器
3. **完成！** 右侧即刻生成完美 PDF

## 示例

你可以直接修改这个示例表格看看效果：

| 姓名 | 职位 | 部门 | 入职日期 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| 张三 | 高级工程师 | 研发部 | 2023-01-15 | 在职 |
| 李四 | 产品经理 | 产品部 | 2023-03-22 | 在职 |
| 王五 | 设计师 | 设计部 | 2023-06-10 | 离职 |
`,
    },
    en: {
      title:
        'Convert ChatGPT Table to PDF: Professional Layout Optimization - MDXport',
      description:
        'Struggling with broken formatting when copying ChatGPT tables to Word? Use MDXport to convert ChatGPT conversations into beautifully formatted PDFs in one click.',
      content: `
# Convert ChatGPT Tables to PDF

Do you struggle with **copying tables from ChatGPT to Word or Excel only to find the formatting broken?**

MDXport is built to solve this.

## Why MDXport?

| Issue | Traditional (Word/Excel) | MDXport |
| :--- | :--- | :--- |
| **Borders** | May be missing or misaligned | ✅ Better preservation |
| **Long Tables** | Cut off or overflows page | ✅ Auto-pagination & column sizing |
| **Mixed Content** | Hard to mix text & tables | ✅ Natural document flow |

## How to use?

1. Click "Copy" on the code block in ChatGPT
2. Paste into the editor on the left
3. **Done!** A perfect PDF is generated instantly

## Try it out

Edit this table to see the magic:

| Name | Role | Dept | Start Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| Alice | Senior Eng | R&D | 2023-01-15 | Active |
| Bob | PM | Product | 2023-03-22 | Active |
| Charlie | Designer | Design | 2023-06-10 | Left |
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
