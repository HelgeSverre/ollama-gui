<script setup lang="ts">
import Sidebar from "./components/Sidebar.vue";
import ChatInput from "./components/ChatInput.vue";
import ChatMessages from "./components/ChatMessages.vue";
import { isDarkMode } from "./services/store.ts";
</script>

<template>
  <div :class="{ dark: isDarkMode }">
    <main
      class="flex flex-row items-stretch flex-1 w-full h-full bg-zinc-50 dark:bg-zinc-800"
    >
      <Sidebar />

      <div class="flex h-[100vh] max-w-6xl mx-auto w-full flex-col">
        <div class="flex h-[100vh] px-4 py-8 w-full flex-col">
          <ChatMessages />

          <ChatInput />
        </div>
      </div>
    </main>
  </div>
</template>
