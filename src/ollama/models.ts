import { requestJson, streamJson } from './client'
import type { ListedModel, PullProgress, RunningModel, ShowResponse } from './types'

export type Capability = 'completion' | 'vision' | 'tools' | 'thinking' | 'embedding' | 'insert'

export interface ModelInfo {
  capabilities: Capability[]
  contextLength?: number
  /** Effort levels for models that take `think: 'low' | 'medium' | 'high'` (gpt-oss). */
  thinkLevels?: ('low' | 'medium' | 'high')[]
  raw: ShowResponse
}

export async function listModels(): Promise<ListedModel[]> {
  const data = await requestJson<{ models?: ListedModel[] }>('tags')
  return (data.models ?? []).filter((m) => typeof m?.name === 'string')
}

export async function listRunning(): Promise<RunningModel[]> {
  const data = await requestJson<{ models?: RunningModel[] }>('ps')
  return data.models ?? []
}

export async function showModel(model: string): Promise<ModelInfo> {
  const raw = await requestJson<ShowResponse>('show', { method: 'POST', body: { model } })
  return toModelInfo(model, raw)
}

export function toModelInfo(model: string, raw: ShowResponse): ModelInfo {
  const capabilities = (raw.capabilities ?? []) as Capability[]
  let contextLength: number | undefined
  for (const [key, value] of Object.entries(raw.model_info ?? {})) {
    if (key.endsWith('.context_length') && typeof value === 'number') contextLength = value
  }
  const family = raw.details?.family ?? ''
  const thinkLevels =
    capabilities.includes('thinking') && (family === 'gptoss' || model.startsWith('gpt-oss'))
      ? (['low', 'medium', 'high'] as const).slice()
      : undefined
  return { capabilities, contextLength, thinkLevels, raw }
}

export async function deleteModel(model: string): Promise<void> {
  await requestJson('delete', { method: 'DELETE', body: { model } }).catch((error) => {
    // DELETE returns an empty body on success
    if (!(error instanceof SyntaxError)) throw error
  })
}

/** Unloads a model from memory by sending an empty request with keep_alive 0. */
export async function unloadModel(model: string): Promise<void> {
  await requestJson('generate', { method: 'POST', body: { model, keep_alive: 0, stream: false } })
}

export interface PullState {
  status: string
  completed: number
  total: number
}

/** Streams pull progress, summing bytes across layers into one total. */
export async function* pullModel(model: string, signal?: AbortSignal): AsyncGenerator<PullState> {
  const layers = new Map<string, { completed: number; total: number }>()
  for await (const p of streamJson<PullProgress>('pull', { model, stream: true }, signal)) {
    if (p.digest && p.total) layers.set(p.digest, { completed: p.completed ?? 0, total: p.total })
    let completed = 0
    let total = 0
    for (const layer of layers.values()) {
      completed += layer.completed
      total += layer.total
    }
    yield { status: p.status, completed, total }
  }
}
