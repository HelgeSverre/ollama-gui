<script setup lang="ts">
import { Message } from '../../services/database.ts'

type Props = {
  message: Message
}
const { message } = defineProps<Props>()
</script>

<template>
  <div class="mb-4 flex rounded-xl px-2 py-6 dark:bg-pink-800 bg-pink-100 sm:px-4">
    <div
      class="mr-2 flex h-10 w-10 text-2xl items-center justify-center text-center dark:bg-pink-700 bg-pink-100 rounded-full sm:mr-4"
    >
      🧠
    </div>

    <div class="flex max-w-3xl items-center">
      <pre
        class="whitespace-pre-wrap text-sm dark:bg-pink-700 dark:text-white bg-pink-100 leading-tight p-4 dark:border-pink-800 border-pink-200 border rounded-md"
        >{{ message.content }}</pre
      >
    </div>
  </div>
</template>
