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
  await refreshModels()
  await sleep(500)
  refreshingModel.value = false
}

const handleModelChange = (event: Event) => {
  const wip = event.target as HTMLSelectElement
  switchModel(wip.value)
}

type Props = {
  disabled?: boolean
}
const { disabled = false } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-row">
    <div class="inline-flex items-center gap-1.5">
      <select
        :disabled="disabled"
        :value="activeChat?.model ?? currentModel"
        aria-label="Select model"
        @change="handleModelChange"
        class="border-border bg-list text-text focus:border-accent cursor-pointer rounded-[5px] border px-2.5 py-1 text-[12px] outline-none disabled:opacity-30"
        data-testid="model-select"
      >
        <option :value="undefined" disabled selected>Select a model</option>
        <option v-for="model in availableModels" :key="model.name" :value="model.name">
          {{ model.name }}
        </option>
      </select>

      <button
        :disabled="disabled"
        title="Refresh available models"
        @click="performRefreshModel"
        class="bg-list text-text-secondary hover:bg-hover inline-flex items-center justify-center rounded-[4px] p-1.5 disabled:opacity-30"
      >
        <IconRefresh
          :size="14"
          class="-scale-100"
          :class="{ 'animate-spin': refreshingModel }"
        />
      </button>
    </div>
  </div>
</template>
