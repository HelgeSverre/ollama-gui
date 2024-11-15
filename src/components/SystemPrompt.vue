<script setup lang="ts">
import { currentModel, useConfig } from '../services/appConfig'
import { useTextareaAutosize } from '@vueuse/core'
import { onMounted, ref } from 'vue'
import ModelSelector from './ModelSelector.vue'

const { setConfig, initializeConfig } = useConfig()
const { textarea } = useTextareaAutosize()
const configInput = ref('')
const defaultConfigInput = ref('')
import { IconWritingSign } from '@tabler/icons-vue'

onMounted(() => {
  initialize()
})

const initialize = () => {
  initializeConfig(currentModel.value).then(function (configs) {
    configInput.value = configs?.modelConfig?.systemPrompt ?? ''
    defaultConfigInput.value = configs?.defaultConfig?.systemPrompt ?? ''
  })
}

const onSubmit = () => {
  const model = currentModel.value
  setConfig({
    model: 'default',
    systemPrompt: defaultConfigInput.value.trim(),
    createdAt: new Date(),
  })
  if (model) {
    setConfig({
      model: model,
      systemPrompt: configInput.value.trim(),
      createdAt: new Date(),
    })
  }
  alert('Saved !')
}

const shouldSubmit = ({ key, shiftKey }: KeyboardEvent): boolean => {
  return key === 'Enter' && !shiftKey
}

const onKeydown = (event: KeyboardEvent) => {
  if (shouldSubmit(event)) {
    event.preventDefault()
    onSubmit()
  }
}
</script>

<template>
  <aside class="flex flex-col gap-6">
    <div
      class="flex w-full flex-row items-center justify-center gap-4 rounded-b-xl bg-gray-100 px-4 py-2 dark:bg-gray-800"
    >
      <div class="mr-auto flex h-full items-center">
        <div>
          <span
            class="block h-full rounded border-none p-2 text-lg font-medium text-gray-900 decoration-gray-400 decoration-dashed outline-none hover:underline focus:ring-2 focus:ring-blue-600 dark:text-gray-100 dark:focus:ring-blue-600"
          >
            System Prompts
          </span>
        </div>
      </div>
      <ModelSelector :disabled="false" @change="initialize" />
    </div>

    <div class="flex flex-col space-y-6 px-4">
      <!-- Custom Instructions Section -->
      <div class="rounded-xl bg-gray-100 p-6 shadow-sm dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Custom Instructions
        </h2>
        <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
          What would you like the current model to know about you to provide better
          responses?
        </p>
        <form @submit.prevent="onSubmit">
          <textarea
            ref="textarea"
            v-model="configInput"
            class="block min-h-[150px] w-full resize-none rounded-lg border-none bg-white p-4 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500 sm:text-base"
            @keydown="onKeydown"
          ></textarea>
        </form>
      </div>

      <!-- Default Instructions Section -->
      <div class="rounded-xl bg-gray-100 p-6 shadow-sm dark:bg-gray-800">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Default Instructions
        </h2>
        <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
          What would you like all models to know about you to provide better responses?
          This prompt will be applied for all models by default even if you configure
          custom prompt for a model.
        </p>
        <form @submit.prevent="onSubmit">
          <textarea
            ref="textarea"
            v-model="defaultConfigInput"
            class="block min-h-[150px] w-full resize-none rounded-lg border-none bg-white p-4 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500 sm:text-base"
          ></textarea>
        </form>
      </div>

      <div>
        <button
          type="button"
          @click="onSubmit"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-offset-gray-900"
        >
          <IconWritingSign class="h-5 w-5" />
          Save Changes
        </button>
      </div>
    </div>
  </aside>
</template>
