<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import Settings from './components/Settings.vue'
import { isDarkMode, isSettingsOpen } from './services/appConfig.ts'
import { onMounted, ref } from 'vue'
import { useAI } from './services/useAI.ts'
import { useChats } from './services/chat.ts'
import { useImageDropzone } from './services/useImageDropzone.ts'

const { refreshModels, availableModels } = useAI()
const { activeChat, switchModel, initialize } = useChats()

onMounted(() => {
  refreshModels().then(async () => {
    if (!activeChat.value?.model) {
      await initialize()
      await switchModel(availableModels.value[0].name)
    }
  })
})
const dropZoneRef = ref<HTMLDivElement>()
const { dropZoneIsActive } = useImageDropzone(dropZoneRef)
</script>

<template>
  <div :class="{ dark: isDarkMode }">
    <main
      class="flex h-full w-full flex-1 flex-row items-stretch bg-zinc-50 dark:bg-zinc-800"
    >
      <Sidebar />

      <div class="mx-auto h-[100dvh] w-full relative">
        <div
          class="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col gap-4 px-4 pb-4 border-4"
          :class="{
            'border-opacity-90 rounded border-dashed border-blue-800': dropZoneIsActive,
            'border-transparent': !dropZoneIsActive
          }"
          ref="dropZoneRef"
          >
          <ChatMessages />
          <ChatInput />
        </div>
      </div>

      <transition name="slide">
        <Settings v-if="isSettingsOpen" />
      </transition>
    </main>
  </div>
</template>
