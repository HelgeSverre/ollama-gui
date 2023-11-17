<script setup lang="ts">
import { Message } from '../../services/database.ts'
import { avatarUrl } from '../../services/appConfig.ts'

type Props = {
  message: Message
}

const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-row px-2 py-4 sm:px-4">
    <img class="mr-2 flex h-10 w-10 rounded-full sm:mr-4" :src="avatarUrl" />

    <div class="flex max-w-3xl items-center">
      <p class="whitespace-pre-line">{{ message.content }}</p>
    </div>
  </div>
</template>
