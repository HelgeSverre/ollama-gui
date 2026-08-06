import { Ollama } from 'ollama'
import { baseUrl } from './appConfig.ts'

const resolveHost = () => {
  if (import.meta.env.DEV) return 'http://localhost:11434'
  const url = baseUrl.value || 'http://localhost:11434'
  return url.replace(/\/api$/, '').replace(/\/$/, '')
}

let _host: string | null = null
let _client: Ollama | null = null

export function getOllama(): Ollama {
  const host = resolveHost()
  if (host !== _host) {
    _client = new Ollama({ host })
    _host = host
  }
  return _client!
}
