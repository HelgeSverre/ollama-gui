<script setup lang="ts">
import { ref, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useAI } from '../services/useAI.ts'
import { getOllama } from '../services/api.ts'
import { isModelManagerOpen, toggleModelManager } from '../services/appConfig.ts'
import {
  IconDownload,
  IconTrash,
  IconX,
  IconInfoCircle,
  IconLoader,
} from '@tabler/icons-vue'

const { availableModels, refreshModels } = useAI()

const pullModelName = ref('')
const isPulling = ref(false)
const pullProgress = ref('')
const selectedModel = ref<string | null>(null)
const modelInfo = ref<{
  license?: string
  parameters?: string
  template?: string
  modelfile?: string
} | null>(null)
const isLoadingInfo = ref(false)
const panelRef = ref<HTMLElement>()
const deletingModel = ref<string | null>(null)

watch(isModelManagerOpen, (open) => {})

onClickOutside(panelRef, () => close())

onKeyStroke('Escape', () => {
  if (isModelManagerOpen.value) close()
})

function close() {
  isModelManagerOpen.value = false
  selectedModel.value = null
  modelInfo.value = null
}

function open() {
  isModelManagerOpen.value = true
  refreshModels()
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1000 && unitIndex < units.length - 1) {
    size /= 1000
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function handlePull() {
  if (!pullModelName.value.trim()) return
  isPulling.value = true
  pullProgress.value = 'Pulling…'
  try {
    await getOllama().pull({ model: pullModelName.value.trim(), stream: false })
    pullProgress.value = 'Done!'
    pullModelName.value = ''
    await refreshModels()
  } catch (e: any) {
    pullProgress.value = 'Failed: ' + e.message
  }
  isPulling.value = false
}

async function handleDelete(name: string) {
  if (deletingModel.value === name) {
    await getOllama().delete({ model: name })
    if (selectedModel.value === name) {
      selectedModel.value = null
      modelInfo.value = null
    }
    deletingModel.value = null
    await refreshModels()
  } else {
    deletingModel.value = name
  }
}

function cancelDelete() {
  deletingModel.value = null
}

async function showInfo(name: string) {
  if (selectedModel.value === name) {
    selectedModel.value = null
    modelInfo.value = null
    return
  }
  selectedModel.value = name
  isLoadingInfo.value = true
  modelInfo.value = null
  try {
    modelInfo.value = await getOllama().show({ model: name })
  } catch {
    modelInfo.value = null
  }
  isLoadingInfo.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isModelManagerOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
    >
      <div class="absolute inset-0 bg-black/55" @click="close"></div>

      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-manager-title"
        class="border-border-strong bg-panel relative max-h-[80vh] w-[520px] overflow-hidden rounded-[10px] border shadow-2xl"
      >
        <div class="border-border flex items-center justify-between border-b px-4 py-2.5">
          <h2 id="model-manager-title" class="text-text text-[13px] font-semibold">
            Model Manager
          </h2>
          <button @click="close" class="hover:bg-hover rounded-[4px] p-1.5">
            <IconX :size="16" class="text-text-secondary" />
          </button>
        </div>

        <div class="space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Pull Model
            </div>
            <div class="flex gap-2">
              <input
                v-model="pullModelName"
                placeholder="e.g. llama3:8b"
                :disabled="isPulling"
                class="border-border bg-list text-text placeholder:text-text-muted focus:border-accent flex-1 rounded-[5px] border px-2.5 py-1.5 text-[12px] outline-none disabled:opacity-50"
                @keydown.enter="handlePull"
              />
              <button
                @click="handlePull"
                :disabled="isPulling || !pullModelName.trim()"
                class="bg-accent flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                <IconLoader v-if="isPulling" :size="14" class="animate-spin" />
                <IconDownload v-else :size="14" />
                Pull
              </button>
            </div>
            <p
              v-if="pullProgress"
              class="mt-1.5 text-[11px]"
              :class="
                pullProgress.startsWith('Failed') || pullProgress.startsWith('Error')
                  ? 'text-red'
                  : 'text-text-secondary'
              "
            >
              {{ pullProgress }}
            </p>
          </div>

          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Installed Models
            </div>
            <div
              v-if="availableModels.length === 0"
              class="text-text-muted py-6 text-center text-[12px]"
            >
              No models installed. Pull a model above to get started.
            </div>
            <div v-else class="space-y-0.5">
              <div
                v-for="model in availableModels"
                :key="model.name"
                class="rounded-[5px] border"
                :class="
                  selectedModel === model.name
                    ? 'border-accent bg-sel'
                    : 'hover:bg-hover border-transparent'
                "
              >
                <div class="flex items-center gap-3 px-3 py-2">
                  <button
                    @click="showInfo(model.name)"
                    class="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <IconInfoCircle
                      :size="15"
                      :class="
                        selectedModel === model.name ? 'text-accent' : 'text-text-muted'
                      "
                      class="shrink-0"
                    />
                    <div class="min-w-0 text-left">
                      <div class="text-text truncate text-[12px] font-medium">
                        {{ model.name }}
                      </div>
                      <div class="text-text-muted text-[10.5px]">
                        {{ formatSize(model.size) }} &middot;
                        {{ formatDate(model.modified_at) }}
                      </div>
                    </div>
                  </button>
                  <template v-if="deletingModel === model.name">
                    <div class="flex items-center gap-1.5">
                      <button
                        @click="handleDelete(model.name)"
                        class="text-red text-[10px] font-bold hover:underline"
                      >
                        Delete
                      </button>
                      <button
                        @click="cancelDelete"
                        class="text-text-muted hover:text-text text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </template>
                  <button
                    v-else
                    @click="handleDelete(model.name)"
                    class="text-text-muted hover:bg-hover hover:text-red shrink-0 rounded-[4px] p-1.5"
                    title="Delete model"
                  >
                    <IconTrash :size="14" />
                  </button>
                </div>
                <div
                  v-if="selectedModel === model.name"
                  class="border-border border-t px-3 py-2.5"
                >
                  <div
                    v-if="isLoadingInfo"
                    class="text-text-muted flex items-center gap-2 text-[11px]"
                  >
                    <IconLoader :size="12" class="animate-spin" />
                    Loading model info…
                  </div>
                  <div v-else-if="modelInfo" class="space-y-2 text-[11px]">
                    <template v-if="modelInfo.license">
                      <div>
                        <div class="text-text-secondary font-semibold">License</div>
                        <div class="text-text">{{ modelInfo.license }}</div>
                      </div>
                    </template>
                    <template v-if="modelInfo.parameters">
                      <div>
                        <div class="text-text-secondary font-semibold">Parameters</div>
                        <div class="text-text whitespace-pre-wrap">
                          {{ modelInfo.parameters }}
                        </div>
                      </div>
                    </template>
                    <template v-if="modelInfo.template">
                      <div>
                        <div class="text-text-secondary font-semibold">Template</div>
                        <pre
                          class="border-border bg-page text-text mt-1 overflow-x-auto rounded-[5px] border p-2 text-[10px]"
                          >{{ modelInfo.template }}</pre>
                      </div>
                    </template>
                    <template v-if="modelInfo.modelfile">
                      <div>
                        <div class="text-text-secondary font-semibold">Modelfile</div>
                        <pre
                          class="border-border bg-page text-text mt-1 overflow-x-auto rounded-[5px] border p-2 text-[10px]"
                          >{{ modelInfo.modelfile }}</pre>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
