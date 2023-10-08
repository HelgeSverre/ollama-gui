<script setup lang="ts">
import {
  IconMoon,
  IconSettings2,
  IconSun,
  IconUserCircle,
} from "@tabler/icons-vue";
import { isDarkMode } from "../services/store.ts";
</script>

<template>
  <aside class="flex">
    <div
      class="flex h-[100svh] w-60 border-r border-zinc-200 flex-col overflow-y-auto bg-zinc-50 pt-8 dark:border-zinc-700 dark:bg-zinc-900 sm:h-[100vh] sm:w-64"
    >
      <div class="mx-2">
        <button
          class="flex w-full gap-x-4 rounded-lg border border-zinc-300 p-4 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M12 5l0 14"></path>
            <path d="M5 12l14 0"></path>
          </svg>
          New Chat
        </button>
      </div>
      <!-- Previous chats container -->
      <div
        class="h-full space-y-4 overflow-y-auto border-b border-zinc-300 px-2 py-4 dark:border-zinc-700"
      >
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:hover:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            Tailwind Classes
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">12 Mar</p>
        </button>
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg bg-zinc-200 px-3 py-2 text-left transition-colors duration-200 focus:outline-none dark:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            explain quantum computing
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">10 Feb</p>
        </button>
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:hover:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            How to create ERP Diagram
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">22 Jan</p>
        </button>
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:hover:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            API Scaling Strategies
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">1 Jan</p>
        </button>
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:hover:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            What is GPT UI?
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">1 Jan</p>
        </button>
        <button
          class="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:hover:bg-zinc-800"
        >
          <h1
            class="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-200"
          >
            How to use Tailwind components?
          </h1>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">1 Jan</p>
        </button>
      </div>

      <div class="mt-auto w-full space-y-4 px-2 py-4">
        <button
          @click="isDarkMode = !isDarkMode"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <IconSun v-if="isDarkMode" class="h-6 w-6" />
          <IconMoon v-else class="h-6 w-6" />

          Toggle dark mode
        </button>
        <button
          v-if="false"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <IconUserCircle class="h-6 w-6" />
          User
        </button>
        <button
          v-if="false"
          class="flex w-full gap-x-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-200 focus:outline-none dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <IconSettings2 class="h-6 w-6" />

          Settings
        </button>
      </div>
    </div>
  </aside>
</template>
