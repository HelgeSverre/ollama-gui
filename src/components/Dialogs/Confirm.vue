<script setup lang="ts">
import { useVModel } from '@vueuse/core';

type Emits = {
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'update:modelValue', value: boolean): void
}

type Props = {
    modelValue: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
}

const emit = defineEmits<Emits>()

const props = withDefaults(defineProps<Props>(), {
    confirmText: 'Confirm',
    cancelText: 'Cancel',
})

const show = useVModel(props, 'modelValue', emit)
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-800/50">
    <div
      class="p-6 text-left transition-all duration-300 ease-in-out transform rounded-lg shadow-lg bg-zinc-50 dark:bg-zinc-700"
    >
      <div class="mb-4 text-lg font-medium leading-none text-gray-700 dark:text-zinc-300">{{ title }}</div>
      <p class="mb-6 text-gray-500 dark:text-zinc-300">
         {{ message }}
      </p>

      <div class="flex items-center justify-between">
        <button
          class="flex px-3 py-2 text-sm font-medium text-left text-white transition-colors duration-200 bg-red-500 rounded-lg gap-x-2 hover:bg-red-600 focus:outline-none focus:ring focus:ring-red-300"
          data-dismiss="modal"
          @click="$emit('cancel')"
        >
           {{ cancelText }}
        </button>
        <button
          class="flex px-3 py-2 text-sm font-medium text-left text-white transition-colors duration-200 bg-green-500 rounded-lg gap-x-2 hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-300"
          data-dismiss="modal"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
