<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'
  import { PDF_TEMPLATES } from '$lib/templates/pdf-templates'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'Markdown 简历转 PDF: 程序员最爱的简历工具 - MDXport',
      description:
        '用 Markdown 写简历，一键生成排版专业的 PDF。支持自定义模板、自动分页、表格对齐，100% 本地运行，数据安全。',
    },
    en: {
      title: 'Markdown Resume to PDF: The Developer-Friendly Resume Builder - MDXport',
      description:
        'Write your resume in Markdown and export a professionally formatted PDF. Custom templates, auto-pagination, runs 100% locally.',
    },
  }

  const resumeContent = $derived(
    PDF_TEMPLATES[data.lang].find((t) => t.id === 'resume')?.content ?? '',
  )
</script>

<PdfEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
  initialMarkdown={resumeContent}
/>
