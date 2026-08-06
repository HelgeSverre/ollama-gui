<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { enableMarkdown } from '../../services/appConfig.ts'
import Markdown from '../Markdown.vue'
import 'highlight.js/styles/github-dark.css'
import logo from '/logo.png'
import { computed } from 'vue'

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
</script>

<template>
  <div class="flex gap-3 py-2.5" data-testid="ai-message">
    <img
      class="mt-0.5 h-[22px] w-[22px] flex-none rounded-[3px] object-contain opacity-80"
      :src="logo"
      alt="Ollama"
    />
    <div class="min-w-0 flex-1">
      <details v-if="parts.thinking" class="mb-3">
        <summary
          class="text-text-muted hover:text-text-secondary cursor-pointer text-[11px]"
        >
          Thinking
        </summary>
        <pre
          class="border-border bg-page text-text-secondary mt-2 rounded-[5px] border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
          >{{ parts.thinking }}</pre>
      </details>
      <div
        v-if="!enableMarkdown"
        class="text-text text-[13px] leading-relaxed whitespace-pre-wrap"
      >
        {{ parts.response }}
      </div>
      <div v-else class="text-text message-content text-[13px] leading-relaxed">
        <Markdown :source="parts.response" />
      </div>
    </div>
  </div>
</template>
