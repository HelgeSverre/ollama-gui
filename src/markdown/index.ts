import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/common'
import { ref } from 'vue'

/** One shared renderer. Common highlight.js languages (Go, Rust, Python, TS, SQL, …) are bundled. */
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: false })
export const md = markdown

const escape = md.utils.escapeHtml

md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const lang = token.info.trim().split(/\s+/)[0] ?? ''
  const known = lang && hljs.getLanguage(lang)
  let code: string
  try {
    code = known ? hljs.highlight(token.content, { language: lang, ignoreIllegals: true }).value : escape(token.content)
  } catch {
    code = escape(token.content)
  }
  return (
    `<div class="code-block">` +
    `<div class="code-header"><span>${escape(lang || 'text')}</span>` +
    `<button type="button" class="code-copy" data-copy>Copy</button></div>` +
    `<pre><code class="hljs${known ? ` language-${escape(lang)}` : ''}">${code}</code></pre></div>`
  )
}

const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** Bumps once KaTeX has loaded so mounted messages re-render with math. */
export const mathVersion = ref(0)
let mathLoading: Promise<void> | null = null

const MATH = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(^|[^\\$\w])\$[^\s$][^$\n]*?\$/

/** Loads KaTeX on first sight of math so plain chats don't pay for it. */
export function ensureMath(source: string) {
  if (mathLoading || !MATH.test(source)) return
  mathLoading = Promise.all([import('@vscode/markdown-it-katex'), import('katex/dist/katex.min.css')])
    .then(([plugin]) => {
      // CJS module: the plugin is `default`, possibly wrapped once more by the bundler's interop
      type Plugin = (md: typeof markdown, options: object) => void
      const mod = plugin as unknown as { default: Plugin | { default: Plugin } }
      const katex = typeof mod.default === 'function' ? mod.default : mod.default.default
      md.use(katex, { throwOnError: false, enableMathInlineInHtml: false })
      mathVersion.value++
    })
    .catch(() => {
      mathLoading = null
    })
}

export function renderMarkdown(source: string) {
  ensureMath(source)
  return md.render(source)
}
