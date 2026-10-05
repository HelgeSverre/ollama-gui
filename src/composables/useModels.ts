import { reactive, ref, shallowRef } from 'vue'
import { OllamaError, resolveHost } from '../ollama/client'
import {
  deleteModel,
  listModels,
  listRunning,
  pullModel,
  showModel,
  unloadModel,
  type ModelInfo,
  type PullState,
} from '../ollama/models'
import type { ListedModel, RunningModel } from '../ollama/types'

export type Connection = 'unknown' | 'ok' | 'error'

const models = shallowRef<ListedModel[]>([])
const running = shallowRef<RunningModel[]>([])
const connection = ref<Connection>('unknown')
const connectionError = ref<string | null>(null)
const loading = ref(false)
const info = reactive(new Map<string, ModelInfo>())
const infoRequests = new Map<string, Promise<ModelInfo | undefined>>()

export interface PullJob extends PullState {
  model: string
  error?: string
  abort(): void
}
const pulls = reactive(new Map<string, PullJob>())

async function refresh() {
  loading.value = true
  try {
    models.value = await listModels()
    connection.value = 'ok'
    connectionError.value = null
  } catch (error) {
    connection.value = 'error'
    connectionError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function refreshRunning() {
  try {
    running.value = await listRunning()
  } catch {
    running.value = []
  }
}

/** Fetches and caches /api/show for a model. Concurrent calls share one request. */
function loadInfo(model: string): Promise<ModelInfo | undefined> {
  if (!model) return Promise.resolve(undefined)
  const cached = info.get(model)
  if (cached) return Promise.resolve(cached)
  let pending = infoRequests.get(model)
  if (!pending) {
    pending = showModel(model)
      .then((result) => {
        info.set(model, result)
        return result
      })
      .catch(() => undefined)
      .finally(() => infoRequests.delete(model))
    infoRequests.set(model, pending)
  }
  return pending
}

async function pull(model: string) {
  const name = model.trim()
  if (!name || pulls.has(name)) return
  const controller = new AbortController()
  pulls.set(name, {
    model: name,
    status: 'starting',
    completed: 0,
    total: 0,
    abort: () => controller.abort(),
  })
  try {
    for await (const state of pullModel(name, controller.signal)) {
      Object.assign(pulls.get(name)!, state)
    }
    pulls.delete(name)
    await refresh()
  } catch (error) {
    const job = pulls.get(name)
    if (controller.signal.aborted) pulls.delete(name)
    else if (job) job.error = error instanceof OllamaError ? error.message : String(error)
  }
}

async function remove(model: string) {
  await deleteModel(model)
  info.delete(model)
  await refresh()
}

async function unload(model: string) {
  await unloadModel(model)
  await refreshRunning()
}

export function useModels() {
  return {
    models,
    running,
    connection,
    connectionError,
    loading,
    info,
    pulls,
    host: resolveHost,
    refresh,
    refreshRunning,
    loadInfo,
    pull,
    remove,
    unload,
  }
}
