<script setup lang="ts">
import { IconDownload, IconTrash, IconUpload } from '@tabler/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useChats } from '../../composables/useChats'
import { confirmAction } from '../../composables/useConfirm'
import { useModels } from '../../composables/useModels'
import {
  autoTitle,
  dateLocale,
  enableMarkdown,
  gravatarEmail,
  locale,
  ollamaUrl,
  showSystem,
  theme,
  type Theme,
} from '../../composables/useSettings'
import { errorMessage, toast } from '../../composables/useToasts'
import { downloadFile, exportAll, importData } from '../../composables/useTransfer'
import { closeModal, modal } from '../../composables/useUi'
import { relativeTime, resolveLocale } from '../../domain/format'
import Modal from '../ui/Modal.vue'
import Toggle from '../ui/Toggle.vue'
import CorsHelp from './CorsHelp.vue'

const chats = useChats()
const models = useModels()
const open = computed(() => modal.value === 'settings')

// Connection
const urlDraft = ref(ollamaUrl.value)
watch(open, (value) => {
  if (value) urlDraft.value = ollamaUrl.value
})
async function saveUrl() {
  ollamaUrl.value = urlDraft.value.trim()
  models.info.clear()
  await models.refresh()
  if (models.connection.value === 'ok') toast(`Connected to ${models.host()}`, 'success')
}

// Appearance
const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const LOCALES = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'nl-NL', 'sv-SE', 'nb-NO', 'da-DK', 'fi-FI', 'pl-PL', 'cs-CZ', 'ru-RU', 'uk-UA', 'tr-TR', 'ar', 'he-IL', 'hi-IN', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']
const localeChoice = ref(LOCALES.includes(dateLocale.value) || !dateLocale.value ? dateLocale.value : 'custom')
const customLocale = ref(localeChoice.value === 'custom' ? dateLocale.value : '')
// Names in English to match the UI language, e.g. "German (Germany)"
const regionNames = new Intl.DisplayNames(['en'], { type: 'language' })
const displayName = (tag: string) => {
  try {
    return regionNames.of(tag) ?? tag
  } catch {
    return tag
  }
}
const systemLocale = resolveLocale('')
watch(localeChoice, (value) => {
  dateLocale.value = value === 'custom' ? customLocale.value.trim() : value
})
watch(customLocale, (value) => {
  if (localeChoice.value === 'custom') dateLocale.value = value.trim()
})
/** Sample of every format the setting affects: date and time, relative time, numbers. */
const preview = computed(() => {
  const sample = new Date()
  sample.setHours(14, 30, 0, 0)
  const dateTime = new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(sample)
  const relative = relativeTime(new Date(Date.now() - 2 * 86400_000), locale.value)
  const number = new Intl.NumberFormat(locale.value).format(1234567.89)
  return `${dateTime} · ${relative} · ${number}`
})
const customInvalid = computed(
  () => localeChoice.value === 'custom' && !!customLocale.value.trim() && resolveLocale(customLocale.value, '') === '',
)

// Data
const persisted = ref<boolean | null>(null)
onMounted(async () => {
  persisted.value = (await navigator.storage?.persisted?.()) ?? null
})
async function requestPersist() {
  persisted.value = (await navigator.storage?.persist?.()) ?? false
  toast(persisted.value ? 'Storage is now persistent' : 'The browser declined persistent storage', persisted.value ? 'success' : 'info')
}

