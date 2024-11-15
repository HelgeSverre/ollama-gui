<script setup lang="ts">
import { Message } from '../../services/database.ts'

type Props = {
  message: Message
}
const { message } = defineProps<Props>()
</script>

<template>
  <div class="mb-4 flex rounded-xl bg-blue-50 px-2 py-6 dark:bg-blue-900 sm:px-4">
    <div
      class="mr-2 flex size-10 items-center justify-center rounded-full bg-blue-100 text-center text-2xl dark:bg-blue-800 sm:mr-4"
    >
      🧠
    </div>

    <div class="flex max-w-3xl items-center">
      <pre
        class="whitespace-pre-wrap rounded-md border border-blue-200 bg-blue-50 p-4 text-sm leading-tight text-blue-900 dark:border-blue-700 dark:bg-blue-800 dark:text-blue-50"
        >{{ message.content }}</pre
      >
    </div>
  </div>
</template>
