<script lang="ts">
  import PdfEditor from '$lib/components/PdfEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'MDXport · Markdown 转 PDF，排版一步到位',
      description:
        '专为 AI 生成内容设计的交付引擎。纯客户端运行，数据绝不上传，隐私零风险。自动修复排版错乱，一键解决表格溢出与层级问题。',
    },
    en: {
      title: 'MDXport · Markdown to PDF, Perfect Typesetting',
      description:
        'A delivery engine for AI-generated content. Runs entirely client-side, your data never leaves your browser. Auto-fix formatting issues with one click.',
    },
  }
</script>

<PdfEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
/>
