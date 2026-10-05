export type Role = 'user' | 'assistant' | 'system' | 'tool'

export type ThinkLevel = boolean | 'low' | 'medium' | 'high'

export interface TextPart {
  type: 'text'
  text: string
}

export interface ReasoningPart {
  type: 'reasoning'
  text: string
  /** Epoch ms when the first reasoning token arrived; cleared once durationMs is known. */
  startedAt?: number
  durationMs?: number
}

export interface FilePart {
  type: 'file'
  mediaType: string
  name: string
  /** Base64 payload without the `data:` prefix. */
  data: string
}

export interface ToolCallPart {
  type: 'tool-call'
  name: string
  args: unknown
  result?: unknown
  state: 'running' | 'done' | 'error'
}

export interface ErrorPart {
  type: 'error'
  message: string
}

export type Part = TextPart | ReasoningPart | FilePart | ToolCallPart | ErrorPart

export type MessageStatus = 'streaming' | 'done' | 'aborted' | 'error'

export interface MessageMeta {
  model?: string
  promptTokens?: number
  evalTokens?: number
  totalMs?: number
  evalMs?: number
  loadMs?: number
  doneReason?: string
}

export interface MessageNode {
  id: string
  chatId: string
  parentId: string | null
  role: Role
  parts: Part[]
  status: MessageStatus
  meta?: MessageMeta
  createdAt: Date
}

export interface ModelOptions {
  temperature?: number
  top_p?: number
  top_k?: number
  num_ctx?: number
  num_predict?: number
  repeat_penalty?: number
  seed?: number
}

/** Generation settings resolved in layers: global → model → chat. Undefined fields inherit. */
export interface GenerationSettings {
  systemPrompt?: string
  think?: ThinkLevel
  keepAlive?: string
  options?: ModelOptions
}

export interface Chat {
  id: string
  title: string
  model: string
  createdAt: Date
  /** Time of the last message; drives sidebar ordering. Renames and auto-titles leave it alone. */
  updatedAt: Date
  pinned?: boolean
  archived?: boolean
  activeLeafId: string | null
  settings?: GenerationSettings
  titleGenerated?: boolean
}

/** Model-scoped or global ('') generation defaults. */
export interface Preset {
  scope: string
  settings: GenerationSettings
}

export const GLOBAL_SCOPE = ''
