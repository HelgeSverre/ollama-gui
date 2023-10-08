<script setup lang="ts">
import {
  isSettingsPanelOpen,
  toggleSettingsPanel,
  useAppState,
} from '../services/store.ts'
import { storeToRefs } from 'pinia'
import { IconLayoutSidebarRightCollapse } from '@tabler/icons-vue'

const { baseUrl, availableModels, currentModel } = storeToRefs(useAppState())
</script>

<template>
  <transition name="slide">
    <aside v-if="isSettingsPanelOpen">
      <div
        class="relative h-screen w-60 overflow-y-auto border-l border-zinc-300 bg-zinc-50 py-4 dark:border-zinc-700 dark:bg-zinc-900 sm:w-64"
      >
        <div class="mb-4 flex items-center gap-x-2 px-2 text-zinc-800 dark:text-zinc-200">
          <button
            @click="toggleSettingsPanel"
            class="inline-flex rounded-lg p-1 hover:bg-zinc-200 hover:dark:bg-zinc-700"
          >
            <IconLayoutSidebarRightCollapse class="h-6 w-6" />

            <span class="sr-only">Close settings sidebar</span>
          </button>
          <h2 class="text-lg font-medium">Settings</h2>
        </div>

        <!-- More Settings -->
        <div
          class="my-4 border-t border-zinc-300 px-2 py-4 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
        >
          <div>
            <label for="base-url" class="mb-2 mt-4 block px-2 text-sm font-medium">
              Base URL
            </label>
            <input
              v-model="baseUrl"
              type="url"
              id="base-url"
              class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
              placeholder="https://api.openai.com"
            />
          </div>

          <div>
            <label for="max-tokens" class="mb-2 mt-4 block px-2 text-sm font-medium">
              Max tokens
            </label>
            <input
              type="number"
              disabled
              id="max-tokens"
              class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
              placeholder="2048"
            />
          </div>

          <div>
            <label for="temperature" class="mb-2 mt-4 block px-2 text-sm font-medium">
              Temperature
            </label>
            <input
              type="number"
              disabled
              id="temperature"
              class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
              placeholder="0.7"
            />
          </div>

          <div>
            <label for="top-p" class="mb-2 mt-4 block px-2 text-sm font-medium">
              Top P
            </label>
            <input
              type="number"
              disabled
              id="top-p"
              class="block w-full rounded-lg bg-zinc-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:placeholder-zinc-400 dark:focus:ring-blue-600"
              placeholder="1"
            />
          </div>

          <button
            type="button"
            class="mt-4 block w-full duration-200 ease-in-out rounded-lg bg-zinc-200 p-2.5 text-xs font-semibold hover:bg-blue-600 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800 dark:hover:bg-blue-600"
          >
            Save changes
          </button>
        </div>
      </div>
    </aside>
  </transition>
</template>
