<script setup lang="ts">
import { IconArrowDown } from '@tabler/icons-vue'
import { useResizeObserver } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useChats } from '../../composables/useChats'
import { usePresets } from '../../composables/usePresets'
import { showSystem } from '../../composables/useSettings'
import { chatSettingsOpen } from '../../composables/useUi'
import { resolveSettings } from '../../domain/settings'
import MessageItem from './MessageItem.vue'
import OllamaAvatar from '../ui/OllamaAvatar.vue'

const chats = useChats()
const presets = usePresets()

const scroller = ref<HTMLElement>()
const content = ref<HTMLElement>()
/** True while the view should follow new content (the user is at the bottom). */
const pinned = ref(true)

const visible = computed(() =>
  chats.activeThread.value.filter((n) => showSystem.value || n.role !== 'system'),
)

const systemPrompt = computed(() => {
  const chat = chats.activeChat.value
  return resolveSettings(
    presets.globalPreset(),
    presets.modelPreset(chats.activeModel.value),
    chat ? chat.settings : chats.draftSettings.value,
  ).systemPrompt
})

function atBottom() {
  const el = scroller.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

function onScroll() {
  pinned.value = atBottom()
}

function scrollToBottom(smooth = false) {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  pinned.value = true
}

useResizeObserver(content, () => {
  if (pinned.value) scrollToBottom()
})

watch(
  () => chats.activeChatId.value,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

// Sending a message re-pins the view
watch(
  () => visible.value.length,
  async (length, previous) => {
    if (length > (previous ?? 0) && visible.value.at(-1)?.role === 'assistant') {
      await nextTick()
      scrollToBottom()
    }
  },
)
</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div
      ref="scroller"
      class="h-full overflow-y-auto"
      role="log"
      aria-label="Chat messages"
      @scroll.passive="onScroll"
    >
      <div
        ref="content"
        class="mx-auto max-w-[46rem] px-4 pt-4 pb-8"
      >
        <button
          v-if="systemPrompt && showSystem"
          type="button"
          class="border-border text-text-muted hover:text-text-secondary hover:bg-hover mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-left text-[12px]"
          title="Edit in chat settings"
          @click="chatSettingsOpen = true"
        >
          <span class="flex-none font-semibold">System prompt</span>
          <span class="truncate">{{ systemPrompt }}</span>
        </button>

        <div
          v-if="!visible.length"
          class="flex flex-col items-center justify-center py-[18vh] text-center"
        >
          <OllamaAvatar
            :size="56"
            class="mb-4"
          />
          <p class="text-text text-[20px] font-semibold">
            How can I help?
          </p>
          <p class="text-text-muted mt-1 text-[13px]">
            {{ chats.activeModel.value ? `Chatting with ${chats.activeModel.value}` : 'Pick a model below to start' }}
          </p>
        </div>

        <MessageItem
          v-for="(node, i) in visible"
          :key="node.id"
          :node="node"
          :index="chats.activeIndex.value"
          :is-last="i === visible.length - 1"
        />
      </div>
    </div>

    <button
      v-if="!pinned"
      type="button"
      class="border-border-strong bg-panel text-text-secondary hover:bg-hover absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] shadow-lg"
      data-testid="scroll-to-bottom"
      @click="scrollToBottom(true)"
    >
      <IconArrowDown :size="14" />
      Scroll to bottom
    </button>
  </div>
</template>
