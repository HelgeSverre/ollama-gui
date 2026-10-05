<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon?: Component; danger?: boolean; disabled?: boolean }>()
</script>

<template>
  <button
    type="button"
    role="menuitem"
    :disabled="disabled"
    class="hover:bg-hover focus:bg-hover flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] outline-none disabled:opacity-40"
    :class="danger ? 'text-red' : 'text-text'"
  >
    <component
      :is="icon"
      v-if="icon"
      :size="15"
      class="flex-none"
      :class="danger ? '' : 'text-text-muted'"
    />
    <slot />
  </button>
</template>
