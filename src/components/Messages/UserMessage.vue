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
    <img class="mr-2 flex size-10 rounded-full sm:mr-4" :src="avatarUrl" />

    <div class="flex max-w-3xl items-center">
      <code v-if="debugMode" class="whitespace-pre-line text-gray-900 dark:text-gray-100">
        {{ message.content }}
      </code>
      <div
        v-else
        class="prose prose-base max-w-full dark:prose-invert prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base prose-p:text-gray-900 prose-p:first:mt-0 prose-a:text-blue-600 prose-code:text-sm prose-code:text-gray-900 prose-pre:p-2 dark:prose-p:text-gray-100 dark:prose-code:text-gray-100"
      >
        <Markdown :source="message.content" />
      </div>
    </div>
  </div>
</template>
