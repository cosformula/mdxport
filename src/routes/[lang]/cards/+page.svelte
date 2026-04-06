<script lang="ts">
  import CardsEditor from '$lib/components/CardsEditor.svelte'
  import type { UILang } from '$lib/i18n/lang'

  let { data }: { data: { lang: UILang } } = $props()

  const SEO = {
    zh: {
      title: 'MDXport · Markdown 转社交卡片',
      description:
        '将 Markdown 内容转为精美的社交图片卡片。支持小红书、Instagram、X 和 Story 尺寸，一键下载 PNG，纯客户端运行。',
    },
    en: {
      title: 'MDXport · Markdown to Social Cards',
      description:
        'Convert Markdown into beautiful social image cards. Supports Redbook, Instagram, X, and Story presets with one-click PNG export, fully client-side.',
    },
  }
</script>

<CardsEditor
  lang={data.lang}
  seoTitle={SEO[data.lang].title}
  seoDescription={SEO[data.lang].description}
/>
