<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { IconX } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{ open: boolean; title?: string; width?: string }>(),
  {
    title: undefined,
    width: '540px',
  },
)
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()

// Native <dialog>: top layer, focus trap and Esc handling come for free.
function sync() {
  const el = dialog.value
  if (!el) return
  if (props.open && !el.open) el.showModal()
  else if (!props.open && el.open) el.close()
}
watch(
  () => props.open,
  () => nextTick(sync),
)
onMounted(sync)

// The native close event also fires after a programmatic close (prop went false). Only report
// closes the user started; otherwise opening dialog B from dialog A would close B immediately.
function onNativeClose() {
  if (props.open) emit('close')
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="bg-panel text-text border-border-strong m-auto max-h-[85vh] w-[calc(100vw-2rem)] overflow-hidden rounded-xl border p-0 shadow-2xl backdrop:bg-black/50"
    :style="{ maxWidth: width }"
    :aria-label="title"
    @close="onNativeClose"
    @cancel.prevent="emit('close')"
    @click="onBackdrop"
  >
    <div v-if="open" class="flex max-h-[85vh] flex-col">
      <header
        v-if="title || $slots.header"
        class="border-border flex flex-none items-center gap-2 border-b px-4 py-2.5"
      >
        <slot name="header">
          <h2 class="text-[14px] font-semibold">
            {{ title }}
          </h2>
        </slot>
        <button
          type="button"
          class="hover:bg-hover text-text-secondary ml-auto rounded-md p-1.5"
          aria-label="Close"
          @click="emit('close')"
        >
          <IconX :size="16" />
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <slot />
      </div>
      <footer
        v-if="$slots.footer"
        class="border-border flex flex-none items-center justify-end gap-2 border-t px-4 py-2.5"
      >
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>
