<script setup lang="ts">
// The logo is a black outline with an opaque white fill, so it can't simply be inverted for
// dark mode. A white badge keeps it legible on any background.
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <span
    class="ring-border inline-flex flex-none items-center justify-center rounded-full bg-white ring-1"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      src="/logo.png"
      alt=""
      class="w-auto"
      :style="{ height: `${Math.round(size * 0.62)}px` }"
    >
  </span>
</template>
