<script setup lang="ts">
import { IconCheck, IconCopy } from '@tabler/icons-vue'
import { computed, ref } from 'vue'
import { copyText } from '../../composables/useClipboard'
import { useModels } from '../../composables/useModels'

const models = useModels()
const origin = location.origin
/** Cross-origin requests need Ollama to allow this page's origin. */
const crossOrigin = computed(() => {
  try {
    return new URL(models.host()).origin !== origin
  } catch {
    return true
  }
})
const command = `OLLAMA_ORIGINS=${origin} ollama serve`
const copied = ref(false)
async function copy() {
  if (!(await copyText(command))) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="text-text-secondary space-y-1.5 text-[12px] leading-relaxed">
    <p>
      {{
        crossOrigin
          ? 'Check that Ollama is running and allows requests from this page:'
          : 'Check that Ollama is running:'
      }}
    </p>
    <div
      v-if="crossOrigin"
      class="bg-list border-border flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px]"
    >
      <span class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{{ command }}</span>
      <button
        type="button"
        class="text-text-muted hover:text-text flex-none"
        :aria-label="copied ? 'Copied' : 'Copy command'"
        @click="copy"
      >
        <IconCheck v-if="copied" :size="14" />
        <IconCopy v-else :size="14" />
      </button>
    </div>
    <p v-if="crossOrigin">
      {{
        'Your browser may also ask to let this site access devices on your local network. Choose Allow, or re-enable it in the site settings next to the address bar.'
      }}
    </p>
    <p v-else>
      {{ 'Start it with "ollama serve", or check the proxy in front of this page.' }}
    </p>
  </div>
</template>
