<template>
    <div class="mb-4">
  <TextInput label="Download Model" v-model="modelName" placeholder="Model Name" />
  <button
    @click="downloadModel"
    :disabled="isDownloading || !modelName"
    class="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span v-if="isDownloading">Downloading...</span>
    <span v-else>Download</span>
  </button>

  <div v-if="downloadProgress > 0" class="mt-2 h-2 w-full rounded-full bg-gray-200">
    <div
      class="h-2 rounded-full bg-blue-600 transition-all duration-300"
      :style="{ width: `${downloadProgress}%` }"
    />
  </div>
  
    <div v-if="errorMessage.length" class="mt-2 text-sm text-red-500">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextInput from './Inputs/TextInput.vue'
const modelName = ref('')
const downloadProgress = ref(0)
const isDownloading = ref(false)
const errorMessage = ref('')

async function downloadModel() {
  errorMessage.value = ''
  isDownloading.value = true
  downloadProgress.value = 0

  try {
    const response = await fetch(`http://localhost:11434/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: modelName.value }),
    })

    if (!response.ok) {
      throw new Error(`Failed to start download: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunks = decoder.decode(value).split('\n')
      for (const chunk of chunks) {
        if (!chunk) continue
        try {
          const data = JSON.parse(chunk)
          if (data.completed && data.total) {
            downloadProgress.value = Math.round((data.completed / data.total) * 100)
          }
        } catch (e) {
          console.error('Error parsing chunk:', e)
          errorMessage.value = e instanceof Error ? e.message : 'Failed to download model'
        }
      }
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to download model'
    console.log(err);
    
  } finally {
    isDownloading.value = false
    setTimeout(() => {
      downloadProgress.value = 0
    }, 2000)
  }
}
</script>

<style scoped></style>
