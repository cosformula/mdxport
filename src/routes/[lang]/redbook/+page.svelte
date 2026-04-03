<script lang="ts">
  import RedbookEditor from '$lib/components/RedbookEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'MDXport · Markdown 转小红书卡片',
      description:
        '将 Markdown 内容转为精美的小红书图片卡片。多种样式、字体可选，一键下载 PNG，纯客户端运行。',
    },
    en: {
      title: 'MDXport · Markdown to RedNote Cards',
      description:
        'Convert Markdown into beautiful image cards for Xiaohongshu. Multiple styles and fonts, one-click PNG download, runs entirely client-side.',
    },
  }
</script>

<RedbookEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
/>
