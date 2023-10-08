<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import { isDarkMode, useAppState } from './services/store.ts'
import Settings from './components/Settings.vue'

import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import ModelSelector from './components/ModelSelector.vue'

const { currentChat, availableModels, currentModel } = storeToRefs(useAppState())
const { changeCurrentModel } = useAppState()

// Watch for changes to currentModel
watch(currentModel, (newModel) => {
  if (newModel && currentChat.value && currentChat.value.messages.length === 0) {
    changeCurrentModel(newModel)
  }
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
