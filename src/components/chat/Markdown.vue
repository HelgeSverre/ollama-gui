<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { mathVersion, renderMarkdown } from '../../markdown'

const props = defineProps<{ source: string; streaming?: boolean }>()

const html = ref('')
let frame = 0

function render() {
  frame = 0
  html.value = renderMarkdown(props.source)
}

// While streaming, re-render at most once per animation frame instead of per token.
watch(
  () => [props.source, mathVersion.value] as const,
  () => {
    if (!props.streaming) return render()
    if (!frame) frame = requestAnimationFrame(render)
  },
  { immediate: true },
)

onBeforeUnmount(() => cancelAnimationFrame(frame))

async function onClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]')
  if (!button) return
  const code = button.closest('.code-block')?.querySelector('code')?.textContent ?? ''
  await navigator.clipboard.writeText(code)
  button.textContent = 'Copied'
  setTimeout(() => (button.textContent = 'Copy'), 1500)
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown-it runs with html: false, so input HTML is escaped -->
  <div
    class="message-content"
    @click="onClick"
    v-html="html"
  />
</template>
