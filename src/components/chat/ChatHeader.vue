<script setup lang="ts">
import {
  IconAdjustmentsHorizontal,
  IconArchive,
  IconDots,
  IconFileDownload,
  IconLayoutSidebar,
  IconPencil,
  IconPinned,
  IconPinnedOff,
  IconTrash,
} from '@tabler/icons-vue'
import { nextTick, ref } from 'vue'
import { useChats } from '../../composables/useChats'
import { confirmAction } from '../../composables/useConfirm'
import { chatToMarkdown, downloadFile, safeFileName } from '../../composables/useTransfer'
import { chatSettingsOpen, sidebarOpen } from '../../composables/useUi'
import Menu from '../ui/Menu.vue'
import MenuItem from '../ui/MenuItem.vue'

const chats = useChats()
const editing = ref(false)
const title = ref('')
const input = ref<HTMLInputElement>()

async function startRename() {
  if (!chats.activeChat.value) return
  title.value = chats.activeChat.value.title
  editing.value = true
  await nextTick()
  input.value?.select()
}

async function commitRename() {
  if (!editing.value) return
  editing.value = false
  const chat = chats.activeChat.value
  if (chat && title.value.trim() && title.value.trim() !== chat.title)
    await chats.renameChat(chat.id, title.value)
}

async function exportMarkdown() {
  const chat = chats.activeChat.value
  if (!chat) return
  downloadFile(
    `${safeFileName(chat.title)}.md`,
    await chatToMarkdown(chat.id),
    'text/markdown',
  )
}

async function remove() {
  const chat = chats.activeChat.value
  if (!chat) return
  const ok = await confirmAction({
    title: 'Delete chat?',
    message: `"${chat.title}" and all of its messages will be deleted.`,
    confirmLabel: 'Delete',
    danger: true,
  })
  if (ok) await chats.deleteChat(chat.id)
}
</script>

<template>
  <header class="border-border flex h-[46px] flex-none items-center gap-2 border-b px-3">
    <button
      type="button"
      class="hover:bg-hover text-text-secondary rounded-md p-1.5 md:hidden"
      aria-label="Open sidebar"
      @click="sidebarOpen = true"
    >
      <IconLayoutSidebar :size="18" />
    </button>

    <div class="flex min-w-0 flex-1 items-center gap-2">
      <input
        v-if="editing"
        ref="input"
        v-model="title"
        class="border-accent bg-list text-text w-full max-w-[360px] rounded-md border px-2 py-1 text-[13.5px] font-semibold outline-none"
        aria-label="Chat title"
        @keydown.enter="commitRename"
        @keydown.esc="editing = false"
        @blur="commitRename"
      />
      <button
        v-else-if="chats.activeChat.value"
        type="button"
        class="hover:bg-hover text-text truncate rounded-md px-2 py-1 text-[13.5px] font-semibold"
        title="Rename"
        data-testid="chat-title"
        @click="startRename"
      >
        {{ chats.activeChat.value.title }}
      </button>
      <span v-else class="text-text-secondary px-2 text-[13.5px] font-semibold">
        New chat
      </span>
    </div>

    <button
      type="button"
      class="hover:bg-hover rounded-md p-1.5"
      :class="chatSettingsOpen ? 'text-accent bg-hover' : 'text-text-secondary'"
      title="Chat settings"
      aria-label="Chat settings"
      data-testid="chat-settings-btn"
      @click="chatSettingsOpen = !chatSettingsOpen"
    >
      <IconAdjustmentsHorizontal :size="18" />
    </button>

    <Menu v-if="chats.activeChat.value">
      <template #trigger="{ toggle }">
        <button
          type="button"
          class="hover:bg-hover text-text-secondary rounded-md p-1.5"
          aria-label="Chat actions"
          @click="toggle"
        >
          <IconDots :size="18" />
        </button>
      </template>
      <MenuItem :icon="IconPencil" @click="startRename">Rename</MenuItem>
      <MenuItem
        :icon="chats.activeChat.value.pinned ? IconPinnedOff : IconPinned"
        @click="chats.togglePin(chats.activeChat.value.id)"
      >
        {{ chats.activeChat.value.pinned ? 'Unpin' : 'Pin' }}
      </MenuItem>
      <MenuItem
        :icon="IconArchive"
        @click="chats.toggleArchive(chats.activeChat.value.id)"
      >
        {{ chats.activeChat.value.archived ? 'Unarchive' : 'Archive' }}
      </MenuItem>
      <MenuItem :icon="IconFileDownload" @click="exportMarkdown">
        Export as Markdown
      </MenuItem>
      <div class="border-border my-1 border-t" />
      <MenuItem :icon="IconTrash" danger @click="remove">Delete</MenuItem>
    </Menu>
  </header>
</template>
