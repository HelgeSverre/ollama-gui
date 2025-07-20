import { Component, computed, defineComponent, h, ref } from 'vue'
import highlightjs from 'markdown-it-highlightjs'
import markdownit from 'markdown-it'
import markdownKatex from 'markdown-it-katex'
import 'katex/dist/katex.min.css'

const Markdown: Component = defineComponent({
  props: {
    source: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const md = ref<markdownit>(markdownit())

    md.value
      .use(highlightjs, {
        inline: true,
        auto: true,
        ignoreIllegals: true,
      })
      .use(markdownKatex, {
        throwOnError: false,
        errorColor: 'red',
      })

    const content = computed(() => md.value.render(props.source))

    return () => h('div', { innerHTML: content.value })
  },
})

export default Markdown
