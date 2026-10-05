<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label: string; description?: string }>()
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between gap-4 py-1.5">
    <span class="min-w-0">
      <span class="text-text block text-[12.5px]">{{ label }}</span>
      <span
        v-if="description"
        class="text-text-muted block text-[11.5px]"
      >{{ description }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="label"
      class="relative inline-flex h-5 w-9 flex-none rounded-full border transition-colors"
      :class="model ? 'bg-accent border-accent' : 'bg-hover border-border-strong'"
      @click="model = !model"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none mt-px inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        :class="model ? 'translate-x-4' : 'translate-x-0.5'"
      />
    </button>
  </label>
</template>
