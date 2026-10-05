<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; label: string; disabled?: boolean }>()
</script>

<template>
  <button
    type="button"
    class="text-text-muted hover:bg-hover hover:text-text rounded-md p-1.5 disabled:opacity-30"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
  >
    <component :is="icon" :size="15" />
  </button>
</template>
