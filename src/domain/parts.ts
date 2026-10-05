import type { FilePart, MessageMeta, Part, ReasoningPart } from './types'

/** Normalised streaming event, independent of the provider wire format. */
export type ChatEvent =
  | { type: 'reasoning'; text: string }
  | { type: 'text'; text: string }
  | { type: 'tool-call'; name: string; args: unknown }
  | { type: 'finish'; meta: MessageMeta }

/** Applies a streaming event to a message's parts in place. Returns finish meta, if any. */
export function applyEvent(parts: Part[], event: ChatEvent, now: number): MessageMeta | void {
  const last = parts[parts.length - 1]
  switch (event.type) {
    case 'reasoning':
      if (last?.type === 'reasoning' && last.durationMs === undefined) last.text += event.text
      else parts.push({ type: 'reasoning', text: event.text, startedAt: now })
      return
    case 'text':
      closeReasoning(parts, now)
      if (last?.type === 'text') last.text += event.text
      else parts.push({ type: 'text', text: event.text })
      return
    case 'tool-call':
      closeReasoning(parts, now)
      parts.push({ type: 'tool-call', name: event.name, args: event.args, state: 'done' })
      return
    case 'finish':
      closeReasoning(parts, now)
      return event.meta
  }
}

/** Stamps the duration on any reasoning part still open. */
export function closeReasoning(parts: Part[], now: number) {
  for (const part of parts) {
    if (part.type === 'reasoning' && part.durationMs === undefined) {
      part.durationMs = part.startedAt === undefined ? 0 : Math.max(0, now - part.startedAt)
      delete part.startedAt
    }
  }
}

export function textOf(parts: Part[]): string {
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function filesOf(parts: Part[]): FilePart[] {
  return parts.filter((p): p is FilePart => p.type === 'file')
}

export function reasoningOf(parts: Part[]): ReasoningPart[] {
  return parts.filter((p): p is ReasoningPart => p.type === 'reasoning')
}

export const isImage = (part: FilePart) => part.mediaType.startsWith('image/')

const OPEN = '<think>'
const CLOSE = '</think>'

/**
 * Splits `<think>…</think>` out of a streamed content channel. Models served without
 * native thinking support emit their reasoning inline this way.
 */
export class ThinkTagSplitter {
  private state: 'start' | 'thinking' | 'text' = 'start'
  private buffer = ''

  push(chunk: string): ChatEvent[] {
    this.buffer += chunk
    const events: ChatEvent[] = []
    for (;;) {
      if (this.state === 'start') {
        const trimmed = this.buffer.trimStart()
        if (trimmed.startsWith(OPEN)) {
          this.buffer = trimmed.slice(OPEN.length)
          this.state = 'thinking'
          continue
        }
        if (OPEN.startsWith(trimmed)) return events
        this.state = 'text'
        continue
      }
      if (this.state === 'thinking') {
        const end = this.buffer.indexOf(CLOSE)
        if (end !== -1) {
          if (end > 0) events.push({ type: 'reasoning', text: this.buffer.slice(0, end) })
          this.buffer = this.buffer.slice(end + CLOSE.length).replace(/^\s+/, '')
          this.state = 'text'
          continue
        }
        const keep = partialSuffix(this.buffer, CLOSE)
        const emit = this.buffer.slice(0, this.buffer.length - keep)
        if (emit) events.push({ type: 'reasoning', text: emit })
        this.buffer = this.buffer.slice(emit.length)
        return events
      }
      if (this.buffer) events.push({ type: 'text', text: this.buffer })
      this.buffer = ''
      return events
    }
  }

  /** Emits anything still buffered when the stream ends. */
  flush(): ChatEvent[] {
    const rest = this.buffer
    this.buffer = ''
    if (!rest) return []
    return [{ type: this.state === 'thinking' ? 'reasoning' : 'text', text: rest }]
  }
}

/** Length of the longest suffix of `text` that is a proper prefix of `token`. */
function partialSuffix(text: string, token: string): number {
  for (let n = Math.min(token.length - 1, text.length); n > 0; n--) {
    if (text.endsWith(token.slice(0, n))) return n
  }
  return 0
}

const DATA_IMAGE = /!\[[^\]]*\]\((data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+))\)/g

/** Converts a v1 flat `content` string into parts (think tags, inline data-URL images). */
export function partsFromLegacyContent(content: string): Part[] {
  const parts: Part[] = []
  const splitter = new ThinkTagSplitter()
  const events = [...splitter.push(content), ...splitter.flush()]
  let text = ''
  for (const event of events) {
    if (event.type === 'reasoning') parts.push({ type: 'reasoning', text: event.text, durationMs: 0 })
    else if (event.type === 'text') text += event.text
  }
  let index = 0
  text = text.replace(DATA_IMAGE, (_m, _url, mediaType: string, data: string) => {
    parts.push({ type: 'file', mediaType, name: `image-${++index}`, data })
    return ''
  })
  text = text.trim()
  if (text) parts.push({ type: 'text', text })
  return parts
}
