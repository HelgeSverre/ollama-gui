<template>
  <VueMarkdown :source="content" :plugins="plugins" />
</template>
<script setup>
import { onMounted } from 'vue'
import VueMarkdown from 'vue-markdown-render'
import MarkdownItAnchor from 'markdown-it-anchor'
import hljs from 'highlight.js'
import '../assets/atom-one-dark.css'
import ClipboardJS from 'clipboard'

const plugins = [MarkdownItAnchor]
const { role, content } = defineProps({ role: String, content: String })

onMounted(() => {
  document.querySelectorAll('pre code').forEach((block) => {
    // Highlight the code block
    hljs.highlightElement(block)

    // Check if the button already exists
    if (!block.parentNode.querySelector('button.copy-button')) {
      const button = document.createElement('button')
      const clipboard = new ClipboardJS(button, {
        target: () => block,
      })

      clipboard.on('success', () => {
        button.innerText = 'Copied!'
        setTimeout(() => {
          button.innerText = 'Copy'
        }, 2000)
      })

      clipboard.on('error', () => {
        button.innerText = 'Failed'
      })

      button.className =
        'copy-button bg-[#282c34] text-slate-100 mt-2 p-2 rounded shadow-2xl hover:shadow-md active:shadow-none transition-shadow'
      button.innerText = 'Copy'
      block.parentNode.appendChild(button)
    }
  })
})
</script>
