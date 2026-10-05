<p align="center">
  <img src=".github/header.png" alt="Ollama GUI: a chat with a thinking model, code highlighting and the date-grouped chat sidebar">
</p>

<h1 align="center">Ollama GUI</h1>
<p align="center">A modern web interface for chatting with your local LLMs through Ollama</p>

<p align="center">
  <a href="https://ollama.ai">
    <img src="https://img.shields.io/badge/Powered%20by-Ollama-blue?style=flat-square" alt="Powered by Ollama">
  </a>
  <a href="https://github.com/HelgeSverre/ollama-gui/blob/main/LICENSE.md">
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
  </a>
  <a href="https://ollama-gui.vercel.app">
    <img src="https://img.shields.io/badge/Demo-Live-success?style=flat-square" alt="Live Demo">
  </a>
</p>

## ✨ Features

- 💬 Streaming chat with stop, regenerate and edit. Every edit or regeneration is kept as a version you can flip through (`‹ 2/3 ›`), or branch into a new chat
- 🧠 Native reasoning display for thinking models (qwen3, deepseek-r1, gpt-oss…) with "Thought for 12s" blocks and an on/off or effort toggle
- 🖼️ Image input for vision models (llava, gemma3…), plus text and code file attachments. Paste, drag and drop, or pick files
- 🧩 Model manager: pull with live progress and cancel, delete, capability badges, context length, and models loaded in memory (with unload)
- ⚙️ System prompt and parameters (temperature, num_ctx, top_p, seed…) per chat, per model or globally
- 🗂️ History grouped by date, with pinning, archiving, renaming and auto-generated titles
- 🔍 ⌘K command palette with full-text search across all messages
- 📝 Markdown with syntax highlighting, copyable code blocks and KaTeX math
- 🌗 Light, dark and system themes; configurable date and number locale
- 📦 Import and export as JSON, or export a chat as Markdown
- 🔒 Private: chats are stored only in your browser (IndexedDB)

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘/Ctrl K` | Command palette and search |
| `⌘/Ctrl ⇧ O` | New chat |
| `⌘/Ctrl ⇧ ⌫` | Delete current chat |
| `Enter` / `⇧ Enter` | Send / new line |
| `Esc` | Stop generating |
| `↑` (empty composer) | Edit your last message |

## 🚀 Quick Start

### Prerequisites (only needed for local development)

1. Install [Ollama](https://ollama.com/download)
2. Install [Bun](https://bun.sh) (Node.js 20+ is also required for the toolchain)

### Local Development

```bash
ollama pull llama3.2   # or any other model; you can also pull from the UI
ollama serve

git clone https://github.com/HelgeSverre/ollama-gui.git
cd ollama-gui
bun install
bun run dev            # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:11434`, so no CORS setup is needed. `bun run dev --host` makes both the UI and the API reachable from other devices on your network. To point at a different Ollama, set the URL in **Settings → Connection**, or disable the proxy with `VITE_NO_PROXY=true bun run dev`.

### Where are my chats?

Chats live in your browser's IndexedDB, which is tied to the exact address the page is served from. `http://localhost:5173`, `http://127.0.0.1:5173`, a different port, another browser, or a private window each start with an empty history. The dev server is pinned to port 5173 and refuses to start on another one for this reason. Use **Settings → Data → Export / Import** to move chats between them, and **Keep data** to ask the browser not to evict storage.

### Using the Hosted Version

To use the [hosted version](https://ollama-gui.vercel.app), allow its origin in Ollama:

```bash
OLLAMA_ORIGINS=https://ollama-gui.vercel.app ollama serve
```

### Docker

The image serves the UI with nginx and proxies `/api` to Ollama, so the browser talks to a single origin and no `OLLAMA_ORIGINS` setup is needed.

```bash
# Ollama + GUI together
docker compose up -d                       # http://localhost:8080

# GUI only, talking to Ollama on the host
docker run -d -p 8080:80 --add-host=host.docker.internal:host-gateway ghcr.io/helgesverre/ollama-gui

# GUI only, talking to Ollama elsewhere
docker run -d -p 8080:80 -e OLLAMA_URL=http://gpu-box:11434 ghcr.io/helgesverre/ollama-gui
```

`OLLAMA_URL` (default `http://host.docker.internal:11434`) controls where nginx forwards API calls. For GPU access in `compose.yml`, uncomment the `deploy` block. Models are stored in `./ollama_data`, and you can pull them from the **Models** dialog.

## 🏭 Production Deployment

`bun run build` outputs static files to `dist/`. The browser needs to reach Ollama, either:

1. **Same origin (recommended):** serve `dist/` behind a reverse proxy that forwards `/api/` to Ollama. Build with `VITE_OLLAMA_URL=/` so the app uses its own origin; see `nginx/default.conf.template`.
2. **Cross origin:** build with `VITE_OLLAMA_URL=https://ollama.example.com` (or set it in Settings) and allow your domain with `OLLAMA_ORIGINS=https://your-domain.com`.

## 🧪 Development

```bash
bun run lint       # ESLint
bun run test       # Vitest unit and integration tests
bun run test:e2e   # Playwright against a mocked Ollama API
bun run build      # Type-check and production build
```

## 🛠️ Tech Stack

- [Vue.js](https://vuejs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [VueUse](https://vueuse.org/) - Vue Composition Utilities
- [Dexie](https://dexie.org/) - IndexedDB storage
- [markdown-it](https://github.com/markdown-it/markdown-it), [highlight.js](https://highlightjs.org/), [KaTeX](https://katex.org/) - Rendering
- [@tabler/icons-vue](https://github.com/tabler/icons-vue) - Icons
- Design inspired by [LangUI](https://www.langui.dev/)
- Hosted on [Vercel](https://vercel.com/)

## 📄 License

Released under the [MIT License](LICENSE.md).
