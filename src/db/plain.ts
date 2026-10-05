import { isProxy, toRaw } from 'vue'

/** Deep-unwraps Vue proxies so values survive IndexedDB's structured clone. */
export function plain<T>(value: T): T {
  const raw = isProxy(value) ? toRaw(value) : value
  if (Array.isArray(raw)) return raw.map(plain) as T
  if (raw && typeof raw === 'object' && !(raw instanceof Date) && !(raw instanceof Blob)) {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(raw)) if (v !== undefined) out[key] = plain(v)
    return out as T
  }
  return raw
}
