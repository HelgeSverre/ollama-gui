<template>
  <div v-html="content" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import markdownit from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import { useCopyCode } from 'markdown-it-copy-code';

// Props declaration
const props = defineProps<{
  source: string;
}>();
onMounted(()=>{
  useCopyCode()
})
// Initialize markdown-it with highlightjs plugin
const md = markdownit().use(highlightjs, {
  inline: true,
  auto: true,
  ignoreIllegals: true,
})

// Computed property to render markdown
const content = computed(() => md.render(props.source));
</script>
