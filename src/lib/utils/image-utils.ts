export function getImageExtension(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext && /^[a-z0-9]+$/.test(ext)) return ext
  switch (file.type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/gif':
      return 'gif'
    default:
      return 'png'
  }
}

export function getImageAltText(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').trim() || 'Image'
}

export function escapeMarkdownImageAlt(text: string): string {
  return text.replace(/[[\]\\]/g, '\\$&')
}

export function createAssetId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now())
}

export function getMarkdownImportFile(files: FileList): File | null {
  for (const file of files) {
    if (
      file.name.endsWith('.md') ||
      file.name.endsWith('.markdown') ||
      file.name.endsWith('.txt')
    ) {
      return file
    }
  }
  return null
}

export function getImageDropFile(files: FileList): File | null {
  for (const file of files) {
    if (file.type.startsWith('image/')) return file
  }
  return null
}
