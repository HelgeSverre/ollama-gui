import { useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { db } from './database'
import type { Config } from './database'

export const currentModel = useLocalStorage('currentModel', 'none')
export const gravatarEmail = useLocalStorage('gravatarEmail', '')
export const historyMessageLength = useLocalStorage('historyMessageLength', 10)
export const enableMarkdown = useLocalStorage('markdown', true)
export const showSystem = useLocalStorage('systemMessages', true)
export const baseUrl = useLocalStorage('baseUrl', 'http://localhost:11434')

export const isSettingsOpen = useLocalStorage('settingsPanelOpen', false)
export const isModelManagerOpen = ref(false)
export const isSystemPromptOpen = useLocalStorage('systemPromptOpen', false)

export const toggleSettingsPanel = () => (isSettingsOpen.value = !isSettingsOpen.value)
export const toggleModelManager = () =>
  (isModelManagerOpen.value = !isModelManagerOpen.value)
export const toggleSystemPromptPanel = () =>
  (isSystemPromptOpen.value = !isSystemPromptOpen.value)

export const avatarUrl = computed(() => {
  const email = gravatarEmail.value.trim().toLowerCase()
  return email ? `https://gravatar.com/avatar/${md5(email)}?s=200&d=mp` : null
})

export function useConfig() {
  const setConfig = async (config: Config) => {
    config.id = hashString(config.model)
    await db.config.put(config)
  }

  const getCurrentSystemMessage = async () => {
    const modelConfig = await db.config.where('model').equals(currentModel.value).first()
    const prompt = modelConfig?.systemPrompt
    if (prompt) return prompt
    const defaultConfig = await db.config.where('model').equals('default').first()
    return defaultConfig?.systemPrompt ?? null
  }

  const initializeConfig = async (model: string) => {
    try {
      const [modelConfig, defaultConfig] = await Promise.all([
        db.config.where('model').equals(model).first(),
        db.config.where('model').equals('default').first(),
      ])
      return { modelConfig, defaultConfig }
    } catch (error) {
      console.error('Failed to initialize config:', error)
      return null
    }
  }

  return { initializeConfig, setConfig, getCurrentSystemMessage }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}

function md5(str: string): string {
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    const n = (a + q + x + t) >>> 0
    return ((n << s) | (n >>> (32 - s))) + b
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t) }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t) }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t) }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t) }
  const l = str.length
  const words = Array<number>(((l + 8) >> 6) + 1 << 4)
  for (let i = 0; i < l; i++) words[i >> 2] |= str.charCodeAt(i) << ((i & 3) << 3)
  words[l >> 2] |= 0x80 << ((l & 3) << 3)
  words[words.length - 2] = l << 3
  words[words.length - 1] = l >>> 29
  let [a, b, c, d] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
  for (let i = 0; i < words.length; i += 16) {
    const [aa, bb, cc, dd] = [a, b, c, d]
    a = ff(a, b, c, d, words[i + 0], 7, 0xd76aa478); d = ff(d, a, b, c, words[i + 1], 12, 0xe8c7b756); c = ff(c, d, a, b, words[i + 2], 17, 0x242070db); b = ff(b, c, d, a, words[i + 3], 22, 0xc1bdceee)
    a = ff(a, b, c, d, words[i + 4], 7, 0xf57c0faf); d = ff(d, a, b, c, words[i + 5], 12, 0x4787c62a); c = ff(c, d, a, b, words[i + 6], 17, 0xa8304613); b = ff(b, c, d, a, words[i + 7], 22, 0xfd469501)
    a = ff(a, b, c, d, words[i + 8], 7, 0x698098d8); d = ff(d, a, b, c, words[i + 9], 12, 0x8b44f7af); c = ff(c, d, a, b, words[i + 10], 17, 0xffff5bb1); b = ff(b, c, d, a, words[i + 11], 22, 0x895cd7be)
    a = ff(a, b, c, d, words[i + 12], 7, 0x6b901122); d = ff(d, a, b, c, words[i + 13], 12, 0xfd987193); c = ff(c, d, a, b, words[i + 14], 17, 0xa679438e); b = ff(b, c, d, a, words[i + 15], 22, 0x49b40821)
    a = gg(a, b, c, d, words[i + 1], 5, 0xf61e2562); d = gg(d, a, b, c, words[i + 6], 9, 0xc040b340); c = gg(c, d, a, b, words[i + 11], 14, 0x265e5a51); b = gg(b, c, d, a, words[i + 0], 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, words[i + 5], 5, 0xd62f105d); d = gg(d, a, b, c, words[i + 10], 9, 0x2441453); c = gg(c, d, a, b, words[i + 15], 14, 0xd8a1e681); b = gg(b, c, d, a, words[i + 4], 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, words[i + 9], 5, 0x21e1cde6); d = gg(d, a, b, c, words[i + 12], 9, 0xc33707d6); c = gg(c, d, a, b, words[i + 15], 14, 0xf4d50d87); b = gg(b, c, d, a, words[i + 2], 20, 0x455a14ed)
    a = gg(a, b, c, d, words[i + 13], 5, 0xa9e3e905); d = gg(d, a, b, c, words[i + 2], 9, 0xfcefa3f8); c = gg(c, d, a, b, words[i + 7], 14, 0x676f02d9); b = gg(b, c, d, a, words[i + 12], 20, 0x8d2a4c8a)
    a = hh(a, b, c, d, words[i + 5], 4, 0xfffa3942); d = hh(d, a, b, c, words[i + 8], 11, 0x8771f681); c = hh(c, d, a, b, words[i + 11], 16, 0x6d9d6122); b = hh(b, c, d, a, words[i + 14], 23, 0xfde5380c)
    a = hh(a, b, c, d, words[i + 1], 4, 0xa4beea44); d = hh(d, a, b, c, words[i + 4], 11, 0x4bdecfa9); c = hh(c, d, a, b, words[i + 7], 16, 0xf6bb4b60); b = hh(b, c, d, a, words[i + 10], 23, 0xbebfbc70)
    a = hh(a, b, c, d, words[i + 13], 4, 0x289b7ec6); d = hh(d, a, b, c, words[i + 0], 11, 0xeaa127fa); c = hh(c, d, a, b, words[i + 3], 16, 0xd4ef3085); b = hh(b, c, d, a, words[i + 6], 23, 0x4881d05)
    a = hh(a, b, c, d, words[i + 9], 4, 0xd9d4d039); d = hh(d, a, b, c, words[i + 12], 11, 0xe6db99e5); c = hh(c, d, a, b, words[i + 15], 16, 0x1fa27cf8); b = hh(b, c, d, a, words[i + 2], 23, 0xc4ac5665)
    a = ii(a, b, c, d, words[i + 0], 6, 0xf4292244); d = ii(d, a, b, c, words[i + 7], 10, 0x432aff97); c = ii(c, d, a, b, words[i + 14], 15, 0xab9423a7); b = ii(b, c, d, a, words[i + 5], 21, 0xfc93a039)
    a = ii(a, b, c, d, words[i + 12], 6, 0x655b59c3); d = ii(d, a, b, c, words[i + 3], 10, 0x8f0ccc92); c = ii(c, d, a, b, words[i + 10], 15, 0xffeff47d); b = ii(b, c, d, a, words[i + 1], 21, 0x85845dd1)
    a = ii(a, b, c, d, words[i + 8], 6, 0x6fa87e4f); d = ii(d, a, b, c, words[i + 15], 10, 0xfe2ce6e0); c = ii(c, d, a, b, words[i + 6], 15, 0xa3014314); b = ii(b, c, d, a, words[i + 13], 21, 0x4e0811a1)
    a = ii(a, b, c, d, words[i + 4], 6, 0xf7537e82); d = ii(d, a, b, c, words[i + 11], 10, 0xbd3af235); c = ii(c, d, a, b, words[i + 2], 15, 0x2ad7d2bb); b = ii(b, c, d, a, words[i + 9], 21, 0xeb86d391)
    a = (a + aa) >>> 0; b = (b + bb) >>> 0; c = (c + cc) >>> 0; d = (d + dd) >>> 0
  }
  const hex = (v: number) => ((v >>> 0).toString(16).padStart(8, '0'))
  return hex(d) + hex(c) + hex(b) + hex(a)
}
