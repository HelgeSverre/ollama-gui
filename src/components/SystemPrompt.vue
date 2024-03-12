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
  <aside>
    <div
      class="flex w-full flex-row items-center justify-center gap-4 rounded-b-xl bg-zinc-200 px-4 py-2 dark:bg-zinc-700"
    >
      <div class="mr-auto flex h-full items-center">
        <div>
          <span
            class="block h-full rounded border-none p-2 text-zinc-700 decoration-gray-400 decoration-dashed outline-none hover:underline focus:ring-2 focus:ring-blue-600 dark:text-zinc-100 dark:focus:ring-blue-600"
          >
            System prompt
          </span>
        </div>
      </div>
      <ModelSelector :disabled="false" @change="initialize" />
    </div>

    <div
      class="text-md mb-[20px] mt-[30px] gap-4 rounded-xl px-1 py-2 font-medium leading-none text-zinc-900 dark:text-zinc-200"
    >
      <p class="mb-[20px]">
        <b>Custom Instructions</b>
      </p>
      <p>
        What would you like the current model to know about you to provide better
        responses?
      </p>
    </div>
    <form class="mt-2" @submit.prevent="onSubmit">
      <div
        class="flex-row items-center justify-center gap-4 rounded-xl bg-zinc-200 px-2 py-2 dark:bg-zinc-700"
      >
        <div class="h-full items-center">
          <div>
            <textarea
              ref="textarea"
              v-model="configInput"
              class="p-t-4 p-b-4 block max-h-[200px] min-h-[150px] w-full resize-none rounded-xl border-none bg-zinc-100 px-2 py-2 pr-20 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:focus:ring-blue-500"
              @keydown="onKeydown"
            ></textarea>
          </div>
        </div>
      </div>
    </form>

    <div
      class="text-md mb-[20px] mt-[30px] gap-4 rounded-xl px-1 py-2 font-medium leading-none text-zinc-900 dark:text-zinc-200"
    >
      <p class="mb-[20px]">
        <b>Default Instructions</b>
      </p>
      <p>
        What would you like all models to know about you to provide better responses? This
        prompt will be applied for all models by default even if you configure custom
        prompt for a model
      </p>
    </div>
    <form class="mt-2" @submit.prevent="onSubmit">
      <div
        class="flex-row items-center justify-center gap-4 rounded-xl bg-zinc-200 px-2 px-2 py-2 py-2 dark:bg-zinc-700"
      >
        <div class="h-full items-center">
          <div>
            <textarea
              ref="textarea"
              v-model="defaultConfigInput"
              class="p-t-4 p-b-4 block max-h-[200px] min-h-[150px] w-full resize-none rounded-xl border-none bg-zinc-100 px-1 py-2 pr-20 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:focus:ring-blue-500"
              @keydown="onKeydown"
            ></textarea>
          </div>
        </div>
      </div>

      <button
        type="submit"
        class="right mt-[20px] flex gap-x-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
      >
        <IconWritingSign class="h-6 w-6" />
        Save
      </button>
    </form>
  </aside>
</template>
