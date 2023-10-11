<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import Settings from './components/Settings.vue'
import ModelSelector from './components/ModelSelector.vue'
import { isDarkMode } from './services/appConfig.ts'
import { onMounted } from 'vue'
import { useAI } from './services/useAI.ts'
import { useChats } from './services/chat.ts'

const { refreshModels, availableModels } = useAI()
const { activeChat, switchModel, initialize } = useChats()

onMounted(() => {
  refreshModels().then(async () => {
    if (!activeChat.value?.model) {
      await initialize()
      await switchModel(availableModels?.value[0]?.name)
    }
  })
})
</script>

<template>
  <div :class="{ dark: isDarkMode }">
    <main
      class="flex flex-row items-stretch flex-1 w-full h-full bg-zinc-50 dark:bg-zinc-800"
    >
      <Sidebar />

      <div class="flex h-[100vh] max-w-6xl mx-auto w-full flex-col">
        <div class="flex h-[100vh] gap-4 px-4 py-4 w-full flex-col">
          <ModelSelector />
          <ChatMessages />
          <ChatInput />
        </div>
      </div>

      <Settings />
    </main>
  </div>
</template>
