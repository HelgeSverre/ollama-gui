<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTextareaAutosize, onClickOutside, onKeyStroke } from '@vueuse/core'
import { useChats } from '../services/chat.ts'
import { showSystem } from '../services/appConfig.ts'
import { activeStream } from '../services/stream'
import {
  IconPlayerStopFilled,
  IconSend,
  IconArrowBackUp,
  IconDots,
  IconRobot,
  IconMessage,
} from '@tabler/icons-vue'

const { textarea, input: userInput } = useTextareaAutosize({ input: '' })
const {
  addSystemMessage,
  addUserMessage,
  abort,
  error,
  hasActiveChat,
  hasMessages,
  regenerateResponse,
} = useChats()

const images = ref<string[]>([])
const isSystemMessage = ref(false)
const isInputValid = computed<boolean>(
  () => !!userInput.value.trim() || images.value.length > 0,
)
const isAiResponding = ref(false)
const isComposing = ref(true)
const showOptionsMenu = ref(false)

watch(activeStream, (stream) => {
  isAiResponding.value = !!stream
})
const menuRef = ref<HTMLElement>()
const dropdownBtnRef = ref<HTMLElement>()

onClickOutside(
  menuRef,
  () => {
    showOptionsMenu.value = false
  },
  { ignore: [dropdownBtnRef] },
)

onKeyStroke('Escape', (e) => {
  if (showOptionsMenu.value) {
    e.preventDefault()
    showOptionsMenu.value = false
  }
})

const onPaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      const reader = new FileReader()
      reader.onload = () => {
        images.value.push(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
}

const onDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files
  if (!files) return
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        images.value.push(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
}

const onSubmit = () => {
  if (isAiResponding.value) {
    abort()
    isAiResponding.value = false
    return
  }
  if (isInputValid.value || images.value.length) {
    if (isSystemMessage.value) {
      addSystemMessage(userInput.value.trim())
    } else {
      let content = userInput.value.trim()
      if (images.value.length) {
        const imageMarkdown = images.value.map((img) => `![image](${img})`).join('\n')
        content = content ? `${content}\n\n${imageMarkdown}` : imageMarkdown
      }
      addUserMessage(content).then(() => {
        isAiResponding.value = false
      })
    }
    userInput.value = ''
    images.value = []
    if (!isSystemMessage.value) isAiResponding.value = true
  }
}

const shouldSubmit = ({ key, shiftKey }: KeyboardEvent) => key === 'Enter' && !shiftKey

const onKeydown = (event: KeyboardEvent) => {
  if (shouldSubmit(event) && isComposing.value && !isAiResponding.value) {
    event.preventDefault()
    onSubmit()
  }
}

const toggleDropdown = () => {
  showOptionsMenu.value = !showOptionsMenu.value
}

const setMessageType = (isSystem: boolean) => {
  isSystemMessage.value = isSystem
  showOptionsMenu.value = false
}
</script>

<template>
  <form
    @submit.prevent="onSubmit"
    @dragover.prevent
    @drop.prevent="onDrop"
    class="border-border bg-panel flex-none border-t"
    data-testid="chat-input-form"
  >
    <div class="mx-auto max-w-[48rem] px-4">
      <div class="flex items-center gap-2 py-1.5">
        <div class="text-text-secondary flex items-center gap-1 text-[11px]">
          <span class="font-medium">
            {{ isSystemMessage ? 'System message' : 'User message' }}
          </span>
        </div>

        <div class="relative ml-auto flex items-center gap-1">
          <button
            v-if="hasMessages"
            type="button"
            @click="regenerateResponse"
            class="text-text-secondary hover:bg-hover hover:text-text inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px]"
            data-testid="regenerate-btn"
          >
            <IconArrowBackUp :size="13" />
            Regenerate
          </button>

          <button
            v-if="showSystem"
            type="button"
            ref="dropdownBtnRef"
            aria-label="Message options"
            @click="toggleDropdown"
            class="text-text-muted hover:bg-hover hover:text-text inline-flex items-center rounded-[4px] p-1"
            data-testid="message-type-dropdown"
          >
            <IconDots :size="14" />
          </button>

          <div
            v-if="showOptionsMenu"
            ref="menuRef"
            class="border-border bg-panel absolute top-full right-0 z-40 min-w-[150px] rounded-[6px] border py-1 shadow-lg"
            data-testid="message-type-menu"
          >
            <button
              type="button"
              @click="setMessageType(false)"
              :class="!isSystemMessage ? 'text-text' : 'text-text-secondary'"
              class="hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
              data-testid="msg-type-user"
            >
              <IconMessage :size="14" />
              User message
              <span
                v-if="!isSystemMessage"
                class="text-accent ml-auto text-[10px] font-bold"
              >
                ON
              </span>
            </button>
            <button
              type="button"
              @click="setMessageType(true)"
              :class="isSystemMessage ? 'text-text' : 'text-text-secondary'"
              class="hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
              data-testid="msg-type-system"
            >
              <IconRobot :size="14" />
              System message
              <span
                v-if="isSystemMessage"
                class="text-accent ml-auto text-[10px] font-bold"
              >
                ON
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        role="alert"
        class="border-red/30 bg-red/10 text-red mb-1 rounded-[5px] border px-3 py-1.5 text-[11px]"
      >
        {{ error }}
      </div>

      <div class="relative flex items-end gap-2 py-2">
        <div class="min-w-0 flex-1">
          <div v-if="images.length" class="flex flex-wrap gap-2 py-1.5">
            <div v-for="(img, i) in images" :key="i" class="relative">
              <img
                :src="img"
                class="border-border h-16 w-16 rounded-[4px] border object-cover"
              />
              <button
                @click="images.splice(i, 1)"
                class="bg-border text-text hover:bg-hover absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
              >
                x
              </button>
            </div>
          </div>
          <textarea
            ref="textarea"
            v-model="userInput"
            rows="1"
            class="border-border bg-list text-text placeholder:text-text-muted focus:border-accent max-h-[300px] min-h-[36px] w-full resize-none rounded-[5px] border px-3 py-2 text-[12.5px] leading-relaxed outline-none"
            :placeholder="isSystemMessage ? 'System instructions...' : 'Message...'"
            @keydown="onKeydown"
            @paste="onPaste"
            @compositionstart="isComposing = false"
            @compositionend="isComposing = true"
            data-testid="chat-textarea"
          ></textarea>
        </div>
        <button
          type="submit"
          :disabled="!isInputValid && !isAiResponding"
          :aria-label="isAiResponding ? 'Stop generating' : 'Send message'"
          class="bg-accent flex h-[36px] w-[36px] flex-none items-center justify-center rounded-[5px] text-white hover:opacity-90 disabled:opacity-30"
          data-testid="send-btn"
        >
          <IconPlayerStopFilled v-if="isAiResponding" :size="15" />
          <IconSend v-else :size="15" />
        </button>
      </div>
    </div>
  </form>
</template>
