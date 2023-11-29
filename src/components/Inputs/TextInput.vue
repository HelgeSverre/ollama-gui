<script setup lang="ts">
type Props = {
  label?: string
  type?: string
  autofocus?: boolean
  placeholder?: string
  modelValue: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  autofocus: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'blur'): void
}>()
</script>

<template>
  <div>
    <label class="mb-2 mt-4 block px-2 text-sm font-medium" v-if="label">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
      :type="type"
      :autofocus="autofocus"
      class="block w-full rounded-lg bg-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
      :placeholder="placeholder"
    />
  </div>
</template>
