<script lang="ts">
  import type { UILang } from '$lib/i18n/lang'
  import {
    getCompilePhaseLabel,
    type PreviewCompilePhase,
  } from '$lib/typst/compilePhases'

  interface Props {
    phase: PreviewCompilePhase
    lang: UILang
  }

  let { phase, lang }: Props = $props()

  let label = $derived(getCompilePhaseLabel(phase, lang))
</script>

<div class="preview-loading" aria-live="polite">
  <div class="loading-spinner"></div>
  <div class="preview-loading-title">{label.title}</div>
  {#if label.hint}
    <div class="preview-loading-hint">{label.hint}</div>
  {/if}
</div>

<style>
  .preview-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 0 24px;
    max-width: 320px;
  }

  .preview-loading-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-gray-600, #525252);
  }

  .preview-loading-hint {
    font-size: 0.75rem;
    line-height: 1.45;
    color: var(--color-gray-400, #a3a3a3);
    font-family: var(--font-mono);
  }
</style>
