<script lang="ts">
  import { page } from '$app/stores'

  const langParam = $page.params.lang || 'en'
  const lang = (langParam === 'zh' ? 'zh' : 'en') as 'zh' | 'en'

  const SEO_LINKS = [
    {
      path: 'convert-chatgpt-table-to-pdf',
      title: {
        zh: 'ChatGPT 表格转 PDF',
        en: 'ChatGPT Table to PDF',
      },
      description: {
        zh: '完美解决 ChatGPT 表格导出 PDF 时的排版问题',
        en: 'Fix ChatGPT table formatting issues when exporting to PDF',
      },
    },
    {
      path: 'notion-export-pdf-layout-fix',
      title: {
        zh: 'Notion 导出 PDF 修复',
        en: 'Notion Export PDF Fix',
      },
      description: {
        zh: '解决 Notion 导出 PDF 时的布局错乱',
        en: 'Fix Notion PDF export layout glitches',
      },
    },
    {
      path: 'secure-offline-markdown-to-pdf-converter',
      title: {
        zh: '安全离线 PDF 工具',
        en: 'Secure Offline PDF',
      },
      description: {
        zh: '完全在浏览器运行，数据绝不上传',
        en: 'Runs 100% in browser, no data upload',
      },
    },
    {
      path: 'typst-online-editor-alternative',
      title: {
        zh: 'Typst 在线替代',
        en: 'Typst Alternative',
      },
      description: {
        zh: '更简单易用的在线文档编辑器',
        en: 'Simpler, easier online document editor',
      },
    },
    {
      path: 'cards',
      title: {
        zh: 'Markdown 转社交卡片',
        en: 'Markdown to Social Cards',
      },
      description: {
        zh: '将 Markdown 转为精美的社交图片卡片，支持小红书、Instagram、X 和 Story 尺寸',
        en: 'Convert Markdown to polished social image cards with Redbook, Instagram, X, and Story presets',
      },
    },
    {
      path: 'slides',
      title: {
        zh: 'Markdown 转演示文稿',
        en: 'Markdown to Slides',
      },
      description: {
        zh: '用 Markdown 写幻灯片，多种主题，支持代码高亮和数学公式',
        en: 'Write presentations in Markdown with themes, code highlighting, and math',
      },
    },
    {
      path: 'markdown-resume-to-pdf',
      title: {
        zh: 'Markdown 简历转 PDF',
        en: 'Markdown Resume to PDF',
      },
      description: {
        zh: '用 Markdown 写简历，一键生成排版专业的 PDF',
        en: 'Write your resume in Markdown, export a professionally formatted PDF',
      },
    },
    {
      path: 'ai-chat-export-to-pdf',
      title: {
        zh: 'AI 对话导出 PDF',
        en: 'AI Chat Export to PDF',
      },
      description: {
        zh: '保存 ChatGPT / Claude / DeepSeek 对话为精美 PDF',
        en: 'Save ChatGPT / Claude / DeepSeek conversations as beautiful PDF',
      },
    },
    {
      path: 'markdown-to-presentation-slides',
      title: {
        zh: 'Markdown 转 PPT 替代方案',
        en: 'Markdown Presentation Maker',
      },
      description: {
        zh: '告别 PowerPoint，用最简单的方式制作演示文稿',
        en: 'Skip PowerPoint — the simplest way to create presentation slides',
      },
    },
  ]
</script>

<svelte:head>
  <title
    >{lang === 'zh'
      ? '资源与工具 - MDXport: 专业的 Markdown 转 PDF 解决方案'
      : 'Resources & Tools - MDXport: Professional Markdown to PDF Solutions'}</title
  >
  <meta
    name="description"
    content={lang === 'zh'
      ? '发现更多提高效率的文档工具和解决方案。MDXport 提供 ChatGPT 表格转 PDF、Notion 布局修复等多种实用工具。'
      : 'Discover tools and solutions to boost your productivity. MDXport provides ChatGPT table to PDF, Notion layout fixes, and more.'}
  />
</svelte:head>

<div class="resources-page">
  <header class="header">
    <h1>{lang === 'zh' ? '资源与工具' : 'Resources & Tools'}</h1>
    <p class="subtitle">
      {lang === 'zh'
        ? '发现更多提高效率的文档工具和解决方案'
        : 'Discover tools and solutions to boost your productivity'}
    </p>
  </header>

  <div class="links-grid">
    {#each SEO_LINKS as link}
      <a href="/{lang}/{link.path}/" class="resource-card">
        <h2>{link.title[lang]}</h2>
        <p>{link.description[lang]}</p>
        <div class="card-footer">
          <span>{lang === 'zh' ? '去使用' : 'Explore'} &rarr;</span>
        </div>
      </a>
    {/each}
  </div>

  <div class="back-link">
    <a href="/{lang}/"
      >&larr; {lang === 'zh' ? '返回编辑器' : 'Back to Editor'}</a
    >
  </div>
</div>

<style>
  .resources-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 4rem 2rem;
    font-family: var(--font-body, system-ui, sans-serif);
    line-height: 1.6;
    color: #374151;
  }

  .header {
    text-align: center;
    margin-bottom: 4rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
  }

  .subtitle {
    font-size: 1.25rem;
    color: #6b7280;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 4rem;
  }

  .resource-card {
    display: block;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .resource-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: #d1d5db;
  }

  .resource-card h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin-top: 0;
    margin-bottom: 0.75rem;
  }

  .resource-card p {
    color: #6b7280;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }

  .card-footer {
    color: #2563eb;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .back-link {
    text-align: center;
  }

  .back-link a {
    color: #6b7280;
    text-decoration: none;
    font-weight: 500;
  }

  .back-link a:hover {
    color: #111827;
    text-decoration: underline;
  }
</style>
