<script setup lang="ts">
import { useAppState } from '../services/store.ts'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'

const { currentChat, availableModels, currentModel } = storeToRefs(useAppState())
const { changeCurrentModel, fetchAvailableModels } = useAppState()

const currentChatHasMessages = computed(() => currentChat.value?.messages?.length > 0)

watch(currentModel, (newModel) => {
  if (newModel && currentChat.value && currentChat.value.messages.length === 0) {
    changeCurrentModel(newModel)
  }
})
</script>
<template>
  <div class="mx-auto max-w-md w-full">
    <div class="px-2 py-4 text-zinc-800 dark:text-zinc-200">
      <div class="h-10 inline-flex gap-2 items-center">
        <select
          :disabled="currentChatHasMessages"
          v-model="currentModel"
          class="w-full cursor-pointer rounded-lg border-r-8 border-transparent bg-zinc-200 py-2 h-full pl-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-700 disabled:opacity-50"
        >
          <option :value="undefined" disabled selected>Select a model</option>
          <option v-for="model in availableModels" :value="model.name">
            {{ model.name }}
          </option>
        </select>

        <button
          :disabled="currentChatHasMessages"
          title="Refresh available models"
          @click="fetchAvailableModels"
          class="p-3 inline-flex items-center justify-center h-full rounded-lg bg-zinc-200 text-sm focus:outline-none border-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-700 disabled:opacity-50"
        >
          <IconRefresh class="h-5 w-5 text-zinc-500" />
        </button>
      </div>
    </div>
  </div>
</template>
