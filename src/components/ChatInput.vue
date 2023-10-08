<script setup lang="ts">
import { useAppState } from "../services/store.ts";
import { storeToRefs } from "pinia";
import { useTextareaAutosize } from "@vueuse/core";

const { textarea, input } = useTextareaAutosize();

const { userInput } = storeToRefs(useAppState());
const { addUserMessage } = useAppState();

const onSubmit = () => {
  addUserMessage(userInput.value);
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    onSubmit();
  }
};
</script>
<template>
  <form class="mt-2" @submit.prevent="onSubmit">
    <label for="chat-input" class="sr-only">Enter your prompt</label>
    <div class="relative">
      <textarea
        id="chat-input"
        ref="textarea"
        v-model="[input, userInput]"
        class="block w-full resize-none rounded-xl border-none bg-zinc-100 p-4 pl-4 pr-20 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-400 dark:focus:ring-blue-500 sm:text-base"
        placeholder="Enter your prompt"
        rows="1"
        @keydown="onKeydown"
      ></textarea>
      <button
        type="submit"
        class="absolute bottom-2 right-2.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 sm:text-base"
      >
        Send <span class="sr-only">Send message</span>
      </button>
    </div>
  </form>
</template>
