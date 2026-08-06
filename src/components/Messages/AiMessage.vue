<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { enableMarkdown } from '../../services/appConfig.ts'
import Markdown from '../Markdown.vue'
import 'highlight.js/styles/github-dark.css'
import logo from '/logo.png'
import { IconCopy } from '@tabler/icons-vue'
import { computed, ref } from 'vue'
import { activeStream } from '../../services/stream'

type Props = { message: Message }
const { message } = defineProps<Props>()

const parts = computed(() => {
  const t = message.content
  const idx = t.indexOf('</think>')
  if (idx !== -1) {
    return {
      thinking: t.substring('<think>'.length, idx),
      response: t.substring(idx + '</think>'.length),
    }
  }
  return { thinking: null, response: t }
})

const isLastMessage = computed(() => {
  return message.id != null && !!activeStream.value
})

const copied = ref(false)
const onCopy = async () => {
  await navigator.clipboard.writeText(parts.value.response)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="flex gap-3 py-2.5 group" data-testid="ai-message">
    <img
      class="mt-0.5 h-[22px] w-[22px] flex-none rounded-[3px] object-contain opacity-80"
      :src="logo"
      alt="Ollama"
    />
    <div class="min-w-0 flex-1 relative">
      <button
        v-if="parts.response"
        @click="onCopy"
        class="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded-[4px] border border-border bg-panel px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text hover:bg-hover"
        :class="{ 'opacity-100': copied }"
      >
        <IconCopy :size="11" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>

      <details v-if="parts.thinking" class="mb-2.5 thinking-block" open>
        <summary class="cursor-pointer text-[11px] text-text-muted hover:text-text-secondary select-none">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block w-[10px] h-[10px] rounded-full border border-text-muted/50 bg-text-muted/10"></span>
            Thinking
          </span>
        </summary>
        <pre class="mt-2 whitespace-pre-wrap rounded-[5px] border border-border bg-page p-3 text-[11px] leading-relaxed text-text-secondary font-mono">{{ parts.thinking }}</pre>
      </details>

      <div v-if="!enableMarkdown" class="whitespace-pre-wrap text-[13px] leading-relaxed text-text">
        {{ parts.response
        }}<span v-if="isLastMessage" class="typing-cursor"></span>
      </div>
      <div v-else class="text-[13px] leading-relaxed text-text message-content">
        <Markdown :source="parts.response" /><span v-if="isLastMessage" class="typing-cursor"></span>
      </div>
    </div>
  </div>
</template>
