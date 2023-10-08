<script setup lang="ts">
import ChatMessage from "./ChatMessage.vue";
import { useAppState } from "../services/store.ts";
import { storeToRefs } from "pinia";

const { currentChat } = storeToRefs(useAppState());
</script>
<template>
  <div
    class="flex-1 overflow-y-auto rounded-xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 sm:text-base sm:leading-7"
  >
    <ChatMessage v-for="message in currentChat?.messages" :message="message" />
  </div>
</template>
