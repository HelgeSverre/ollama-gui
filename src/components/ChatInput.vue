<script setup lang="ts">
import { computed } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useChats } from '../services/chat.ts'

const { textarea, input: userInput } = useTextareaAutosize({ input: '' })
const { addUserMessage } = useChats()

const isInputValid = computed<boolean>(() => !!userInput.value.trim())

const sendUserMessage = () => {
  if (isInputValid.value) {
    addUserMessage(userInput.value.trim())
    userInput.value = ''
  }
}

const shouldSubmit = ({ key, shiftKey }: KeyboardEvent): boolean => {
  return key === 'Enter' && !shiftKey
}

const onKeydown = (event: KeyboardEvent) => {
  if (shouldSubmit(event)) {
    event.preventDefault()
    sendUserMessage()
  }
}
</script>

<template>
  <form class="mt-2" @submit.prevent="sendUserMessage">
    <div class="relative">
      <textarea
        ref="textarea"
        v-model="userInput"
        class="block max-h-[500px] w-full resize-none rounded-xl border-none bg-zinc-100 p-4 pl-4 pr-20 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:focus:ring-blue-500 sm:text-base"
        placeholder="Enter your prompt"
        @keydown="onKeydown"
      ></textarea>
      <button
        type="submit"
        :disabled="!isInputValid"
        class="absolute bottom-2 right-2.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 sm:text-base"
      >
        Send
        <span class="sr-only">Send message</span>
      </button>
    </div>
  </form>
</template>
