import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { computed, ref, watch, watchEffect } from 'vue'
import { resolveLocale } from '../domain/format'

export type Theme = 'system' | 'light' | 'dark'

migrateLegacySettings()

/** Ollama origin override; empty uses the build default (see resolveHost). */
export const ollamaUrl = useLocalStorage('ollama-gui:url', '')
export const theme = useLocalStorage<Theme>('ollama-gui:theme', 'system')
/** BCP 47 tag for dates and numbers; empty follows the browser. */
export const dateLocale = useLocalStorage('ollama-gui:locale', '')
export const autoTitle = useLocalStorage('ollama-gui:auto-title', true)
export const currentModel = useLocalStorage('currentModel', '')
export const enableMarkdown = useLocalStorage('markdown', true)
export const showSystem = useLocalStorage('systemMessages', true)
export const gravatarEmail = useLocalStorage('gravatarEmail', '')

export const locale = computed(() => resolveLocale(dateLocale.value))

const prefersDark = usePreferredDark()
export const isDark = computed(() =>
  theme.value === 'system' ? prefersDark.value : theme.value === 'dark',
)

/** Keeps the `.dark` class on <html> in sync with the theme setting. */
export function applyTheme() {
  watchEffect(() => {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  })
}

export const avatarUrl = ref<string | null>(null)
watch(
  gravatarEmail,
  async (email) => {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !crypto.subtle) {
      avatarUrl.value = null
      return
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    avatarUrl.value = `https://gravatar.com/avatar/${hex}?s=96&d=mp`
  },
  { immediate: true },
)

/**
 * v2.0 stored `baseUrl` with a localhost default written on first load; keep only real overrides.
 * Also drops keys for removed features.
 */
function migrateLegacySettings() {
  try {
    for (const key of ['settingsPanelOpen', 'systemPromptOpen', 'historyMessageLength']) localStorage.removeItem(key)
    // useLocalStorage stores strings raw, not JSON-encoded
    const value = localStorage.getItem('baseUrl')
    if (value === null) return
    const defaults = ['', 'http://localhost:11434', 'http://localhost:11434/api']
    if (!defaults.includes(value.trim().replace(/\/$/, ''))) {
      localStorage.setItem('ollama-gui:url', value.trim())
    }
    localStorage.removeItem('baseUrl')
  } catch {
    // storage unavailable
  }
}
