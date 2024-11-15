<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import SystemPrompt from './components/SystemPrompt.vue'
import ModelSelector from './components/ModelSelector.vue'
import {
  currentModel,
  isDarkMode,
  isSettingsOpen,
  isSystemPromptOpen,
} from './services/appConfig.ts'
import { onMounted, ref } from 'vue'
import { useAI } from './services/useAI.ts'
import { useChats } from './services/chat.ts'
import TextInput from './components/Inputs/TextInput.vue'
import Settings from './components/Settings.vue'

const { refreshModels, availableModels } = useAI()
const { activeChat, renameChat, switchModel, initialize, hasMessages } = useChats()
const isEditingChatName = ref(false)
const editedChatName = ref('')

const startEditing = () => {
  isEditingChatName.value = true
  editedChatName.value = activeChat.value?.name || ''
}

const cancelEditing = () => {
  isEditingChatName.value = false
  editedChatName.value = ''
}

const confirmRename = () => {
  if (activeChat.value && editedChatName.value) {
    renameChat(editedChatName.value)
    isEditingChatName.value = false
  }
}

onMounted(() => {
  refreshModels().then(async () => {
    await initialize()
    await switchModel(currentModel.value ?? availableModels.value[0].name)
  })
})
</script>

<template>
  <div :class="{ dark: isDarkMode }">
    <main
      class="flex h-full w-full flex-1 flex-row items-stretch bg-white dark:bg-gray-900"
    >
      <Sidebar />

      <div class="mx-auto flex h-screen w-full flex-col">
        <div
          v-if="isSystemPromptOpen"
          class="mx-auto flex h-screen w-full max-w-7xl flex-col gap-4 px-4 pb-4"
        >
          <SystemPrompt />
        </div>

        <div
          v-if="!isSystemPromptOpen"
          class="mx-auto flex h-screen w-full max-w-7xl flex-col gap-4 px-4 pb-4"
        >
          <div
            class="flex w-full flex-row items-center justify-center gap-4 rounded-b-xl bg-gray-100 px-4 py-2 dark:bg-gray-800"
          >
            <div class="mr-auto flex h-full items-center" v-if="activeChat">
              <div>
                <div v-if="isEditingChatName">
                  <TextInput
                    autofocus
                    v-model="editedChatName"
                    @keyup.enter="confirmRename"
                    @keyup.esc="cancelEditing"
                    @blur="cancelEditing"
                  />
                </div>

                <button
                  type="button"
                  class="block h-full rounded border-none p-2 text-gray-900 decoration-gray-400 decoration-dashed outline-none hover:underline focus:ring-2 focus:ring-blue-600 dark:text-gray-100 dark:focus:ring-blue-600"
                  v-else
                  @click.prevent="startEditing"
                >
                  {{ activeChat.name }}
                </button>
              </div>
            </div>

            <ModelSelector :disabled="hasMessages" />
          </div>

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
