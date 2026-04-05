<script lang="ts">
  interface Props {
    label: string
    position?: 'top-left' | 'top-right'
  }

  let { label, position = 'top-right' }: Props = $props()
</script>

<div class={`status-hint ${position}`} aria-live="polite">
  <div class="status-hint-spinner"></div>
  <span>{label}</span>
</div>

<style>
  .status-hint {
    position: absolute;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(17, 24, 39, 0.72);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
    color: rgba(255, 255, 255, 0.96);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    pointer-events: none;
    animation: status-hint-fade-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .status-hint.top-left {
    top: 8px;
    left: 8px;
  }

  .status-hint.top-right {
    top: 12px;
    right: 12px;
  }

  .status-hint-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.24);
    border-top-color: rgba(255, 255, 255, 0.96);
    border-radius: 50%;
    animation: status-hint-spin 0.8s linear infinite;
  }

  @keyframes status-hint-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes status-hint-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
