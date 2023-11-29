import MarkdownIt from 'markdown-it'
import { Component, computed, defineComponent, h, ref } from 'vue'
import markdownItHighlightjs from 'markdown-it-highlightjs'

const Markdown: Component = defineComponent({
  props: {
    source: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const md = ref<MarkdownIt>(new MarkdownIt())

    md.value.use(markdownItHighlightjs, {
      inline: true,
      code: true,
      auto: true,
      ignoreIllegals: true,
    })

    const content = computed(() => md.value.render(props.source))

    return () => h('div', { innerHTML: content.value })
  },
})

export default Markdown
