<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { avatarUrl, enableMarkdown } from '../../services/appConfig.ts'
import Markdown from '../Markdown.vue'

type Props = { message: Message }
const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex justify-end gap-3 py-2" data-testid="user-message">
    <div
      class="border-border bg-panel max-w-[85%] min-w-0 rounded-[5px] border px-3.5 py-2.5"
    >
      <div
        v-if="!enableMarkdown"
        class="text-text text-[13px] leading-relaxed whitespace-pre-wrap"
      >
        {{ message.content }}
      </div>
      <div v-else class="text-text message-content text-[13px] leading-relaxed">
        <Markdown :source="message.content" />
      </div>
    </div>
    <img
      v-if="avatarUrl"
      class="mt-0.5 h-[22px] w-[22px] flex-none rounded-[3px]"
      :src="avatarUrl"
    />
    <div
      v-else
      class="bg-hover mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[3px] text-[12px]"
    >
      &#x1F9D1;
    </div>
  </div>
</template>
