<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { browser } from '$app/environment'

  interface Props {
    markdown: string
    placeholder?: string
    cardMode?: boolean
  }

  let { markdown = $bindable(), placeholder = '', cardMode = false }: Props = $props()

  let containerEl = $state<HTMLDivElement | null>(null)
  let crepeInstance: any = null
  let suppressUpdate = false

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

  onMount(() => {
    if (!containerEl) return

    let destroyed = false
    const { frontmatter, body } = stripFrontmatter(markdown)
    currentFrontmatter = frontmatter

    ;(async () => {
      const { Crepe } = await import('@milkdown/crepe')
      const { replaceAll } = await import('@milkdown/kit/utils')

      // Import CSS
      await import('@milkdown/crepe/theme/common/style.css')
      await import('@milkdown/crepe/theme/frame.css')

      if (destroyed) return

      const crepe = new Crepe({
        root: containerEl!,
        defaultValue: body,
        features: {
          [Crepe.Feature.ImageBlock]: false,
          [Crepe.Feature.BlockEdit]: !cardMode,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: { text: placeholder || 'Start writing...' },
        },
      })

      // Listen for content changes
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, md, prevMd) => {
          if (md !== prevMd && !suppressUpdate) {
            // Normalize *** to --- for consistent thematic breaks
            const normalized = md.replace(/^\*\*\*$/gm, '---')
            markdown = currentFrontmatter + normalized
          }
        })
      })

      await crepe.create()
      crepeInstance = { crepe, replaceAll }
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
    const md = markdown
    untrack(() => {
      if (!crepeInstance) return
      const { frontmatter, body } = stripFrontmatter(md)
      currentFrontmatter = frontmatter
      const currentMd = crepeInstance.crepe.getMarkdown()
      if (body !== currentMd) {
        suppressUpdate = true
        crepeInstance.crepe.editor.action(crepeInstance.replaceAll(body))
        suppressUpdate = false
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
    border-top: 2px dashed #d4564d;
    margin: 1.2em 0;
    position: relative;
  }

  .wysiwyg-host.card-mode :global(.ProseMirror hr::after) {
    content: '↓ 分页 ↓';
    position: absolute;
    top: -0.7em;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    color: #d4564d;
    font-size: 0.7em;
    font-weight: 600;
    padding: 0 8px;
    letter-spacing: 0.05em;
  }
</style>
