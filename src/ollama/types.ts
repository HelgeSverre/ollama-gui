/** Wire types for the subset of the Ollama REST API the app uses. */

export interface WireToolCall {
  function: { name: string; arguments: Record<string, unknown> }
}

export interface WireMessage {
  role: string
  content: string
  thinking?: string
  images?: string[]
  tool_calls?: WireToolCall[]
  tool_name?: string
}

export interface ChatRequest {
  model: string
  messages: WireMessage[]
  stream?: boolean
  think?: boolean | 'low' | 'medium' | 'high'
  keep_alive?: string | number
  options?: Record<string, unknown>
  format?: string | object
}

export interface ChatChunk {
  model: string
  message?: WireMessage
  done: boolean
  done_reason?: string
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
}

export interface ModelDetails {
  family?: string
  families?: string[]
  parameter_size?: string
  quantization_level?: string
  format?: string
}

export interface ListedModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
  details?: ModelDetails
}

export interface RunningModel extends ListedModel {
  size_vram: number
  expires_at: string
  context_length?: number
}

export interface ShowResponse {
  license?: string
  modelfile?: string
  parameters?: string
  template?: string
  system?: string
  details?: ModelDetails
  model_info?: Record<string, unknown>
  capabilities?: string[]
}

export interface PullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
}
