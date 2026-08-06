<script setup lang="ts">
import {
  IconMoon,
  IconPlus,
  IconSettings2,
  IconSun,
  IconTrashX,
  IconMessageCode,
  IconDots,
  IconPinned,
  IconPinnedOff,
  IconArchive,
  IconArchiveOff,
  IconGitFork,
  IconSearch,
  IconBox,
} from '@tabler/icons-vue'

import {
  isDarkMode,
  isSystemPromptOpen,
  toggleSettingsPanel,
  toggleSystemPromptPanel,
  toggleModelManager,
} from '../services/appConfig.ts'
import { useChats } from '../services/chat.ts'
import { useAI } from '../services/useAI.ts'
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { formatDistanceToNow } from 'date-fns'

const {
  sortedChats,
  activeChat,
  messages,
  switchChat,
  deleteChat,
  startNewChat,
  togglePinChat,
  toggleArchiveChat,
  forkChat,
  searchChats,
} = useChats()
const { availableModels } = useAI()
const contextMenuChatId = ref<number | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuRef = ref<HTMLElement>()
const searchQuery = ref('')

const filteredChats = computed(() => {
  if (!searchQuery.value.trim()) return sortedChats.value
  const q = searchQuery.value.toLowerCase()
  return sortedChats.value.filter((c) => c.name.toLowerCase().includes(q))
})

const onNewChat = () => {
  isSystemPromptOpen.value = false
  return startNewChat('New chat')
}

const onSwitchChat = (chatId: number) => {
  isSystemPromptOpen.value = false
  return switchChat(chatId)
}

const onContextMenu = (e: MouseEvent, chatId: number) => {
  e.preventDefault()
  contextMenuChatId.value = chatId
  contextMenuPos.value = { x: e.pageX, y: e.pageY }
}

const closeContextMenu = () => {
  contextMenuChatId.value = null
}

onClickOutside(contextMenuRef, closeContextMenu)

const onDeleteChat = () => {
  if (contextMenuChatId.value != null) {
    deleteChat(contextMenuChatId.value)
    closeContextMenu()
  }
}

const onTogglePin = () => {
  if (contextMenuChatId.value != null) {
    togglePinChat(contextMenuChatId.value)
    closeContextMenu()
  }
}

const onToggleArchive = () => {
  if (contextMenuChatId.value != null) {
    toggleArchiveChat(contextMenuChatId.value)
    closeContextMenu()
  }
}

const onForkChat = () => {
  if (contextMenuChatId.value != null) {
    forkChat(contextMenuChatId.value, messages.value.length)
    closeContextMenu()
  }
}

const formatDate = (date: Date) => formatDistanceToNow(date, { addSuffix: true })
</script>

