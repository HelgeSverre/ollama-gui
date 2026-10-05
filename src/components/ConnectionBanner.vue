<script setup lang="ts">
import { IconPlugConnectedX } from '@tabler/icons-vue'
import { useModels } from '../composables/useModels'
import { openModal } from '../composables/useUi'
import CorsHelp from './settings/CorsHelp.vue'

const models = useModels()
</script>

<template>
  <div
    v-if="models.connection.value === 'error'"
    class="border-red/30 bg-red/5 mx-auto mt-3 w-[calc(100%-2rem)] max-w-[46rem] rounded-xl border p-3"
    role="alert"
    data-testid="connection-banner"
  >
    <div class="flex items-start gap-2.5">
      <IconPlugConnectedX
        :size="18"
        class="text-red mt-0.5 flex-none"
      />
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-text text-[13px] font-semibold">
          {{ models.connectionError.value }}
        </p>
        <CorsHelp />
      </div>
      <div class="flex flex-none gap-1">
        <button
          type="button"
          class="border-border hover:bg-hover rounded-md border px-2.5 py-1 text-[12px]"
          @click="models.refresh()"
        >
          Retry
        </button>
        <button
          type="button"
          class="text-text-secondary hover:bg-hover rounded-md px-2.5 py-1 text-[12px]"
          @click="openModal('settings')"
        >
          Settings
        </button>
      </div>
    </div>
  </div>
</template>
