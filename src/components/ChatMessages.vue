<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { debugMode, useAppState } from '../services/store.ts'
import { storeToRefs } from 'pinia'
import ToggleInput from './Inputs/ToggleInput.vue'

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

const messages = computed(() =>
  debugMode.value
    ? currentChat?.value?.messages
    : currentChat?.value?.messages.filter((m) => m.role != 'system'),
)
</script>

<template>
  <div
    ref="chatElement"
    class="flex-1 overflow-y-auto rounded-xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 sm:text-base sm:leading-7 scroll-smooth"
  >
    <ChatMessage v-for="message in messages" :message="message" />
  </div>
</template>
