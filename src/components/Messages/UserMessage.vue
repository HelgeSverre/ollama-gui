<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { avatarUrl, debugMode } from '../../services/appConfig.ts'
import Markdown from '../Markdown.ts'

type Props = {
  message: Message
}

const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-row px-2 py-4 sm:px-4">
    <img class="mr-2 flex h-10 w-10 rounded-full sm:mr-4" :src="avatarUrl" />

    <div class="flex max-w-3xl items-center">
      <code v-if="debugMode" class="whitespace-pre-line">{{ message.content }}</code>
      <div
        v-else
        class="prose prose-base prose-zinc max-w-full prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base prose-p:first:mt-0 prose-a:text-blue-600 prose-code:text-sm prose-pre:p-2 dark:text-zinc-100"
      >
        <Markdown :source="message.content" />
      </div>
    </div>
  </div>
</template>
