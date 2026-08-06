<script setup lang="ts">
import { Message } from '../../services/database.ts'
type Props = { message: Message }
const { message } = defineProps<Props>()
</script>

<template>
  <div class="flex gap-3 py-1">
    <div
      class="bg-accent/15 text-accent mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[3px] text-[11px] font-bold"
    >
      S
    </div>
    <pre
      class="border-border bg-page text-text-secondary min-w-0 flex-1 rounded-[5px] border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
    >{{ message.content }}</pre>
  </div>
</template>
