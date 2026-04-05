<script lang="ts">
  import { onMount } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { EditorState } from '@codemirror/state'
  import { markdown as langMarkdown } from '@codemirror/lang-markdown'
  import { languages } from '@codemirror/language-data'
  import { oneDark } from '@codemirror/theme-one-dark'

  interface Props {
    markdown: string
    placeholder?: string
  }

  let { markdown = $bindable(), placeholder = '' }: Props = $props()

  let editorView = $state<EditorView | null>(null)
  let editorContainerEl = $state<HTMLDivElement | null>(null)
  let suppressEditorUpdate = false

  export function insertTextAtSelection(text: string): boolean {
    if (!editorView) return false

    const { from, to } = editorView.state.selection.main
    suppressEditorUpdate = true
    editorView.dispatch({
      changes: { from, to, insert: text },
      selection: {
        anchor: from + text.length,
      },
      scrollIntoView: true,
    })
    suppressEditorUpdate = false
    markdown = editorView.state.doc.toString()
    editorView.focus()
    return true
  }

  onMount(() => {
    if (!editorContainerEl) return

    const startState = EditorState.create({
      doc: markdown,
      extensions: [
        basicSetup,
        langMarkdown({ codeLanguages: languages }),
        oneDark,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressEditorUpdate) {
            markdown = update.state.doc.toString()
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
          },
        }),
        ...(placeholder
          ? [
              EditorView.contentAttributes.of({
                'aria-placeholder': placeholder,
              }),
            ]
          : []),
      ],
    })

    editorView = new EditorView({
      state: startState,
      parent: editorContainerEl,
    })

    return () => {
      editorView?.destroy()
    }
  })

  // Sync external markdown changes into the editor
  $effect(() => {
    if (editorView && markdown !== editorView.state.doc.toString()) {
      suppressEditorUpdate = true
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: markdown,
        },
      })
      suppressEditorUpdate = false
    }
  })
</script>

<div class="editor-host" bind:this={editorContainerEl}></div>

<style>
  .editor-host {
    flex: 1;
    height: 100%;
    overflow: hidden;
    background-color: #282c34;
  }

  .editor-host :global(.cm-editor) {
    height: 100%;
    outline: none;
  }
</style>
