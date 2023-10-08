<script setup lang="ts">
import { ChatMessage } from "../services/store.ts";

type Props = {
  message: ChatMessage;
};

const { message } = defineProps<Props>();
</script>

<template>
  <!-- User -->
  <div class="flex flex-row px-2 py-4 sm:px-4" v-if="message.role == 'user'">
    <img
      class="mr-2 flex h-8 w-8 rounded-full sm:mr-4"
      src="../assets/avatar.png"
    />

    <div class="flex max-w-3xl items-center">
      <p>{{ message.content }}</p>
    </div>
  </div>

  <!-- AI -->
  <div
    v-if="message.role == 'ai'"
    class="mb-4 flex rounded-xl bg-zinc-50 px-2 py-6 dark:bg-zinc-900 sm:px-4"
  >
    <img
      class="mr-2 flex h-8 w-8 rounded-full sm:mr-4 bg-white object-contain border border-gray-200"
      src="https://ollama.ai/public/ollama.png"
    />

    <div class="flex max-w-3xl items-center rounded-xl">
      <p>{{ message.content }}</p>
    </div>
  </div>
</template>
