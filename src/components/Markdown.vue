
<template>
  <VueMarkdown :source="content" :plugins="plugins" />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import VueMarkdown from 'vue-markdown-render'
import MarkdownItAnchor from 'markdown-it-anchor'
import hljs from 'highlight.js'
import '../assets/atom-one-dark.css'
import ClipboardJS from 'clipboard'

const plugins = [MarkdownItAnchor]
const { content } = defineProps({ content: String })

const applySyntaxHighlighting = () => {
  document.querySelectorAll('pre code').forEach((block) => {
    if (!block.classList.contains('hljs')) {
      hljs.highlightElement(block) // Apply syntax highlighting
    }

    // Ensure copy button isn't added multiple times
    if (!block.parentNode.querySelector('button.copy-button')) {
      const button = document.createElement('button')
      button.className =
        'copy-button bg-[#282c34] text-slate-100 mt-2 px-3 py-1 rounded transition-all duration-300 shadow-2xl hover:shadow-md active:shadow-none'
      button.innerText = 'Copy'
      block.parentNode.appendChild(button)

      // ClipboardJS setup
      const clipboard = new ClipboardJS(button, { target: () => block })
      clipboard.on('success', () => {
        button.innerText = 'Copied!'
        button.classList.add('copied') // Add animation class
        setTimeout(() => {
          button.innerText = 'Copy'
          button.classList.remove('copied') // Remove animation class
        }, 2000)
      })
      clipboard.on('error', () => {
        button.innerText = 'Failed'
      })
    }
  })
}

// Observe DOM changes to detect when markdown content updates
const observeDOMChanges = () => {
  const observer = new MutationObserver(applySyntaxHighlighting)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// Run once when the component mounts
onMounted(() => {
  applySyntaxHighlighting()
  observeDOMChanges()
})

// Watch for changes in `content` and reapply highlighting
watch(() => content, applySyntaxHighlighting)
</script>

<style>
/* Smooth button animation */
.copy-button {
  transition: all 0.3s ease-in-out;
}
.copy-button.copied {
  background-color: #4caf50 !important;
  color: white !important;
  transform: scale(1.05);
}
</style>
