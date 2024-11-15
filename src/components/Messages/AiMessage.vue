<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { debugMode } from '../../services/appConfig.ts'
import Markdown from '../Markdown.ts'
import 'highlight.js/styles/github-dark.css'
import logo from '/logo.png'

type Props = {
  message: Message
}

const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex rounded-xl bg-gray-100 px-2 py-6 dark:bg-gray-800 sm:px-4">
    <img
      class="mr-2 flex size-10 rounded-full border border-gray-200 bg-white object-contain sm:mr-4"
      :src="logo"
      alt="Ollama"
    />

    <div class="flex max-w-3xl items-center rounded-xl">
      <code v-if="debugMode" class="whitespace-pre-line">{{ message.content }}</code>
      <div
        v-else
        class="prose prose-base max-w-full dark:prose-invert prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-base prose-p:first:mt-0 prose-a:text-blue-600 prose-code:text-sm prose-code:text-gray-100 prose-pre:p-2 dark:prose-code:text-gray-100"
      >
        <Markdown :source="message.content" />
      </div>
    </div>
  </div>
</template>
