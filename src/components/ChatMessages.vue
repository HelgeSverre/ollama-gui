<script setup lang="ts">
import { nextTick, onMounted, onUpdated, ref } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { useAppState } from '../services/store.ts'
import { storeToRefs } from 'pinia'

const { currentChat } = storeToRefs(useAppState())

const chatElement = ref(null)

const scrollToBottom = () => {
  nextTick(() => {
    console.log('nextTick executed', chatElement.value) // Debug log

    const container = chatElement.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

onMounted(() => {
  console.log('onMounted') // Debug log
  scrollToBottom()
})

onUpdated(() => {
  console.log('onUpdated') // Debug log
  scrollToBottom()
})
</script>

<template>
  <div
    ref="chatElement"
    class="flex-1 overflow-y-auto rounded-xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 sm:text-base sm:leading-7 scroll-smooth"
  >
    <ChatMessage v-for="message in currentChat?.messages" :message="message" />
  </div>
</template>
