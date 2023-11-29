<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import Settings from './components/Settings.vue'
import ModelSelector from './components/ModelSelector.vue'
import { isDarkMode, isSettingsOpen } from './services/appConfig.ts'
import { onMounted, ref } from 'vue'
import { useAI } from './services/useAI.ts'
import { useChats } from './services/chat.ts'
import TextInput from './components/Inputs/TextInput.vue'

const { refreshModels, availableModels } = useAI()
const { activeChat, renameChat, switchModel, initialize } = useChats()
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
    if (!activeChat.value?.model) {
      await initialize()
      await switchModel(availableModels.value[0].name)
    }
  })
})
</script>

<template>
  <div :class="{ dark: isDarkMode }">
    <main
      class="flex h-full w-full flex-1 flex-row items-stretch bg-zinc-50 dark:bg-zinc-800"
    >
      <Sidebar />

      <div class="mx-auto flex h-[100vh] w-full flex-col">
        <div class="mx-auto flex h-[100vh] w-full max-w-7xl flex-col gap-4 px-4 pb-4">
          <div
            class="flex w-full flex-row items-center justify-center gap-4 rounded-b-xl bg-zinc-200 px-4 py-2 dark:bg-zinc-700"
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
                  class="block h-full rounded border-none p-2 text-zinc-700 decoration-gray-400 decoration-dashed outline-none hover:underline focus:ring-2 focus:ring-blue-600 dark:text-zinc-100 dark:focus:ring-blue-600"
                  v-else
                  @click.prevent="startEditing"
                >
                  {{ activeChat.name }}
                </button>
              </div>
            </div>

            <ModelSelector />
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
