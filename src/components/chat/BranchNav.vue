<script setup lang="ts">
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-vue'

defineProps<{ index: number; count: number; disabled?: boolean }>()
const emit = defineEmits<{ step: [offset: number] }>()
</script>

<template>
  <div
    v-if="count > 1"
    class="text-text-muted flex items-center text-[11.5px] tabular-nums"
    data-testid="branch-nav"
  >
    <button
      type="button"
      class="hover:bg-hover hover:text-text rounded p-1 disabled:opacity-30"
      :disabled="disabled || index === 0"
      aria-label="Previous version"
      @click="emit('step', -1)"
    >
      <IconChevronLeft :size="14" />
    </button>
    <span>{{ index + 1 }}/{{ count }}</span>
    <button
      type="button"
      class="hover:bg-hover hover:text-text rounded p-1 disabled:opacity-30"
      :disabled="disabled || index === count - 1"
      aria-label="Next version"
      @click="emit('step', 1)"
    >
      <IconChevronRight :size="14" />
    </button>
  </div>
</template>
