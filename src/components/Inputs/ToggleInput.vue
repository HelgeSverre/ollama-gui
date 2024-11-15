<script setup lang="ts">
import { ref, watchEffect, withDefaults } from 'vue'

type Props = {
  label?: string
  modelValue: boolean
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toggleState = ref(props.modelValue)

const toggle = () => {
  toggleState.value = !toggleState.value
  emit('update:modelValue', toggleState.value)
}

watchEffect(() => {
  toggleState.value = props.modelValue
})
</script>

<template>
  <div>
    <label
      class="mb-2 mt-4 block px-2 text-sm font-medium text-gray-900 dark:text-gray-100"
      v-if="label"
    >
      {{ label }}
    </label>
    <button
      :class="toggleState ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
      class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
      @click="toggle"
      role="switch"
      :aria-checked="toggleState"
    >
      <span
        :class="toggleState ? 'translate-x-5' : 'translate-x-0'"
        aria-hidden="true"
        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      ></span>
    </button>
  </div>
</template>
