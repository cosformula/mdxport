<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'
  import { PDF_TEMPLATES } from '$lib/templates/pdf-templates'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'Notion 导出 PDF 优化: 改善表格截断与布局挑战 - MDXport',
      description:
        'Notion 导出的 PDF 可能遇到表格被截断或布局不理想的情况。MDXport 尝试通过 Markdown 转换来优化排版，辅助自动调整表格宽度，100% 本地运行。',
    },
    en: {
      title: 'Improve Notion PDF Export: Better Table Layouts - MDXport',
      description:
        'Notion PDF export can sometimes cut off tables. Export to Markdown and let MDXport help generate a PDF with more flexible table widths and pagination.',
    },
  }

  const notionContent = $derived(
    PDF_TEMPLATES[data.lang].find((t) => t.id === 'notion')?.content ?? '',
  )
</script>

<PdfEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
  initialMarkdown={notionContent}
/>
