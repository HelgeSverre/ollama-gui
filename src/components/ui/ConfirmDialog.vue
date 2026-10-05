<script setup lang="ts">
import Modal from './Modal.vue'
import { pendingConfirm } from '../../composables/useConfirm'
</script>

<template>
  <Modal
    :open="!!pendingConfirm"
    :title="pendingConfirm?.title"
    width="420px"
    @close="pendingConfirm?.resolve(false)"
  >
    <p
      v-if="pendingConfirm?.message"
      class="text-text-secondary px-4 py-3 text-[13px] leading-relaxed"
    >
      {{ pendingConfirm.message }}
    </p>
    <template #footer>
      <button
        type="button"
        class="hover:bg-hover text-text-secondary rounded-md px-3 py-1.5 text-[12.5px]"
        @click="pendingConfirm?.resolve(false)"
      >
        Cancel
      </button>
      <button
        type="button"
        autofocus
        class="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
        :class="pendingConfirm?.danger ? 'bg-red' : 'bg-accent'"
        data-testid="confirm-btn"
        @click="pendingConfirm?.resolve(true)"
      >
        {{ pendingConfirm?.confirmLabel ?? 'Confirm' }}
      </button>
    </template>
  </Modal>
</template>
