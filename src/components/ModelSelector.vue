<script setup lang="ts">
import { IconRefresh } from '@tabler/icons-vue'
import { useChats } from '../services/chat.ts'
import { useAI } from '../services/useAI.ts'
import { ref } from 'vue'
import { currentModel } from '../services/appConfig'

const { activeChat, switchModel, hasMessages } = useChats()
const { refreshModels, availableModels } = useAI()

const refreshingModel = ref(false)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const performRefreshModel = async () => {
  refreshingModel.value = true
  await Promise.all([refreshModels(), sleep(1000)])

  refreshModels().then(() => {
    refreshingModel.value = false
  })
}

const handleModelChange = (event: Event) => {
  const wip = event.target as HTMLSelectElement
  console.log('switch', wip.value)
  switchModel(wip.value)
}

type Props = {
  disabled: boolean
}
const { disabled } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-row text-gray-900 dark:text-gray-100">
    <div class="inline-flex items-center gap-2">
      <select
        :disabled="disabled"
        :value="activeChat?.model ?? currentModel"
        @change="handleModelChange"
        class="w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100"
      >
        <option :value="undefined" disabled selected>Select a model</option>
        <option v-for="model in availableModels" :value="model.name">
          {{ model.name }}
        </option>
      </select>

      <button
        :disabled="disabled"
        title="Refresh available models"
        @click="performRefreshModel"
        class="inline-flex items-center justify-center rounded-lg border-none bg-gray-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100"
      >
        <IconRefresh
          class="h-4 w-4 -scale-100 text-white"
          :class="{ 'animate-spin': refreshingModel }"
        />
      </button>
    </div>
  </div>
</template>
