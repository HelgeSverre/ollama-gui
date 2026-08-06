<script setup lang="ts">
import { computed } from 'vue'
import markdownit from 'markdown-it'
import hljs from 'highlight.js'

const props = defineProps<{ source: string }>()

const md = markdownit({
  html: false,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {}
    }
    return ''
  },
})

const html = computed(() => md.render(props.source))
</script>

<template>
  <div v-html="html"></div>
</template>
