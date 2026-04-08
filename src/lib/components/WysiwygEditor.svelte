<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { browser } from '$app/environment'
  import { PAGEBREAK_TOKEN } from '$lib/pagebreak'

  interface Props {
    markdown: string
    placeholder?: string
    cardMode?: boolean
    imageUpload?: ((file: File) => Promise<string>) | null
    resolveImageUrl?: ((url: string) => string | Promise<string>) | null
  }

  let {
    markdown = $bindable(),
    placeholder = '',
    cardMode = false,
    imageUpload = null,
    resolveImageUrl = null,
  }: Props = $props()

  let containerEl = $state<HTMLDivElement | null>(null)
  let crepeInstance = $state<any>(null)
  let suppressUpdate = false
  let lastLocalMarkdown = $state<string | null>(null)

  export function insertMarkdownAtSelection(md: string): boolean {
    const instance = crepeInstance
    if (!instance) return false

    const { body } = editorValueFromMarkdown(md)
    instance.crepe.editor.action(instance.insert(body))
    instance.crepe.editor.action((ctx: any) => {
      ctx.get(instance.editorViewCtx).focus()
    })
    return true
  }

  // Strip YAML frontmatter before passing to Milkdown, restore on output
  const frontmatterRegex = /^---\n[\s\S]*?\n---\n*/

  function stripFrontmatter(md: string): { frontmatter: string; body: string } {
    const match = md.match(frontmatterRegex)
    if (match) {
      return { frontmatter: match[0], body: md.slice(match[0].length) }
    }
    return { frontmatter: '', body: md }
  }

  let currentFrontmatter = ''

  function editorValueFromMarkdown(md: string): { frontmatter: string; body: string } {
    const { frontmatter, body } = stripFrontmatter(md)
    const normalizedBody = cardMode
      ? body.replace(/^\[\[pagebreak\]\]$/gm, '---')
      : body
    return { frontmatter, body: normalizedBody }
  }

  function markdownValueFromEditor(md: string): string {
    // Milkdown may serialize thematic breaks as *** — normalize to ---
    let normalized = md.replace(/^[ \t]*\*\*\*$/gm, '---')
    // mdast-util-to-markdown escapes [ and ] in phrasing content to prevent
    // ambiguity with links/references. This breaks our bracket-based tokens
    // like [toc] and [[pagebreak]]. Remove all such escaping — the remark
    // parser handles unescaped brackets correctly (treats them as text if
    // no matching definition exists).
    normalized = normalized.replace(/\\([\[\]])/g, '$1')
    if (!cardMode) {
      return currentFrontmatter + normalized
    }
    return currentFrontmatter + normalized.replace(/^---$/gm, PAGEBREAK_TOKEN)
  }

  onMount(() => {
    if (!containerEl) return

    let destroyed = false
    const { frontmatter, body } = editorValueFromMarkdown(markdown)
    currentFrontmatter = frontmatter

    ;(async () => {
      const { Crepe } = await import('@milkdown/crepe')
      const { insert, replaceAll } = await import('@milkdown/kit/utils')
      const { editorViewCtx } = await import('@milkdown/kit/core')

      // Import CSS
      await import('@milkdown/crepe/theme/common/style.css')
      await import('@milkdown/crepe/theme/frame.css')

      if (destroyed) return

      const crepe = new Crepe({
        root: containerEl!,
        defaultValue: body,
        features: {
          [Crepe.Feature.ImageBlock]: !!imageUpload,
          [Crepe.Feature.BlockEdit]: !cardMode,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: { text: placeholder || 'Start writing...' },
          ...(imageUpload
            ? {
                [Crepe.Feature.ImageBlock]: {
                  onUpload: imageUpload,
                  proxyDomURL: resolveImageUrl ?? ((url: string) => url),
                },
              }
            : {}),
        },
      })

      // Listen for content changes
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, md, prevMd) => {
          if (md !== prevMd && !suppressUpdate) {
            const nextMarkdown = markdownValueFromEditor(md)
            lastLocalMarkdown = nextMarkdown
            markdown = nextMarkdown
          }
        })
      })

      await crepe.create()
      crepeInstance = { crepe, editorViewCtx, insert, replaceAll }
    })()

    return () => {
      destroyed = true
      if (crepeInstance) {
        crepeInstance.crepe.destroy()
        crepeInstance = null
      }
    }
  })

  // Sync external markdown changes into Milkdown
  $effect(() => {
    const instance = crepeInstance
    const md = markdown
    if (!instance) return

    untrack(() => {
      if (md === lastLocalMarkdown) return

      const { frontmatter, body } = editorValueFromMarkdown(md)
      currentFrontmatter = frontmatter
      const currentMd = instance.crepe.getMarkdown()
      if (body !== currentMd) {
        suppressUpdate = true
        instance.crepe.editor.action(instance.replaceAll(body))
        suppressUpdate = false
        lastLocalMarkdown = null
      }
    })
  })
</script>

<div class="wysiwyg-host" class:card-mode={cardMode} bind:this={containerEl}></div>

<style>
  .wysiwyg-host {
    flex: 1;
    height: 100%;
    overflow: auto;
    background: #fff;
  }

  .wysiwyg-host :global(.milkdown) {
    height: 100%;
    min-height: 100%;
  }

  .wysiwyg-host :global(.cm-activeLine) {
    background: transparent !important;
  }

  .wysiwyg-host :global(.cm-activeLineGutter) {
    background: transparent !important;
  }

  .wysiwyg-host :global(.ProseMirror) {
    min-height: 100%;
    padding: 16px 20px;
    outline: none;
    font-size: 14px;
    line-height: 1.6;
  }

  .wysiwyg-host :global(.ProseMirror h1) {
    font-size: 1.5em;
    margin: 0.6em 0 0.4em;
  }

  .wysiwyg-host :global(.ProseMirror h2) {
    font-size: 1.25em;
    margin: 0.5em 0 0.3em;
  }

  .wysiwyg-host :global(.ProseMirror h3) {
    font-size: 1.1em;
    margin: 0.4em 0 0.2em;
  }

  /* Card mode: style <hr> as a page break indicator */
  .wysiwyg-host.card-mode :global(.ProseMirror hr) {
    border: none;
    margin: 1.5em 0;
    position: relative;
    padding: 12px 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 6px,
      #e8d5d3 6px,
      #e8d5d3 12px
    );
    background-size: 100% 2px;
    background-repeat: no-repeat;
    background-position: center;
  }

  .wysiwyg-host.card-mode :global(.ProseMirror hr::after) {
    content: '[[pagebreak]]';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    color: #d4564d;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 12px;
    border: 1px solid #e8d5d3;
    border-radius: 10px;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
</style>
