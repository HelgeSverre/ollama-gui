<script setup lang="ts">
import { Message } from '../../services/database.ts'

type Props = {
  message: Message
}
const { message } = defineProps<Props>()
</script>

<template>
  <div class="mb-4 flex rounded-xl bg-pink-100 px-2 py-6 dark:bg-pink-800 sm:px-4">
    <div
      class="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-center text-2xl dark:bg-pink-700 sm:mr-4"
    >
      🧠
    </div>

    <div class="flex max-w-3xl items-center">
      <pre
        class="whitespace-pre-wrap rounded-md border border-pink-200 bg-pink-100 p-4 text-sm leading-tight dark:border-pink-800 dark:bg-pink-700 dark:text-white"
        >{{ message.content }}</pre
      >
    </div>
  </div>
</template>
