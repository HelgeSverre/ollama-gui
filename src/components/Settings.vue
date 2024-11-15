<script setup lang="ts">
import { IconLayoutSidebarRightCollapse } from '@tabler/icons-vue'
import ToggleInput from './Inputs/ToggleInput.vue'
import TextInput from './Inputs/TextInput.vue'
import {
  baseUrl,
  historyMessageLength,
  debugMode,
  gravatarEmail,
  toggleSettingsPanel,
} from '../services/appConfig.ts'
</script>

<template>
  <aside>
    <div
      class="relative h-screen w-60 overflow-y-auto border-l border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-900 sm:w-64"
    >
      <div class="mb-4 flex items-center gap-x-2 px-2 text-gray-900 dark:text-gray-100">
        <button
          @click="toggleSettingsPanel()"
          class="inline-flex rounded-lg p-1 hover:bg-gray-100 hover:dark:bg-gray-700"
        >
          <IconLayoutSidebarRightCollapse class="h-6 w-6" />

          <span class="sr-only">Close settings sidebar</span>
        </button>
        <h2 class="text-lg font-medium">Settings</h2>
      </div>

      <!-- More Settings -->
      <div
        class="my-4 border-t border-gray-200 px-2 py-4 text-gray-900 dark:border-gray-700 dark:text-gray-100"
      >
        <div>
          <ToggleInput label="Enable debug mode" v-model="debugMode" />
        </div>

        <TextInput label="Base URL" v-model="baseUrl" />

        <TextInput label="Gravatar Email" v-model="gravatarEmail" />

        <div>
          <label for="max-tokens" class="mb-2 mt-4 block px-2 text-sm font-medium">
            Conversation History Size
          </label>
          <input
            type="number"
            min="0"
            max="100"
            id="chat-history-length"
            v-model="historyMessageLength"
            class="block w-full rounded-lg bg-gray-100 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:placeholder-gray-300 dark:focus:ring-blue-600"
            placeholder="2048"
          />
        </div>

        <div v-if="false">
          <div>
            <label for="max-tokens" class="mb-2 mt-4 block px-2 text-sm font-medium">
              Max tokens
            </label>
            <input
              type="number"
              disabled
              id="max-tokens"
              class="block w-full rounded-lg bg-gray-100 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:placeholder-gray-300 dark:focus:ring-blue-600"
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
              class="block w-full rounded-lg bg-gray-100 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:placeholder-gray-300 dark:focus:ring-blue-600"
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
              class="block w-full rounded-lg bg-gray-100 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:placeholder-gray-300 dark:focus:ring-blue-600"
              placeholder="1"
            />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
