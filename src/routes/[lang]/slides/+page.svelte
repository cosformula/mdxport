<script lang="ts">
  import SlidesEditor from '$lib/components/SlidesEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'MDXport · Markdown 转演示文稿',
      description:
        '将 Markdown 内容转为精美的 PDF 演示文稿。多种主题可选，支持代码高亮和数学公式，纯客户端运行。',
    },
    en: {
      title: 'MDXport · Markdown to Slides',
      description:
        'Convert Markdown into beautiful PDF slide decks. Multiple themes, code highlighting, and math support, runs entirely client-side.',
    },
  }
</script>

<SlidesEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
/>
