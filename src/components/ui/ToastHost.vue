<script setup lang="ts">
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-vue'
import { useToasts } from '../../composables/useToasts'

const { toasts, dismiss } = useToasts()
const icons = { info: IconInfoCircle, success: IconCheck, error: IconAlertTriangle }
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-150"
      leave-active-class="transition duration-150"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="bg-panel border-border-strong pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] shadow-lg"
        data-testid="toast"
      >
        <component
          :is="icons[t.kind]"
          :size="16"
          class="mt-px flex-none"
          :class="{
            'text-red': t.kind === 'error',
            'text-green': t.kind === 'success',
            'text-accent': t.kind === 'info',
          }"
        />
        <span class="min-w-0 flex-1 break-words">{{ t.message }}</span>
        <button
          type="button"
          class="text-text-muted hover:text-text flex-none"
          aria-label="Dismiss"
          @click="dismiss(t.id)"
        >
          <IconX :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
