import { reactive } from 'vue'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  message: string
}

const toasts = reactive<Toast[]>([])
let nextId = 1

export function toast(
  message: string,
  kind: Toast['kind'] = 'info',
  ttl = kind === 'error' ? 8000 : 3500,
) {
  const id = nextId++
  toasts.push({ id, kind, message })
  setTimeout(() => dismiss(id), ttl)
  return id
}

export function dismiss(id: number) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useToasts() {
  return { toasts, toast, dismiss }
}
