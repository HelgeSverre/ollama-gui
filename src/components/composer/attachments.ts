import type { FilePart } from '../../domain/types'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_TEXT_BYTES = 1024 * 1024

const TEXT_EXTENSIONS =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|ya?ml|toml|xml|html?|css|scss|js|jsx|ts|tsx|vue|svelte|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sh|bash|zsh|sql|ini|env|log|lua|r|dart|ex|exs|clj|hs|ml|scala|pl|graphql|proto|dockerfile|makefile)$/i

export function isTextFile(file: File) {
  return (
    file.type.startsWith('text/') ||
    /json|xml|yaml|javascript|typescript|sql/.test(file.type) ||
    TEXT_EXTENSIONS.test(file.name)
  )
}

export const ACCEPT =
  'image/*,text/*,.md,.json,.jsonl,.yaml,.yml,.toml,.csv,.ts,.tsx,.js,.jsx,.vue,.py,.go,.rs,.java,.kt,.swift,.c,.h,.cpp,.cs,.php,.rb,.sh,.sql,.log'

/** Reads a File into a file part, or returns a reason it was rejected. */
export async function readAttachment(file: File): Promise<FilePart | string> {
  const image = file.type.startsWith('image/')
  if (!image && !isTextFile(file)) return `${file.name}: unsupported file type`
  const limit = image ? MAX_IMAGE_BYTES : MAX_TEXT_BYTES
  if (file.size > limit) return `${file.name}: larger than ${limit / 1024 / 1024} MB`
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const data = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return {
    type: 'file',
    mediaType: image ? file.type : file.type || 'text/plain',
    name: file.name || (image ? 'pasted-image.png' : 'file.txt'),
    data,
  }
}