<template>
  <aside class="flex flex-none">
    <div class="bg-panel border-border flex h-screen w-[236px] flex-col border-r">
      <div class="flex items-center justify-between px-3.5 py-2">
        <span class="text-text text-[12px] font-semibold">Ollama GUI</span>
        <span class="text-text-muted font-mono text-[10px]">
          {{ availableModels.length }} models
        </span>
      </div>

      <div class="px-2.5 pb-1">
        <button
          @click="onNewChat"
          class="bg-accent flex w-full items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
          data-testid="new-chat-btn"
        >
          <IconPlus :size="15" />
          New Chat
        </button>
      </div>

      <div class="px-2.5 pb-1">
        <div class="relative">
          <IconSearch
            :size="13"
            class="text-text-muted absolute top-1/2 left-2 -translate-y-1/2"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search chats..."
            class="border-border bg-list text-text placeholder:text-text-muted focus:border-accent w-full rounded-[5px] border py-1 pr-2 pl-7 text-[11px] outline-none"
            data-testid="search-chats"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pb-1">
        <div
          class="text-text-muted flex items-center justify-between px-3.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase"
        >
          <span>Chats</span>
          <span class="font-medium">{{ sortedChats.length }}</span>
        </div>

        <div
          v-for="chat in filteredChats"
          :key="chat.id"
          @click="onSwitchChat(chat.id!)"
          @contextmenu="onContextMenu($event, chat.id!)"
          @keydown.enter="onSwitchChat(chat.id!)"
          @keydown.space.prevent="onSwitchChat(chat.id!)"
          role="button"
          tabindex="0"
          :aria-label="`Chat: ${chat.name}`"
          :class="[
            'cursor-pointer border-l-2 px-3 py-1.5',
            activeChat?.id === chat.id
              ? 'border-accent bg-sel'
              : 'hover:bg-hover border-transparent',
            !searchQuery && chat.archived && activeChat?.id !== chat.id ? 'hidden' : '',
            chat.archived && activeChat?.id !== chat.id ? 'opacity-50' : '',
          ]"
          data-testid="chat-item"
        >
          <div class="flex items-center gap-1.5">
            <span
              class="h-[7px] w-[7px] flex-none rounded-full"
              :class="
                activeChat?.id === chat.id ? 'bg-green' : 'border-text-muted border'
              "
            ></span>
            <span class="text-text flex-1 truncate text-[12px] font-semibold">
              {{ chat.name }}
            </span>
            <IconPinned v-if="chat.pinned" :size="10" class="text-text-muted flex-none" />
            <button
              v-if="activeChat?.id === chat.id"
              class="text-text-muted hover:bg-hover hover:text-text flex-none rounded-[3px] p-0.5"
              aria-label="Chat actions"
              @click.stop="onContextMenu($event, chat.id!)"
            >
              <IconDots :size="13" />
            </button>
          </div>
          <div class="mt-0.5 flex items-center gap-1 pl-[13px]">
            <span class="text-text-muted truncate font-mono text-[10px]">
              {{ chat.model }}
            </span>
            <span class="text-text-muted flex-none text-[10px]">
              &middot; {{ formatDate(chat.createdAt) }}
            </span>
          </div>
        </div>

        <div
          v-if="filteredChats.length === 0"
          class="text-text-muted px-3.5 py-3 text-[11px]"
        >
          {{
            searchQuery
              ? 'No chats match your search.'
              : 'No chats yet. Start a new chat to begin.'
          }}
        </div>
      </div>

      <div class="border-border flex-none border-t py-1">
        <div
          class="text-text-muted px-3.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase"
        >
          Actions
        </div>
        <button
          @click="toggleSystemPromptPanel"
          class="text-text hover:bg-hover flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[11.5px]"
        >
          <IconMessageCode :size="14" class="text-text-muted" />
          System Prompt
        </button>
        <button
          @click="isDarkMode = !isDarkMode"
          class="text-text hover:bg-hover flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[11.5px]"
        >
          <IconSun v-if="isDarkMode" :size="14" class="text-text-muted" />
          <IconMoon v-else :size="14" class="text-text-muted" />
          Toggle light mode
        </button>
        <button
          @click="toggleModelManager"
          class="text-text hover:bg-hover flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[11.5px]"
        >
          <IconBox :size="14" class="text-text-muted" />
          Model Manager
        </button>
        <button
          @click="toggleSettingsPanel"
          class="text-text hover:bg-hover flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[11.5px]"
          data-testid="settings-btn"
        >
          <IconSettings2 :size="14" class="text-text-muted" />
          Settings
        </button>
      </div>

      <div
        class="border-border text-text-muted flex flex-none items-center gap-3 border-t px-3.5 py-1.5 font-mono text-[10px]"
      >
        <span>{{ activeChat?.model ?? 'no model' }}</span>
        <span v-if="activeChat?.tokenUsage">|</span>
        <span v-if="activeChat?.tokenUsage?.total" class="tabular-nums">
          {{ activeChat.tokenUsage.total.toLocaleString() }} tok
        </span>
      </div>
    </div>
  </aside>

  <Teleport to="body">
    <div
      v-if="contextMenuChatId != null"
      ref="contextMenuRef"
      class="border-border bg-panel fixed z-50 min-w-[140px] rounded-[6px] border py-1 shadow-lg"
      :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
    >
      <button
        @click="onTogglePin"
        class="text-text hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
      >
        <IconPinnedOff
          v-if="sortedChats.find((c) => c.id === contextMenuChatId)?.pinned"
          :size="14"
        />
        <IconPinned v-else :size="14" />
        {{
          sortedChats.find((c) => c.id === contextMenuChatId)?.pinned ? 'Unpin' : 'Pin'
        }}
      </button>
      <button
        @click="onToggleArchive"
        class="text-text hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
      >
        <IconArchiveOff
          v-if="sortedChats.find((c) => c.id === contextMenuChatId)?.archived"
          :size="14"
        />
        <IconArchive v-else :size="14" />
        {{
          sortedChats.find((c) => c.id === contextMenuChatId)?.archived
            ? 'Unarchive'
            : 'Archive'
        }}
      </button>
      <div v-if="messages.length > 0" class="border-border my-1 border-t"></div>
      <button
        v-if="messages.length > 0"
        @click="onForkChat"
        class="text-text hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
      >
        <IconGitFork :size="14" />
        Fork chat
      </button>
      <div class="border-border my-1 border-t"></div>
      <button
        @click="onDeleteChat"
        class="text-red hover:bg-hover flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px]"
        data-testid="delete-chat-btn"
      >
        <IconTrashX :size="14" />
        Delete chat
      </button>
    </div>
  </Teleport>
</template>
