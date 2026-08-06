<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { avatarUrl, enableMarkdown } from '../../services/appConfig.ts'
import Markdown from '../Markdown.vue'
import { IconCopy } from '@tabler/icons-vue'
import { ref } from 'vue'

type Props = { message: Message }
const { message } = defineProps<Props>()

const copied = ref(false)

const onCopy = async () => {
  await navigator.clipboard.writeText(message.content)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="flex justify-end gap-3 py-2 group" data-testid="user-message">
    <div class="min-w-0 max-w-[85%] rounded-[5px] border border-border bg-panel px-3.5 py-2.5 relative">
      <div v-if="!enableMarkdown" class="text-[13px] leading-relaxed text-text whitespace-pre-wrap">
        {{ message.content }}
      </div>
      <div v-else class="text-[13px] leading-relaxed text-text message-content">
        <Markdown :source="message.content" />
      </div>

      <button
        @click="onCopy"
        class="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded-[4px] border border-border bg-panel px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text hover:bg-hover"
        :class="{ 'opacity-100': copied }"
      >
        <IconCopy :size="11" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>

    <img
      v-if="avatarUrl"
      class="mt-0.5 h-[22px] w-[22px] flex-none rounded-[3px]"
      :src="avatarUrl"
    />
    <div
      v-else
      class="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[3px] bg-hover text-[12px]"
    >
      &#x1F9D1;
    </div>
  </div>
</template>
