<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { browser } from '$app/environment'

  interface Props {
    markdown: string
    placeholder?: string
  }

  let { markdown = $bindable(), placeholder = '' }: Props = $props()

  let containerEl = $state<HTMLDivElement | null>(null)
  let crepeInstance: any = null
  let suppressUpdate = false

  onMount(() => {
    if (!containerEl) return

    let destroyed = false

    ;(async () => {
      const { Crepe } = await import('@milkdown/crepe')
      const { replaceAll } = await import('@milkdown/kit/utils')

      // Import CSS
      await import('@milkdown/crepe/theme/common/style.css')
      await import('@milkdown/crepe/theme/frame.css')

      if (destroyed) return

      const crepe = new Crepe({
        root: containerEl!,
        defaultValue: markdown,
        features: {
          [Crepe.Feature.ImageBlock]: false,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: { text: placeholder || 'Start writing...' },
        },
      })

      // Listen for content changes
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, md, prevMd) => {
          if (md !== prevMd && !suppressUpdate) {
            markdown = md
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
      const currentMd = crepeInstance.crepe.getMarkdown()
      if (md !== currentMd) {
        suppressUpdate = true
        crepeInstance.crepe.editor.action(crepeInstance.replaceAll(md))
        suppressUpdate = false
      }
    })
  })
</script>

<div class="wysiwyg-host" bind:this={containerEl}></div>

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
  }
</style>
