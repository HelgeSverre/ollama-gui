<script setup lang="ts">
import { useEventListener, useIntervalFn } from '@vueuse/core'
import { nextTick, onMounted, ref, watch } from 'vue'
import ChatHeader from './components/chat/ChatHeader.vue'
import ChatSettingsPanel from './components/chat/ChatSettingsPanel.vue'
import Thread from './components/chat/Thread.vue'
import CommandPalette from './components/CommandPalette.vue'
import Composer from './components/composer/Composer.vue'
import ConnectionBanner from './components/ConnectionBanner.vue'
import ModelManager from './components/models/ModelManager.vue'
import Settings from './components/settings/Settings.vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
import ToastHost from './components/ui/ToastHost.vue'
import { useChats } from './composables/useChats'
import { confirmAction } from './composables/useConfirm'
import { useModels } from './composables/useModels'
import { usePresets } from './composables/usePresets'
import { applyTheme, currentModel } from './composables/useSettings'
import { errorMessage, toast } from './composables/useToasts'
import { modal, toggleModal } from './composables/useUi'

const chats = useChats()
const models = useModels()
const presets = usePresets()
const composer = ref<InstanceType<typeof Composer>>()

applyTheme()

async function connect() {
  await models.refresh()
  const names = models.models.value.map((m) => m.name)
  if (names.length && !names.includes(currentModel.value)) currentModel.value = names[0]
}

onMounted(async () => {
  try {
    await Promise.all([chats.init(), presets.loadPresets()])
  } catch (error) {
    toast(`Could not open local storage: ${errorMessage(error)}`, 'error')
  }
  await connect()
  composer.value?.focus()
})

// Return focus to the composer when a dialog closes, rather than to the button that opened it
watch(modal, async (value, previous) => {
  if (value || !previous) return
  await nextTick()
  composer.value?.focus()
})

// Keep retrying quietly while Ollama is unreachable, and re-check when the tab regains focus.
useIntervalFn(() => {
  if (models.connection.value === 'error') void connect()
}, 10_000)
useEventListener(window, 'focus', () => void models.refresh())

useEventListener(window, 'keydown', async (event: KeyboardEvent) => {
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return
  const key = event.key.toLowerCase()
  if (key === 'k' && !event.shiftKey) {
    event.preventDefault()
    toggleModal('palette')
  } else if (key === 'o' && event.shiftKey) {
    event.preventDefault()
    modal.value = null
    chats.newChat()
  } else if (key === 'backspace' && event.shiftKey && chats.activeChat.value) {
    event.preventDefault()
    const chat = chats.activeChat.value
    const ok = await confirmAction({ title: 'Delete chat?', message: `"${chat.title}" will be deleted.`, confirmLabel: 'Delete', danger: true })
    if (ok) await chats.deleteChat(chat.id)
  }
})
</script>

<template>
  <div class="bg-page text-text flex h-dvh w-full overflow-hidden">
    <Sidebar />
    <main class="flex min-w-0 flex-1 flex-col">
      <ChatHeader />
      <ConnectionBanner />
      <Thread />
      <Composer ref="composer" />
    </main>
    <ChatSettingsPanel />
    <Settings />
    <ModelManager />
    <CommandPalette />
    <ConfirmDialog />
    <ToastHost />
  </div>
</template>
