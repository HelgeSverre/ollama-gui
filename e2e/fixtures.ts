import { test as base } from '@playwright/test'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

async function ollamaHealthCheck() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
    const data = await res.json()
    return data.models || []
  } catch {
    return null
  }
}

async function ensureModel(models: { name: string }[], modelName: string) {
  if (models.some((m) => m.name.startsWith(modelName))) return true
  try {
    const res = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const test = base.extend<{ ollamaReady: boolean }>({
  ollamaReady: [
    async ({}, use) => {
      const modelName = process.env.OLLAMA_MODEL || 'gemma3:4b'

      for (let attempt = 0; attempt < 10; attempt++) {
        const models = await ollamaHealthCheck()
        if (models !== null) {
          const ready = await ensureModel(models, modelName)
          if (ready) {
            await use(true)
            return
          }
        }
        await new Promise((r) => setTimeout(r, 2_000))
      }
      await use(false)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
