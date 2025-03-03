<script setup lang="ts">
import {
  IconMoon,
  IconPlus,
  IconSettings2,
  IconSun,
  IconTrashX,
  IconUserCircle,
  IconMessageCode,
} from '@tabler/icons-vue'

import {
  isDarkMode,
  isSystemPromptOpen,
  toggleSettingsPanel,
  toggleSystemPromptPanel,
} from '../services/appConfig.ts'
import { useChats } from '../services/chat.ts'
import { Chat } from '../services/database.ts'
import { ref } from 'vue'

const { sortedChats, activeChat, switchChat, deleteChat, startNewChat } =
  useChats()

const onNewChat = () => {
  checkSystemPromptPanel()
  return startNewChat('New chat')
}

const onSwitchChat = (chatId: number) => {
  checkSystemPromptPanel()
  return switchChat(chatId)
}

const checkSystemPromptPanel = () => {
  isSystemPromptOpen.value = false
}



const singleChatMoreModel = ref({
  showMore: false,
  chatId: -1
})

const menuPosition = ref({
  top: '0px',
  left: '0px',
  transform: 'translateX(-50%)'
})

const onChatShowMore = (chat: Chat) => {
  if(!chat.id)
  return
  singleChatMoreModel.value.showMore = true
  singleChatMoreModel.value.chatId=chat.id
  const parent = document.getElementsByClassName("chat_show_more_" + chat.id)[0]
  if (!parent)
    return
  const parentRect = parent?.getBoundingClientRect()
  if (parentRect) {
    menuPosition.value = {
      top: `${parentRect.bottom + window.scrollY + 10}px`, // 添加 scrollY 修正滚动偏移
      left: `${parentRect.left + parentRect.width / 2}px`,
      transform: 'translateX(-50%)'
    }
  }
}


const onDeleteChat = () => {
  if (singleChatMoreModel.value.chatId != -1) {
    deleteChat(singleChatMoreModel.value.chatId);
    singleChatMoreModel.value.chatId = -1
  }
  singleChatMoreModel.value.showMore = false
}



const lang = navigator.language
</script>

<template>
  <aside class="flex">
    <div
      class="flex h-screen w-60 flex-col overflow-y-auto border-r border-gray-200 bg-white pt-2 dark:border-gray-800 dark:bg-gray-900 sm:h-screen sm:w-64">
      <div class="mx-2 mb-2">
        <button @click="onNewChat"
          class="flex w-full items-center justify-center gap-x-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-offset-gray-900">
          <IconPlus class="h-5 w-5" />
          <span>New Chat</span>
        </button>
      </div>

      <div class="h-full space-y-4 overflow-y-auto border-b border-gray-200 px-2 py-4 dark:border-gray-800">
        <button v-for="chat in sortedChats" @click="onSwitchChat(chat.id!)" @keyup.delete="deleteChat(chat.id!)" :class="{
          'bg-gray-100 dark:bg-gray-800': activeChat?.id == chat.id,
        }"
          class="flex w-full flex-col gap-y-1 rounded-md px-3 py-2 text-left transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
          <div style="display: flex;justify-content: space-between">
            <span class="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
              {{ chat.name }}
            </span>
            <div style="position: relative" class="chat_show_more_" :class="'chat_show_more_' + chat.id">
              <svg @click="onChatShowMore(chat!)" xmlns="http://www.w3.org/2000/svg" width="15" height="15"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="lucide lucide-ellipsis shrink-0">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
              <div @click="singleChatMoreModel.showMore = false"
              v-show="singleChatMoreModel.showMore"
              style="position: fixed;top: 0;left: 0;width: 100%;height: 100%;background: rgba(0, 0, 0, 0.5);display: flex;justify-content: center;align-items: center;z-index: 1000">
              <div :style="menuPosition" style="
              position: absolute;
              padding: 1rem;
              border-radius: 4px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              z-index: 1001;">
                  <button @click="onDeleteChat"
                    class="group flex w-full items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
                    <IconTrashX class="size-4 opacity-50 group-hover:opacity-80" />
                    Delete chat
                  </button>
                </div>
              </div>
            </div>
          </div>
          <span class="text-xs leading-none text-gray-700 dark:text-gray-300">
            {{ chat.model }}
          </span>
          <span class="text-xs leading-none text-gray-700 dark:text-gray-300">
            {{
              chat.createdAt.toLocaleDateString(lang, {
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

      <div class="mt-auto w-full space-y-2 px-2 py-4">
        <button @click="isDarkMode = !isDarkMode"
          class="group flex w-full items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
          <IconSun v-if="isDarkMode" class="size-4 opacity-50 group-hover:opacity-80" />
          <IconMoon v-else class="size-4 opacity-50 group-hover:opacity-80" />

          Toggle dark mode
        </button>
        <button v-if="false"
          class="group flex w-full items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
          <IconUserCircle class="size-4 opacity-50 group-hover:opacity-80" />
          User
        </button>
        <button @click="toggleSystemPromptPanel"
          class="group flex w-full items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
          <IconMessageCode class="size-4 opacity-50 group-hover:opacity-80" />

          System prompt
        </button>
        <button @click="toggleSettingsPanel"
          class="group flex w-full items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 transition-colors duration-100 ease-in-out hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-300 dark:hover:bg-gray-700 dark:focus:ring-blue-500">
          <IconSettings2 class="size-4 opacity-50 group-hover:opacity-80" />

          Settings
        </button>
      </div>
    </div>
  </aside>
</template>
