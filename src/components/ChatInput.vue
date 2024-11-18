<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { useChats } from '../services/chat.ts'
import { IconPlayerStopFilled, IconSend, IconWhirl } from '@tabler/icons-vue'

const { textarea, input: userInput } = useTextareaAutosize({ input: '' })
const { addUserMessage, abort, hasActiveChat } = useChats()

const isInputValid = computed<boolean>(() => !!userInput.value.trim())
const isAiResponding = ref(false)
const flag = ref(true)

const onSubmit = () => {
  if (isAiResponding.value) {
    abort()
    isAiResponding.value = false
    return
  }

  if (isInputValid.value) {
    addUserMessage(userInput.value.trim()).then(() => {
      isAiResponding.value = false
    })
    userInput.value = ''
    isAiResponding.value = true
  }
}

const shouldSubmit = ({ key, shiftKey }: KeyboardEvent): boolean => {
  return key === 'Enter' && !shiftKey
}

const onKeydown = (event: KeyboardEvent) => {
  if (shouldSubmit(event) && flag.value) {
    // Pressing enter while the ai is responding should not abort the request
    if (isAiResponding.value) {
      return
    }

    event.preventDefault()
    onSubmit()
  }
}

const handleCompositionStart = () => {
  flag.value = false
}

const handleCompositionEnd = () => {
  flag.value = true
}
</script>

<template>
  <form class="mt-2" @submit.prevent="onSubmit">
    <div class="relative">
      <textarea
        ref="textarea"
        v-model="userInput"
        class="block max-h-[500px] w-full resize-none rounded-xl border-none bg-gray-50 p-4 pl-4 pr-20 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:text-gray-50 dark:placeholder-gray-300 dark:focus:ring-blue-600 sm:text-base"
        placeholder="Enter your prompt"
        @keydown="onKeydown"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
      ></textarea>
      <button
        type="submit"
        :disabled="isInputValid == false && isAiResponding == false"
        class="group absolute bottom-2 right-2.5 flex size-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-medium text-white transition duration-200 ease-in-out hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 dark:disabled:bg-gray-600 sm:text-base"
      >
        <IconPlayerStopFilled
          v-if="isAiResponding"
          class="absolute opacity-0 transition duration-200 ease-in-out group-hover:opacity-100"
          :size="20"
        />
        <IconWhirl
          class="absolute animate-spin opacity-50 transition duration-200 ease-in-out group-hover:opacity-0"
          v-if="isAiResponding"
          :size="20"
        />

        <IconSend v-else :size="20" />
      </button>
    </div>
  </form>
</template>
