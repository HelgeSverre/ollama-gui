import type { GenerationSettings, ModelOptions } from './types'

/** Merges settings layers; later layers win, empty strings and undefined inherit. */
export function resolveSettings(
  ...layers: (GenerationSettings | undefined)[]
): GenerationSettings {
  const out: GenerationSettings = {}
  const options: ModelOptions = {}
  for (const layer of layers) {
    if (!layer) continue
    if (layer.systemPrompt?.trim()) out.systemPrompt = layer.systemPrompt
    if (layer.think !== undefined) out.think = layer.think
    if (layer.keepAlive?.trim()) out.keepAlive = layer.keepAlive
    for (const [key, value] of Object.entries(layer.options ?? {})) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        options[key as keyof ModelOptions] = value
      }
    }
  }
  if (Object.keys(options).length) out.options = options
  return out
}

/** Drops empty fields so a layer stores only real overrides. */
export function compactSettings(
  settings: GenerationSettings,
): GenerationSettings | undefined {
  const out = resolveSettings(settings)
  return Object.keys(out).length ? out : undefined
}
