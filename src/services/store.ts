import { ref } from "vue";
import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { v4 as uuidv4 } from "uuid";

export const isDarkMode = useLocalStorage("darkMode", true);

export type ChatMessage = {
  role: "ai" | "user" | "system";
  content: string;
  date: Date;
};

export type Chat = {
  id: string;
  title?: string;
  model: string;
  messages: ChatMessage[];
  createdAt: Date;
};

export const useAppState = defineStore("app-state", () => {
  const baseUrl = ref("http://localhost:11434/api");
  const currentModel = ref("orca-mini");
  const availableModels = ref([]);
  const userInput = ref("");

  const previousChats = ref<Chat[]>([]);
  const currentChat = ref<Chat>();

  // Start a new chat
  const setCurrentChat = (chat: Chat) => {
    currentChat.value = chat;
  };

  // Start a new chat
  const startNewChat = (title: string, model: string) => {
    const newChat: Chat = {
      title,
      model,
      id: uuidv4(),
      messages: [],
      createdAt: new Date(),
    };
    previousChats.value.push(newChat);
    currentChat.value = newChat;
  };

  // Add a message to the current chat
  const addMessage = (role: "ai" | "user" | "system", content: string) => {
    if (!currentChat.value) return;
    if (!content?.trim()) return;

    const message: ChatMessage = {
      role,
      content,
      date: new Date(),
    };
    currentChat.value.messages.push(message);

    clearUserInput();
  };

  const addUserMessage = (content: string) => addMessage("user", content);
  const addAiMessage = (content: string) => addMessage("user", content);

  // Clear the user input
  const clearUserInput = () => {
    userInput.value = "";
  };

  // Initialize current chat
  if (!currentChat.value) {
    startNewChat("New chat", "none");
    addMessage("ai", "I am the default message");
    addMessage("user", "hello");
  }

  return {
    userInput,
    previousChats,
    currentChat,
    baseUrl,
    currentModel,
    availableModels,
    setCurrentChat,
    startNewChat,
    addMessage,
    clearUserInput,
    addUserMessage,
    addAiMessage,
  };
});
