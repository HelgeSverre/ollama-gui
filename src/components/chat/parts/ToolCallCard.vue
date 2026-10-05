<script setup lang="ts">
import { IconChevronRight, IconTool } from '@tabler/icons-vue'
import { computed, ref } from 'vue'
import type { ToolCallPart } from '../../../domain/types'

const props = defineProps<{ part: ToolCallPart }>()
const open = ref(false)
const args = computed(() => JSON.stringify(props.part.args ?? {}, null, 2))
const result = computed(() =>
  props.part.result === undefined ? null : JSON.stringify(props.part.result, null, 2),
)
const stateClass = {
  running: 'text-orange',
  done: 'text-green',
  error: 'text-red',
}
</script>

<template>
  <div class="border-border bg-list my-2 rounded-lg border text-[12.5px]">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <IconTool
        :size="14"
        class="text-text-muted"
      />
      <span class="font-mono">{{ part.name }}</span>
      <span
        class="ml-auto text-[11px]"
        :class="stateClass[part.state]"
      >{{ part.state }}</span>
      <IconChevronRight
        :size="13"
        class="text-text-muted transition-transform"
        :class="{ 'rotate-90': open }"
      />
    </button>
    <div
      v-if="open"
      class="border-border space-y-2 border-t px-3 py-2"
    >
      <pre class="font-mono text-[11.5px] whitespace-pre-wrap">{{ args }}</pre>
      <pre
        v-if="result"
        class="border-border font-mono text-[11.5px] whitespace-pre-wrap border-t pt-2"
      >{{ result }}</pre>
    </div>
  </div>
</template>
