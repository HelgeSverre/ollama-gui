<script setup lang="ts">
import {
  IconArrowUp,
  IconBrain,
  IconFileText,
  IconPaperclip,
  IconPlayerStopFilled,
  IconX,
} from '@tabler/icons-vue'
import { useTextareaAutosize } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useChats } from '../../composables/useChats'
import { useGeneration } from '../../composables/useGeneration'
import { useModels } from '../../composables/useModels'
import { usePresets } from '../../composables/usePresets'
import { locale } from '../../composables/useSettings'
import { toast } from '../../composables/useToasts'
import { editingNodeId } from '../../composables/useUi'
import { isImage } from '../../domain/parts'
import { resolveSettings } from '../../domain/settings'
import type { FilePart, Part, ThinkLevel } from '../../domain/types'
import Menu from '../ui/Menu.vue'
import MenuItem from '../ui/MenuItem.vue'
import { ACCEPT, readAttachment } from './attachments'
import ModelPicker from './ModelPicker.vue'

const chats = useChats()
const generation = useGeneration()
const models = useModels()
const presets = usePresets()

const { textarea, input } = useTextareaAutosize({ input: '' })
const files = ref<FilePart[]>([])
const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)
const composing = ref(false)

const chatId = computed(() => chats.activeChat.value?.id)
const busy = computed(() => generation.isGenerating(chatId.value))
const canSend = computed(() => !!(input.value.trim() || files.value.length) && !!chats.activeModel.value)

const info = computed(() => models.info.get(chats.activeModel.value))
watch(
  () => chats.activeModel.value,
  (model) => void models.loadInfo(model),
  { immediate: true },
)
const supportsVision = computed(() => info.value?.capabilities.includes('vision'))
const supportsThinking = computed(() => info.value?.capabilities.includes('thinking'))

const settings = computed(() =>
  resolveSettings(
    presets.globalPreset(),
    presets.modelPreset(chats.activeModel.value),
    chats.activeChat.value ? chats.activeChat.value.settings : chats.draftSettings.value,
  ),
)

// Think toggle: on/off, or effort levels for models like gpt-oss
const thinkMenuOpen = ref(false)
const thinkLabel = computed(() => {
  const think = settings.value.think
  if (typeof think === 'string') return `Think: ${think}`
  return think === false ? 'Think: off' : 'Think'
})
const thinkActive = computed(() => settings.value.think !== false)
async function setThink(value: ThinkLevel) {
  const current = chats.activeChat.value ? chats.activeChat.value.settings : chats.draftSettings.value
  await chats.setActiveSettings({ ...(current ?? {}), think: value })
}
function onThinkClick() {
  if (info.value?.thinkLevels) thinkMenuOpen.value = !thinkMenuOpen.value
  else void setThink(!thinkActive.value)
}

// Context usage of the latest reply against num_ctx
const contextUsage = computed(() => {
  const last = [...chats.activeThread.value].reverse().find((n) => n.role === 'assistant' && n.meta?.promptTokens)
  if (!last?.meta) return null
  const used = (last.meta.promptTokens ?? 0) + (last.meta.evalTokens ?? 0)
  const limit = settings.value.options?.num_ctx
  return { used, limit, ratio: limit ? Math.min(1, used / limit) : null }
})
const nf = computed(() => new Intl.NumberFormat(locale.value))

async function addFiles(list: FileList | File[] | null | undefined) {
  for (const file of list ?? []) {
    if (file.type.startsWith('image/') && info.value && !supportsVision.value) {
      toast(`${chats.activeModel.value} can't read images. Pick a vision model.`, 'error')
      continue
    }
    const result = await readAttachment(file)
    if (typeof result === 'string') toast(result, 'error')
    else files.value.push(result)
  }
}

function onPaste(event: ClipboardEvent) {
  const pasted = [...(event.clipboardData?.files ?? [])]
  if (!pasted.length) return
  event.preventDefault()
  void addFiles(pasted)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  void addFiles(event.dataTransfer?.files)
}

function onFilePicked(event: Event) {
  const target = event.target as HTMLInputElement
  void addFiles(target.files)
  target.value = ''
}

async function submit() {
  if (busy.value) return
  if (!canSend.value) return
  const parts: Part[] = [...files.value]
  const text = input.value.trim()
  if (text) parts.push({ type: 'text', text })
  input.value = ''
  files.value = []
  await generation.send(parts)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !composing.value && !event.isComposing) {
    event.preventDefault()
    void submit()
  } else if (event.key === 'Escape' && busy.value) {
    event.preventDefault()
    generation.stop(chatId.value)
  } else if (event.key === 'ArrowUp' && !input.value && !files.value.length) {
    const lastUser = [...chats.activeThread.value].reverse().find((n) => n.role === 'user')
    if (lastUser && !busy.value) {
      event.preventDefault()
      editingNodeId.value = lastUser.id
    }
  }
}

function focus() {
  textarea.value?.focus()
}

watch(
  () => chats.activeChatId.value,
  () => focus(),
)

