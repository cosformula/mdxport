<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'
  import { PDF_TEMPLATES } from '$lib/templates/pdf-templates'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'AI 对话导出 PDF: 保存 ChatGPT / Claude / DeepSeek 对话记录 - MDXport',
      description:
        '将 AI 对话（ChatGPT、Claude、DeepSeek、Gemini 等）完整导出为排版精美的 PDF。保留代码高亮、表格格式、数学公式，100% 本地运行。',
    },
    en: {
      title: 'Export AI Chat to PDF: Save ChatGPT / Claude / DeepSeek Conversations - MDXport',
      description:
        'Export AI conversations (ChatGPT, Claude, DeepSeek, Gemini) to beautifully formatted PDF. Preserves code highlighting, tables, and math formulas. Runs 100% locally.',
    },
  }

  const aiChatContent = $derived(
    PDF_TEMPLATES[data.lang].find((t) => t.id === 'aiChat')?.content ?? '',
  )
</script>

<PdfEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
  initialMarkdown={aiChatContent}
/>
