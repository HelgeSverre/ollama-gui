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

const defaultRender =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultRender(tokens, idx, options, env, self)
}

const html = computed(() => md.render(props.source))
</script>

<template>
  <div v-html="html" />
</template>
