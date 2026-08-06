<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { useChats } from '../services/chat.ts'
import { showSystem } from '../services/appConfig.ts'

const { messages } = useChats()
const chatElement = ref<HTMLElement>()
const userInterferedWithScroll = ref(false)

const isAtBottom = () => {
  if (!chatElement.value) return false
  const { scrollTop, scrollHeight, clientHeight } = chatElement.value
  return scrollHeight - scrollTop <= clientHeight + 10
}

const handleUserScroll = () => {
  userInterferedWithScroll.value = !isAtBottom()
}

const scrollToBottom = () => {
  if (userInterferedWithScroll.value) return
  nextTick(() => {
    if (chatElement.value) {
      chatElement.value.scrollTop = chatElement.value.scrollHeight
    }
  })
}

onMounted(() => {
  scrollToBottom()
  chatElement.value?.addEventListener('scroll', handleUserScroll)
})

onUpdated(() => scrollToBottom())

watch(messages, () => {
  if (isAtBottom()) userInterferedWithScroll.value = false
})

onUnmounted(() => chatElement.value?.removeEventListener('scroll', handleUserScroll))

const visibleMessages = computed(() =>
  showSystem.value ? messages?.value : messages?.value.filter((m) => m.role != 'system'),
)
</script>

<template>
  <div
    ref="chatElement"
    class="flex-1 overflow-y-auto"
    role="log"
    aria-live="polite"
    aria-label="Chat messages"
  >
    <div class="mx-auto max-w-[48rem] px-4 py-4">
      <ChatMessage
        v-for="message in visibleMessages"
        :key="message.id"
        :message="message"
      />
    </div>
  </div>
</template>
