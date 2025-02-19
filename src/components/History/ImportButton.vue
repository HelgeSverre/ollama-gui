<script setup lang="ts">
import { useChats } from '../../services/chat.ts'

const { importChats } = useChats()

const uploadChats = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = function(e) {
    if (!e.target?.result) return
    try {
      const jsonData = JSON.parse(e.target.result as string)
      importChats(jsonData)
    } catch (error) {
      console.error('Failed to parse JSON:', error)
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <label class="cursor-pointer">
    <slot />
    <input class="sr-only" type="file" @change="uploadChats">
  </label>
</template>
