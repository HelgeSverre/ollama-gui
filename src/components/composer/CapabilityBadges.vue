<script setup lang="ts">
import { IconBrain, IconEye, IconTool } from '@tabler/icons-vue'
import type { Capability } from '../../ollama/models'

defineProps<{ capabilities?: Capability[] }>()
const badges = [
  { key: 'vision', icon: IconEye, label: 'Vision' },
  { key: 'thinking', icon: IconBrain, label: 'Thinking' },
  { key: 'tools', icon: IconTool, label: 'Tools' },
] as const
</script>

<template>
  <span class="flex items-center gap-1">
    <template
      v-for="b in badges"
      :key="b.key"
    >
      <span
        v-if="capabilities?.includes(b.key)"
        class="text-text-muted bg-hover inline-flex items-center rounded px-1 py-px"
        :title="b.label"
        :aria-label="b.label"
      >
        <component
          :is="b.icon"
          :size="12"
        />
      </span>
    </template>
  </span>
</template>