async function doExport() {
  const data = await exportAll()
  downloadFile(`ollama-gui-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
}

const importInput = ref<HTMLInputElement>()
async function doImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const count = await importData(JSON.parse(await file.text()))
    toast(`Imported ${count} chat${count === 1 ? '' : 's'}`, 'success')
  } catch (error) {
    toast(`Import failed: ${errorMessage(error)}`, 'error')
  }
}

async function wipe() {
  const ok = await confirmAction({
    title: 'Delete all chats?',
    message: 'Every chat and message stored in this browser will be deleted. Export first if you want a backup.',
    confirmLabel: 'Delete everything',
    danger: true,
  })
  if (ok) {
    await chats.deleteAllChats()
    toast('All chats deleted', 'success')
  }
}

const origin = location.origin
</script>

<template>
  <Modal
    :open="open"
    title="Settings"
    width="560px"
    @close="closeModal('settings')"
  >
    <div class="divide-border divide-y">
      <section class="space-y-2 p-4">
        <h3 class="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
          Connection
        </h3>
        <label
          for="ollama-url"
          class="text-text block text-[12.5px]"
        >Ollama URL</label>
        <form
          class="flex gap-2"
          @submit.prevent="saveUrl"
        >
          <input
            id="ollama-url"
            v-model="urlDraft"
            :placeholder="`Default: ${models.host('')}`"
            class="border-border bg-list text-text placeholder:text-text-muted focus:border-accent min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-[12.5px] outline-none"
            data-testid="input-base-url"
          >
          <button
            type="submit"
            class="border-border hover:bg-hover rounded-lg border px-3 py-1.5 text-[12.5px]"
          >
            Save &amp; test
          </button>
        </form>
        <p
          class="text-[12px]"
          :class="models.connection.value === 'error' ? 'text-red' : 'text-text-muted'"
        >
          <template v-if="models.connection.value === 'ok'">
            Connected to {{ models.host() }} · {{ models.models.value.length }} models
          </template>
          <template v-else-if="models.connection.value === 'error'">
            {{ models.connectionError.value }}
          </template>
          <template v-else>
            Connecting…
          </template>
        </p>
        <CorsHelp v-if="models.connection.value === 'error'" />
      </section>

      <section class="space-y-3 p-4">
        <h3 class="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
          Appearance
        </h3>
        <div class="flex items-center justify-between gap-4">
          <span class="text-text text-[12.5px]">Theme</span>
          <div
            class="bg-list border-border flex gap-0.5 rounded-lg border p-0.5"
            role="radiogroup"
            aria-label="Theme"
          >
            <button
              v-for="t in themes"
              :key="t.value"
              type="button"
              role="radio"
              :aria-checked="theme === t.value"
              class="rounded-md px-3 py-1 text-[12px]"
              :class="theme === t.value ? 'bg-panel text-text font-semibold shadow-sm' : 'text-text-secondary'"
              :data-testid="`theme-${t.value}`"
              @click="theme = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between gap-4">
            <label
              for="locale"
              class="text-text text-[12.5px]"
            >
              Regional format
              <span class="text-text-muted block text-[11.5px]">How dates, times and numbers are written</span>
            </label>
            <select
              id="locale"
              v-model="localeChoice"
              class="border-border bg-list text-text focus:border-accent max-w-[240px] rounded-lg border px-2 py-1 text-[12.5px] outline-none"
              data-testid="locale-select"
            >
              <option value="">
                Same as system ({{ displayName(systemLocale) }})
              </option>
              <option
                v-for="tag in LOCALES"
                :key="tag"
                :value="tag"
              >
                {{ displayName(tag) }}
              </option>
              <option value="custom">
                Other…
              </option>
            </select>
          </div>
          <div
            v-if="localeChoice === 'custom'"
            class="mt-2 flex items-center justify-end gap-2"
          >
            <span
              v-if="customInvalid"
              class="text-red text-[11.5px]"
            >Not recognised, using system format</span>
            <input
              v-model="customLocale"
              placeholder="Language tag, e.g. en-IE"
              class="border-border bg-list text-text focus:border-accent w-[180px] rounded-lg border px-2 py-1 text-[12.5px] outline-none"
              aria-label="Language tag"
            >
          </div>
          <p
            class="bg-list text-text-secondary mt-2 rounded-md px-2.5 py-1.5 text-[12px] tabular-nums"
            data-testid="locale-preview"
          >
            {{ preview }}
          </p>
        </div>
        <Toggle
          v-model="enableMarkdown"
          label="Render Markdown"
          description="Formatting, code highlighting and math in replies"
        />
        <Toggle
          v-model="showSystem"
          label="Show system prompts"
          description="Display the system prompt above the conversation"
        />
      </section>

      <section class="space-y-2 p-4">
        <h3 class="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
          Chats
        </h3>
        <Toggle
          v-model="autoTitle"
          label="Generate chat titles"
          description="Ask the model for a short title after the first reply"
        />
        <label
          for="gravatar"
          class="text-text block pt-1 text-[12.5px]"
        >Gravatar email <span class="text-text-muted">(optional avatar)</span></label>
        <input
          id="gravatar"
          v-model="gravatarEmail"
          type="email"
          class="border-border bg-list text-text focus:border-accent w-full rounded-lg border px-3 py-1.5 text-[12.5px] outline-none"
          data-testid="input-gravatar"
        >
      </section>

      <section class="space-y-3 p-4">
        <h3 class="text-text-muted text-[11px] font-semibold tracking-wide uppercase">
          Data
        </h3>
        <p class="text-text-secondary text-[12px] leading-relaxed">
          Chats are stored only in this browser, for <code class="bg-hover rounded px-1">{{ origin }}</code>.
          A different address, port, browser or private window starts with an empty history.
          Export to move chats between them.
        </p>
        <div
          v-if="persisted !== null"
          class="flex items-center justify-between gap-4 text-[12.5px]"
        >
          <span>{{ persisted ? 'Persistent storage is on' : 'The browser may clear storage when space runs low' }}</span>
          <button
            v-if="!persisted"
            type="button"
            class="border-border hover:bg-hover rounded-lg border px-3 py-1 text-[12px]"
            @click="requestPersist"
          >
            Keep data
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="border-border hover:bg-hover flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px]"
            data-testid="export-chats"
            @click="doExport"
          >
            <IconDownload :size="15" />
            Export all
          </button>
          <button
            type="button"
            class="border-border hover:bg-hover flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px]"
            data-testid="import-chats"
            @click="importInput?.click()"
          >
            <IconUpload :size="15" />
            Import
          </button>
          <input
            ref="importInput"
            type="file"
            accept="application/json,.json"
            class="hidden"
            data-testid="import-input"
            @change="doImport"
          >
          <button
            type="button"
            class="text-red hover:bg-red/10 ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px]"
            data-testid="delete-all-chats"
            @click="wipe"
          >
            <IconTrash :size="15" />
            Delete all chats
          </button>
        </div>
      </section>
    </div>
  </Modal>
</template>
