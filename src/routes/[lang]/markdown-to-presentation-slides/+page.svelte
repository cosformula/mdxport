<script lang="ts">
  import SlidesEditor from '$lib/components/SlidesEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'Markdown 转演示文稿: 用文字写 PPT 的最简方式 - MDXport',
      description:
        '告别 PowerPoint 繁琐操作，用 Markdown 写演示文稿。多种主题可选，支持代码高亮和数学公式，一键导出 PDF 幻灯片。',
    },
    en: {
      title: 'Markdown to Presentation Slides: The Simplest Way to Create Slides - MDXport',
      description:
        'Skip PowerPoint. Write presentations in Markdown with multiple themes, code highlighting, and math support. Export to PDF slides instantly.',
    },
  }
</script>

<SlidesEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
/>
