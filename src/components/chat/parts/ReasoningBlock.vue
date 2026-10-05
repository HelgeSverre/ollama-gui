<script setup lang="ts">
import { IconBulb, IconChevronRight } from '@tabler/icons-vue'
import { computed, ref, watch } from 'vue'
import { formatDuration } from '../../../domain/format'
import type { ReasoningPart } from '../../../domain/types'

const props = defineProps<{ part: ReasoningPart; streaming: boolean }>()

const thinking = computed(() => props.streaming && props.part.durationMs === undefined)
// Open while thinking streams, collapse once the answer starts; a manual toggle sticks.
const open = ref(thinking.value)
const touched = ref(false)
watch(thinking, (value) => {
  if (!touched.value) open.value = value
})

const label = computed(() => {
  if (thinking.value) return 'Thinking…'
  const ms = props.part.durationMs
  return ms ? `Thought for ${formatDuration(ms)}` : 'Thoughts'
})

function toggle() {
  touched.value = true
  open.value = !open.value
}
</script>

<template>
  <div
    class="my-1.5"
    data-testid="reasoning"
  >
    <button
      type="button"
      class="text-text-muted hover:text-text-secondary flex items-center gap-1.5 text-[12.5px]"
      :aria-expanded="open"
      @click="toggle"
    >
      <IconBulb :size="14" />
      <span :class="{ shimmer: thinking }">{{ label }}</span>
      <IconChevronRight
        :size="13"
        class="transition-transform"
        :class="{ 'rotate-90': open }"
      />
    </button>
    <div
      v-if="open"
      class="border-border text-text-secondary mt-1.5 ml-[7px] max-h-[360px] overflow-y-auto border-l-2 pl-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap"
    >
      {{ part.text.trim() }}
    </div>
  </div>
</template>
