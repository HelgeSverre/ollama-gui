<script setup lang="ts">
import { Message } from '../../services/database.ts'

type Props = {
  message: Message
}

const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex rounded-xl bg-zinc-50 px-2 py-6 dark:bg-zinc-900 sm:px-4">
    <img
      class="mr-2 flex h-10 w-10 rounded-full sm:mr-4 bg-white object-contain border border-gray-200"
      src="https://ollama.ai/public/ollama.png"
    />

    <div class="flex max-w-3xl items-center rounded-xl">
      <p class="whitespace-pre-line">{{ message.content }}</p>
    </div>
  </div>
</template>
