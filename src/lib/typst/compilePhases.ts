import type { UILang } from '$lib/i18n/lang'

export type WorkerCompilePhase =
  | 'compiler-init'
  | 'fonts-core'
  | 'fonts-cjk'
  | 'fonts-emoji'
  | 'compile'

export type PreviewCompilePhase = WorkerCompilePhase | 'mermaid' | 'idle'

export type DocumentCompileFeatures = {
  hasMermaid: boolean
  hasCjk: boolean
  hasEmoji: boolean
}

export type CompilePhaseLabel = {
  title: string
  hint?: string
}

const MERMAID_PATTERN = /```mermaid\n([\s\S]*?)\n```/
const MERMAID_REGEX = /```mermaid\n([\s\S]*?)\n```/g
const CJK_REGEX = /[\u4e00-\u9fa5]/
const EMOJI_REGEX = /[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

const LABELS: Record<PreviewCompilePhase, Record<UILang, CompilePhaseLabel>> = {
  idle: {
    zh: { title: '准备中...' },
    en: { title: 'Preparing...' },
  },
  mermaid: {
    zh: { title: '正在渲染图表...' },
    en: { title: 'Rendering diagrams...' },
  },
  'compiler-init': {
    zh: { title: '正在启动排版引擎...' },
    en: { title: 'Starting typesetting engine...' },
  },
  'fonts-core': {
    zh: {
      title: '正在加载基础字体...',
      hint: 'IBM Plex Sans、数学字体',
    },
    en: {
      title: 'Loading base fonts...',
      hint: 'IBM Plex Sans, math fonts',
    },
  },
  'fonts-cjk': {
    zh: {
      title: '正在加载中文字体...',
      hint: 'Noto Sans / Serif SC，约 30MB，首次下载较慢',
    },
    en: {
      title: 'Loading CJK fonts...',
      hint: 'Noto Sans / Serif SC, ~30MB, first download may take a while',
    },
  },
  'fonts-emoji': {
    zh: {
      title: '正在加载 Emoji 字体...',
      hint: 'Noto Color Emoji，约 9MB',
    },
    en: {
      title: 'Loading emoji font...',
      hint: 'Noto Color Emoji, ~9MB',
    },
  },
  compile: {
    zh: { title: '正在排版文档...' },
    en: { title: 'Typesetting document...' },
  },
}

export function getCompilePhaseLabel(
  phase: PreviewCompilePhase,
  lang: UILang,
): CompilePhaseLabel {
  return LABELS[phase][lang]
}

export function detectDocumentFeatures(markdown: string): DocumentCompileFeatures {
  return {
    hasMermaid: MERMAID_PATTERN.test(markdown),
    hasCjk: CJK_REGEX.test(markdown),
    hasEmoji: EMOJI_REGEX.test(markdown),
  }
}

export function matchMermaidBlocks(markdown: string): RegExpMatchArray[] {
  return [...markdown.matchAll(MERMAID_REGEX)]
}

/** Best-effort phase shown before worker status arrives. */
export function anticipateFontPhase(
  features: Pick<DocumentCompileFeatures, 'hasCjk' | 'hasEmoji'>,
): PreviewCompilePhase {
  if (features.hasCjk) return 'fonts-cjk'
  if (features.hasEmoji) return 'fonts-emoji'
  return 'compiler-init'
}

export function getInitialCompilePhase(features: DocumentCompileFeatures): PreviewCompilePhase {
  if (features.hasMermaid) return 'mermaid'
  return anticipateFontPhase(features)
}

export function resolvePreviewLoadingPhase(
  status: 'idle' | 'compiling' | 'done' | 'error',
  compilePhase: PreviewCompilePhase,
): PreviewCompilePhase {
  if (status === 'compiling' && compilePhase === 'idle') return 'compiler-init'
  return compilePhase
}

export function createCompilePhaseHandler(
  seq: number,
  getCurrentSeq: () => number,
  setPhase: (phase: PreviewCompilePhase) => void,
): (phase: WorkerCompilePhase) => void {
  return (phase) => {
    if (seq !== getCurrentSeq()) return
    setPhase(phase)
  }
}
