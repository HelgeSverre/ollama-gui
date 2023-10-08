<script setup lang="ts">
import { useAppState } from '../services/store.ts'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'

const { currentChat, availableModels, currentModel } = storeToRefs(useAppState())
const { changeCurrentModel } = useAppState()

watch(currentModel, (newModel) => {
  if (newModel && currentChat.value && currentChat.value.messages.length === 0) {
    changeCurrentModel(newModel)
  }
})
</script>
<template>
  <div class="mx-auto max-w-md w-full">
    <select
      v-model="currentModel"
      name="select-model"
      id="select-model"
      class="block w-full cursor-pointer rounded-lg border-r-4 border-transparent bg-zinc-200 py-3 pl-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
    >
      <option :value="undefined" disabled selected>Select a model</option>
      <option v-for="model in availableModels" :value="model.name">
        {{ model.name }}
      </option>
    </select>
  </div>
</template>
