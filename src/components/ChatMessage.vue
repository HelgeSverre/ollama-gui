<script setup lang="ts">
import SystemMessage from './Messages/SystemMessage.vue'
import UserMessage from './Messages/UserMessage.vue'
import AiMessage from './Messages/AiMessage.vue'
import { Message } from '../services/database.ts'

type Props = {
  message: Message
}

const { message } = defineProps<Props>()
</script>

<template>
  <SystemMessage
    v-if="message.role == 'system'"
    :message="message"
  />
  <UserMessage
    v-else-if="message.role == 'user'"
    :message="message"
  />
  <AiMessage
    v-else-if="message.role == 'assistant'"
    :message="message"
  />
</template>
