import { reactive } from 'vue'
import { plain } from '../db/plain'
import { db } from '../db/schema'
import { compactSettings } from '../domain/settings'
import { GLOBAL_SCOPE, type GenerationSettings } from '../domain/types'

/** Generation defaults keyed by scope: '' for global, otherwise the model name. */
const presets = reactive(new Map<string, GenerationSettings>())

async function loadPresets() {
  const rows = await db.presets.toArray()
  presets.clear()
  for (const row of rows) presets.set(row.scope, row.settings)
}

async function savePreset(scope: string, settings: GenerationSettings) {
  const compact = compactSettings(plain(settings))
  if (compact) {
    presets.set(scope, compact)
    await db.presets.put({ scope, settings: compact })
  } else {
    presets.delete(scope)
    await db.presets.delete(scope)
  }
}

export function usePresets() {
  return {
    presets,
    globalPreset: () => presets.get(GLOBAL_SCOPE),
    modelPreset: (model: string) => presets.get(model),
    loadPresets,
    savePreset,
  }
}
