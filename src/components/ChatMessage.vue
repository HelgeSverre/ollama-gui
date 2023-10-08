<script setup lang="ts">
import { ChatMessage } from '../services/store.ts'
import SystemMessage from './Messages/SystemMessage.vue'
import UserMessage from './Messages/UserMessage.vue'
import AiMessage from './Messages/AiMessage.vue'

type Props = {
  message: ChatMessage
}

const { message } = defineProps<Props>()
</script>

<template>
  <SystemMessage v-if="message.role == 'system'" :message="message" />
  <UserMessage v-if="message.role == 'user'" :message="message" />
  <AiMessage v-if="message.role == 'ai'" :message="message" />
</template>
