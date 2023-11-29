<script setup lang="ts">
import {
  IconMoon,
  IconPlus,
  IconSettings2,
  IconSun,
  IconTrashX,
  IconUserCircle,
} from '@tabler/icons-vue'
import { isDarkMode, toggleSettingsPanel } from '../services/appConfig.ts'
import { useChats } from '../services/chat.ts'
import { useAI } from '../services/useAI.ts'

const { availableModels } = useAI()
const { sortedChats, activeChat, switchChat, deleteChat, startNewChat, wipeDatabase } =
  useChats()

const onNewChat = () => {
  return startNewChat(
    'New chat',
    activeChat.value?.model ?? availableModels.value[0].name,
  )
}
</script>

<template>
  <aside class="flex">
    <div
      class="flex h-[100svh] w-60 flex-col overflow-y-auto border-r border-zinc-200 bg-zinc-50 pt-2 dark:border-zinc-700 dark:bg-zinc-900 sm:h-[100vh] sm:w-64"
    >
      <div class="mx-2">
        <button
          @click="onNewChat"
          class="flex w-full gap-x-4 rounded-lg border border-zinc-300 p-4 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <IconPlus class="h-5 w-5" />
          New Chat
        </button>
      </div>

      <div
        class="h-full space-y-4 overflow-y-auto border-b border-zinc-300 px-2 py-4 dark:border-zinc-700"
      >
        <button
          v-for="chat in sortedChats"
          @click="switchChat(chat.id!)"
          @keyup.delete="deleteChat(chat.id!)"
          :class="{
            'bg-zinc-200 dark:bg-zinc-800': activeChat?.id == chat.id,
          }"
          class="flex w-full flex-col gap-y-1 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <span class="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-200">
            {{ chat.name }}
          </span>
          <span class="text-xs leading-none text-zinc-500 dark:text-zinc-400">
            {{ chat.model }}
          </span>
          <span class="text-xs leading-none text-zinc-500 dark:text-zinc-400">
            {{
              chat.createdAt.toLocaleDateString('no', {
                day: '2-digit',
                month: 'short',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            }}
          </span>
        </button>
      </div>

      <div class="mt-auto w-full space-y-4 px-2 py-4">
        <button
          @click="isDarkMode = !isDarkMode"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <IconSun v-if="isDarkMode" class="h-6 w-6" />
          <IconMoon v-else class="h-6 w-6" />

          Toggle dark mode
        </button>
        <button
          @click="wipeDatabase"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <IconTrashX class="h-6 w-6" />

          Delete chats
        </button>
        <button
          v-if="false"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <IconUserCircle class="h-6 w-6" />
          User
        </button>
        <button
          @click="toggleSettingsPanel"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-blue-500"
        >
          <IconSettings2 class="h-6 w-6" />

          Settings
        </button>
      </div>
    </div>
  </aside>
</template>
