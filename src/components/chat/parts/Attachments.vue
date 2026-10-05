<script setup lang="ts">
import { IconFileText } from '@tabler/icons-vue'
import { computed, ref } from 'vue'
import { isImage } from '../../../domain/parts'
import type { FilePart } from '../../../domain/types'

const props = defineProps<{ files: FilePart[] }>()
const images = computed(() => props.files.filter(isImage))
const docs = computed(() => props.files.filter((f) => !isImage(f)))
const preview = ref<string | null>(null)
const src = (f: FilePart) => `data:${f.mediaType};base64,${f.data}`
</script>

<template>
  <div v-if="files.length" class="flex flex-wrap justify-end gap-2">
    <button
      v-for="(img, i) in images"
      :key="`i${i}`"
      type="button"
      class="border-border overflow-hidden rounded-lg border"
      :aria-label="`Open ${img.name}`"
      @click="preview = src(img)"
    >
      <img :src="src(img)" :alt="img.name" class="h-28 max-w-[220px] object-cover" />
    </button>
    <div
      v-for="(doc, i) in docs"
      :key="`d${i}`"
      class="border-border bg-panel flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px]"
    >
      <IconFileText :size="15" class="text-text-muted" />
      {{ doc.name }}
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="preview"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6"
      @click="preview = null"
    >
      <img :src="preview" class="max-h-full max-w-full rounded-lg" alt="" />
    </div>
  </Teleport>
</template>
