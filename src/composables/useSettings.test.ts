import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const load = () => import('./useSettings')

describe('legacy settings migration', () => {
  it('maps the v1 dark-mode switch to the theme setting', async () => {
    localStorage.setItem('darkMode', 'false')
    const { theme } = await load()
    expect(theme.value).toBe('light')
    expect(localStorage.getItem('darkMode')).toBeNull()
  })

  it('keeps v1 users in dark mode by default', async () => {
    localStorage.setItem('darkMode', 'true')
    expect((await load()).theme.value).toBe('dark')
  })

  it('keeps a custom Ollama URL and drops the old localhost defaults', async () => {
    localStorage.setItem('baseUrl', 'http://gpu-box:11434/api')
    expect((await load()).ollamaUrl.value).toBe('http://gpu-box:11434/api')
    vi.resetModules()
    localStorage.clear()
    localStorage.setItem('baseUrl', 'http://localhost:11434/api')
    expect((await load()).ollamaUrl.value).toBe('')
  })

  it('treats the v1 "none" model placeholder as no model', async () => {
    localStorage.setItem('currentModel', 'none')
    expect((await load()).currentModel.value).toBe('')
  })
})
