<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { useChats } from '../services/chat.ts'
import { showSystem } from '../services/appConfig.ts'
import { activeStream } from '../services/stream'
import { IconArrowDown } from '@tabler/icons-vue'

const { messages } = useChats()
const chatElement = ref<HTMLElement>()
const userScrolledUp = ref(false)

const isAtBottom = () => {
  if (!chatElement.value) return false
  const { scrollTop, scrollHeight, clientHeight } = chatElement.value
  return scrollHeight - scrollTop <= clientHeight + 80
}

const handleUserScroll = () => {
  userScrolledUp.value = !isAtBottom()
}

const scrollToBottom = (force = false) => {
  if (!force && userScrolledUp.value) return
  nextTick(() => {
    if (chatElement.value) {
      chatElement.value.scrollTop = chatElement.value.scrollHeight
    }
  })
}

onMounted(() => {
  scrollToBottom(true)
  chatElement.value?.addEventListener('scroll', handleUserScroll)
})

watch(activeStream, (stream) => {
  if (stream) userScrolledUp.value = false
})

onUpdated(() => scrollToBottom())

watch(messages, () => {
  if (isAtBottom()) userScrolledUp.value = false
})

onUnmounted(() => chatElement.value?.removeEventListener('scroll', handleUserScroll))

const visibleMessages = computed(() =>
  showSystem.value ? messages?.value : messages?.value.filter((m) => m.role != 'system'),
)

const showEmpty = computed(() => !visibleMessages.value?.length)

const isStreaming = computed(() => !!activeStream.value)
</script>

<template>
  <div class="relative flex-1 min-h-0">
    <div
      ref="chatElement"
      class="h-full overflow-y-auto"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div class="mx-auto max-w-[48rem] px-4 py-4">
        <div
          v-if="showEmpty"
          class="flex flex-col items-center justify-center py-16 text-text-muted"
        >
          <div class="text-[48px] mb-4 opacity-20">&#9670;</div>
          <p class="text-[13px]">Start a conversation</p>
          <p class="text-[11px] mt-1">Send a message to begin chatting with the AI</p>
        </div>

        <ChatMessage
          v-for="message in visibleMessages"
          :key="message.id"
          :message="message"
        />

        <div
          v-if="isStreaming && !visibleMessages?.slice(-1)[0]?.content"
          class="flex items-center gap-2 py-2.5 text-[12px] text-text-muted"
        >
          <span class="typing-cursor"></span>
          Thinking...
        </div>
      </div>
    </div>

    <button
      v-if="userScrolledUp"
      @click="scrollToBottom(true)"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[11px] text-text-secondary shadow-lg hover:bg-hover"
      data-testid="scroll-to-bottom"
    >
      <IconArrowDown :size="13" />
      Scroll to bottom
    </button>
  </div>
</template>