defineExpose({ focus })
</script>

<template>
  <div class="flex-none px-4 pb-3">
    <form
      class="bg-panel border-border-strong focus-within:border-accent/60 relative mx-auto max-w-[46rem] rounded-2xl border shadow-sm transition-colors"
      :class="{ 'border-accent ring-accent/30 ring-2': dragging }"
      data-testid="chat-input-form"
      @submit.prevent="submit"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div
        v-if="files.length"
        class="flex flex-wrap gap-2 px-3 pt-3"
      >
        <div
          v-for="(file, i) in files"
          :key="i"
          class="group border-border bg-list relative flex items-center gap-2 rounded-lg border text-[12px]"
          data-testid="attachment-chip"
        >
          <img
            v-if="isImage(file)"
            :src="`data:${file.mediaType};base64,${file.data}`"
            :alt="file.name"
            class="h-14 w-14 rounded-lg object-cover"
          >
          <span
            v-else
            class="flex items-center gap-1.5 px-2.5 py-2"
          >
            <IconFileText
              :size="15"
              class="text-text-muted"
            />
            <span class="max-w-[160px] truncate">{{ file.name }}</span>
          </span>
          <button
            type="button"
            class="bg-panel border-border-strong text-text-secondary hover:text-text absolute -top-1.5 -right-1.5 rounded-full border p-0.5"
            :aria-label="`Remove ${file.name}`"
            @click="files.splice(i, 1)"
          >
            <IconX :size="11" />
          </button>
        </div>
      </div>

      <textarea
        ref="textarea"
        v-model="input"
        rows="1"
        class="text-text placeholder:text-text-muted block max-h-[40vh] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14px] leading-relaxed outline-none"
        :placeholder="chats.activeModel.value ? `Message ${chats.activeModel.value}` : 'Select a model to start'"
        aria-label="Message"
        data-testid="chat-textarea"
        @keydown="onKeydown"
        @paste="onPaste"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      />

      <div class="flex items-center gap-1 px-2 pb-2">
        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="ACCEPT"
          class="hidden"
          data-testid="file-input"
          @change="onFilePicked"
        >
        <button
          type="button"
          class="hover:bg-hover text-text-secondary rounded-md p-1.5"
          title="Attach files"
          aria-label="Attach files"
          @click="fileInput?.click()"
        >
          <IconPaperclip :size="17" />
        </button>

        <ModelPicker />

        <Menu
          v-if="supportsThinking"
          v-model:open="thinkMenuOpen"
          align="left"
          placement="above"
        >
          <template #trigger>
            <button
              type="button"
              class="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px]"
              :class="thinkActive ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-hover'"
              :aria-pressed="thinkActive"
              data-testid="think-toggle"
              @click="onThinkClick"
            >
              <IconBrain :size="15" />
              {{ thinkLabel }}
            </button>
          </template>
          <MenuItem
            v-for="level in info?.thinkLevels ?? []"
            :key="level"
            @click="setThink(level)"
          >
            {{ level[0].toUpperCase() + level.slice(1) }} effort
          </MenuItem>
          <MenuItem @click="setThink(false)">
            Off
          </MenuItem>
        </Menu>

        <span
          v-if="contextUsage"
          class="text-text-muted ml-auto flex items-center gap-1.5 text-[11px] tabular-nums"
          :title="contextUsage.limit ? 'Context used by the last reply' : 'Tokens in context after the last reply. Set num_ctx in chat settings to see the limit (Ollama defaults to 4096 unless configured).'"
          data-testid="context-meter"
        >
          <span
            v-if="contextUsage.ratio !== null"
            class="bg-hover h-1.5 w-12 overflow-hidden rounded-full"
          >
            <span
              class="block h-full rounded-full"
              :class="contextUsage.ratio > 0.9 ? 'bg-red' : contextUsage.ratio > 0.7 ? 'bg-orange' : 'bg-accent'"
              :style="{ width: `${contextUsage.ratio * 100}%` }"
            />
          </span>
          {{ nf.format(contextUsage.used) }}{{ contextUsage.limit ? ` / ${nf.format(contextUsage.limit)}` : ' tokens' }}
        </span>

        <button
          v-if="busy"
          type="button"
          class="bg-text text-panel flex h-8 w-8 flex-none items-center justify-center rounded-full hover:opacity-85"
          :class="contextUsage ? 'ml-2' : 'ml-auto'"
          aria-label="Stop generating"
          title="Stop (Esc)"
          data-testid="stop-btn"
          @click="generation.stop(chatId)"
        >
          <IconPlayerStopFilled :size="14" />
        </button>
        <button
          v-else
          type="submit"
          class="bg-accent flex h-8 w-8 flex-none items-center justify-center rounded-full text-white hover:opacity-90 disabled:opacity-30"
          :class="contextUsage ? 'ml-2' : 'ml-auto'"
          :disabled="!canSend"
          aria-label="Send message"
          data-testid="send-btn"
        >
          <IconArrowUp :size="17" />
        </button>
      </div>
    </form>
  </div>
</template>
