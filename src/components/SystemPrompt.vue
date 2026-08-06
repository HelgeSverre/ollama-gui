<script setup lang="ts">
import { currentModel, useConfig } from '../services/appConfig'
import { useTextareaAutosize } from '@vueuse/core'
import { onMounted, ref, watch } from 'vue'
import ModelSelector from './ModelSelector.vue'
import { IconWritingSign } from '@tabler/icons-vue'

const { setConfig, initializeConfig } = useConfig()
const configInput = ref('')
const defaultConfigInput = ref('')
const saved = ref(false)

onMounted(() => initialize())
watch(currentModel, () => initialize())

const initialize = () => {
  initializeConfig(currentModel.value).then((configs) => {
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
    setConfig({ model, systemPrompt: configInput.value.trim(), createdAt: new Date() })
  }
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

const shouldSubmit = ({ key, shiftKey }: KeyboardEvent) => key === 'Enter' && !shiftKey

const onKeydown = (event: KeyboardEvent) => {
  if (shouldSubmit(event)) {
    event.preventDefault()
    onSubmit()
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      class="border-border bg-panel flex h-[38px] flex-none items-center gap-3 border-b px-3"
    >
      <div class="text-text mr-auto text-[13px] font-semibold">System Prompts</div>
      <ModelSelector />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-[48rem] space-y-4 p-4">
        <div class="border-border bg-panel rounded-[5px] border p-4">
          <h2 class="text-text mb-2 text-[13px] font-semibold">Custom Instructions</h2>
          <p class="text-text-secondary mb-3 text-[11px]">
            What would you like the current model to know to provide better responses?
          </p>
          <textarea
            v-model="configInput"
            class="border-border bg-list text-text focus:border-accent block min-h-[120px] w-full resize-none rounded-[5px] border p-3 text-[12px] outline-none"
            @keydown="onKeydown"
          ></textarea>
        </div>

        <div class="border-border bg-panel rounded-[5px] border p-4">
          <h2 class="text-text mb-2 text-[13px] font-semibold">Default Instructions</h2>
          <p class="text-text-secondary mb-3 text-[11px]">
            Applied to all models by default, even when a model has custom instructions.
          </p>
          <textarea
            v-model="defaultConfigInput"
            class="border-border bg-list text-text focus:border-accent block min-h-[120px] w-full resize-none rounded-[5px] border p-3 text-[12px] outline-none"
          ></textarea>
        </div>

        <button
          type="button"
          @click="onSubmit"
          class="bg-accent inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
        >
          <IconWritingSign :size="16" />
          Save Changes
        </button>
        <span v-if="saved" role="status" class="text-green text-[11px]">Saved</span>
      </div>
    </div>
  </div>
</template>
