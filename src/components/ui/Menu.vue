<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { nextTick, ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(
  defineProps<{ align?: 'left' | 'right'; placement?: 'below' | 'above' }>(),
  {
    align: 'right',
    placement: 'below',
  },
)
const root = ref<HTMLElement>()
const panel = ref<HTMLElement>()

onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => {
  if (open.value) open.value = false
})

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  panel.value?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
})

function onKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
  event.preventDefault()
  const items = [
    ...(panel.value?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []),
  ]
  const i = items.indexOf(document.activeElement as HTMLElement)
  const next =
    items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]
  next?.focus()
}
</script>

<template>
  <div ref="root" class="relative">
    <slot name="trigger" :toggle="() => (open = !open)" :open="open" />
    <div
      v-if="open"
      ref="panel"
      role="menu"
      class="bg-panel border-border-strong absolute z-50 min-w-[180px] rounded-lg border p-1 shadow-xl"
      :class="[
        props.align === 'right' ? 'right-0' : 'left-0',
        props.placement === 'below' ? 'top-full mt-1' : 'bottom-full mb-1',
      ]"
      @keydown="onKeydown"
      @click="open = false"
    >
      <slot />
    </div>
  </div>
</template>
