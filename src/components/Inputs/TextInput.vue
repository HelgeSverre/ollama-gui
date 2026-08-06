<script setup lang="ts">
type Props = {
  id?: string
  label?: string
  type?: string
  placeholder?: string
  modelValue: string
  small?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'blur'): void
}>()
</script>

<template>
  <div>
    <label
      :for="id"
      class="text-text mt-3 mb-1.5 block px-2 text-[11px] font-medium"
      v-if="label"
    >
      {{ label }}
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
      :id="id"
      :type="type"
      :class="small ? 'text-[10px]' : 'text-[11px]'"
      class="border-border bg-list text-text focus:border-accent block w-full rounded-[5px] border p-2 outline-none"
      :placeholder="placeholder"
    />
  </div>
</template>
