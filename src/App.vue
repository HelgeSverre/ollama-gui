<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import ChatInput from './components/ChatInput.vue'
import ChatMessages from './components/ChatMessages.vue'
import SystemPrompt from './components/SystemPrompt.vue'
import ModelSelector from './components/ModelSelector.vue'
import { currentModel, isSystemPromptOpen } from './services/appConfig.ts'
import { nextTick, onMounted, ref } from 'vue'
import { useAI } from './services/useAI.ts'
import { useChats } from './services/chat.ts'
import Settings from './components/Settings.vue'
import CommandPalette from './components/CommandPalette.vue'
import ModelManager from './components/ModelManager.vue'

const { refreshModels, availableModels } = useAI()
const { activeChat, renameChat, switchModel, initialize } = useChats()
const isEditingChatName = ref(false)
const editedChatName = ref('')
const chatNameInput = ref()

const startEditing = () => {
  isEditingChatName.value = true
  editedChatName.value = activeChat.value?.name || ''
  nextTick(() => chatNameInput.value?.focus())
}

const cancelEditing = () => {
  isEditingChatName.value = false
  editedChatName.value = ''
}

const confirmRename = () => {
  if (activeChat.value && editedChatName.value.trim()) {
    renameChat(editedChatName.value.trim())
    isEditingChatName.value = false
  }
}

onMounted(() => {
  refreshModels().then(async () => {
    await initialize()
    await switchModel(currentModel.value ?? availableModels.value[0]?.name ?? 'none')
  })
})
</script>

<template>
  <main class="bg-page flex h-screen w-full flex-row">
    <Sidebar />

    <div class="bg-list flex min-w-0 flex-1 flex-col">
      <div
        class="border-border bg-panel flex h-[38px] flex-none items-center gap-3 border-b px-3"
      >
        <div
          v-if="activeChat"
          class="mr-auto flex min-w-0 items-center gap-2"
        >
          <div
            v-if="isEditingChatName"
            class="flex items-center gap-1.5"
          >
            <input
              ref="chatNameInput"
              v-model="editedChatName"
              class="border-border bg-list text-text focus:border-accent w-[180px] rounded-[4px] border px-2 py-0.5 text-[12px] outline-none"
              @keyup.enter="confirmRename"
              @keyup.esc="cancelEditing"
              @blur="cancelEditing"
            >
          </div>
          <button
            v-else
            class="text-text hover:border-border truncate rounded-[3px] border border-transparent px-1.5 py-0.5 text-[12.5px] font-semibold"
            @click="startEditing"
          >
            {{ activeChat.name }}
          </button>
          <span class="text-text-muted font-mono text-[10px]">
            {{ activeChat.model }}
          </span>
        </div>
        <div
          v-else
          class="text-text-muted mr-auto text-[12px]"
        >
          No chat selected
        </div>
        <ModelSelector />
      </div>

      <div
        v-if="isSystemPromptOpen"
        class="flex min-h-0 flex-1 flex-col"
      >
        <SystemPrompt />
      </div>

      <template v-else>
        <ChatMessages />
        <ChatInput />
      </template>
    </div>

    <Settings />
    <CommandPalette />
    <ModelManager />
  </main>
</template>
