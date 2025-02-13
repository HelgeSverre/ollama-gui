<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAI } from '../services/useAI';

const { refreshModels, availableModels } = useAI();
const selectedModel = ref<string>(''); // Holds the selected model name

// Fetch models when the component is mounted
onMounted(async () => {
  await refreshModels();
});

// Function to handle model deletion
const deleteModel = async () => {
  if (!selectedModel.value) {
    alert('Please select a model to delete.');
    return;
  }

  try {
    const response = await fetch('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: selectedModel.value }),
    });

    if (response.ok) {
      alert(`Model "${selectedModel.value}" deleted successfully.`);
      await refreshModels(); // Refresh the list of available models
      selectedModel.value = ''; // Reset the selected model
    } else {
      const errorData = await response.json();
      alert(`Failed to delete model: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error deleting model:', error);
    alert('An error occurred while deleting the model.');
  }
};
</script>

<template>
    
    <div class="space-y-4">
      <label for="model-select" class="block text-sm ml-2 font-semibold text-gray-700 dark:text-gray-300">
        Delete Model
      </label>
      <select
        id="model-select"
        v-model="selectedModel"
        class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"
      >
        <option value="" disabled class="text-gray-900 dark:text-gray-200">
          Select a model
        </option>
        <option
          v-for="model in availableModels"
          :key="model.name"
          :value="model.name"
          class="text-gray-900 dark:text-gray-200 text-sm"
        >
          {{ model.name }} ({{ (model.size / 1024 / 1024).toFixed(2) }} MB)
        </option>
      </select>
      <button
        @click="deleteModel"
        :disabled="!selectedModel"
        class="w-full py-2 px-4 bg-red-500 dark:bg-red-600 text-white font-semibold rounded-md hover:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
      >
        Delete Model
      </button>
    </div>
</template>