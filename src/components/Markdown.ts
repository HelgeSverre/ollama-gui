import { Component, computed, defineComponent, h, ref } from 'vue'
import highlightjs from 'markdown-it-highlightjs'
import markdownit from 'markdown-it'
import markdownItKatex from '@vscode/markdown-it-katex'
import { preprocessLatex } from '../utils'

const Markdown: Component = defineComponent({
  props: {
    source: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const md = ref<markdownit>(markdownit())

    md.value.use(markdownItKatex)

    md.value.use(highlightjs, {
      inline: true,
      auto: true,
      ignoreIllegals: true,
    })

    const content = computed(() => {
      const preprocessed = preprocessLatex(props.source)
      return md.value.render(preprocessed)
    })

    return () => h('div', { innerHTML: content.value })
  },
})

export default Markdown
