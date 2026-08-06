<script setup lang="ts">
import { ref, watchEffect } from 'vue'

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
  <div class="mb-2 flex items-center justify-between">
    <label
      v-if="label"
      class="text-text block cursor-pointer px-2 text-[11px] font-medium"
      @click="toggle"
    >
      {{ label }}
    </label>
    <button
      :class="toggleState ? 'bg-accent border-accent' : 'bg-hover border-border'"
      class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border transition-none focus:outline-none"
      role="switch"
      :aria-checked="toggleState"
      @click="toggle"
    >
      <span
        :class="toggleState ? 'translate-x-4' : 'translate-x-0'"
        aria-hidden="true"
        class="pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white transition-none"
      />
    </button>
  </div>
</template>
