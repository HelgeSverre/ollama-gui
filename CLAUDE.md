# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Ollama GUI: a Vue 3 + TypeScript web UI for chatting with local LLMs through Ollama. Local-first: chats live in the browser's IndexedDB; the only network peer is the Ollama API.

## Commands

```bash
bun install
bun run dev          # Vite on :5173 (strictPort), proxies /api → localhost:11434
bun run dev --host   # also reachable from the LAN (UI and API through the proxy)
bun run lint         # ESLint
bun run test         # Vitest (unit + integration; fake-indexeddb, mocked fetch)
bun run test:e2e     # Playwright on :5180 against a mocked Ollama (e2e/*.spec.ts)
bun run test:coverage
bun run catalog:update  # refresh src/data/model-catalog.json from ollama.com (ollama-library-scraper)
bun run build        # vue-tsc -b + vite build → dist/
docker compose up -d # Ollama + GUI; nginx proxies /api (see nginx/default.conf.template)
```

`VITE_NO_PROXY=true` disables the dev proxy. `VITE_OLLAMA_URL` sets the build-time default Ollama URL ("/" = same origin, used by the Docker image).

## Architecture

```
src/
  domain/        Pure, framework-free logic. Unit-tested.
    types.ts       Chat, MessageNode, Part, GenerationSettings, Preset
    thread.ts      Message tree → active path, siblings, branch switching
    parts.ts       Streaming event reducer (applyEvent), ThinkTagSplitter, legacy content parsing
    settings.ts    Layered settings resolution: global → model → chat
    format.ts      Locale resolution, relative time, bytes, date groups
    catalog.ts     Ollama library catalog: normalising scraper output, search ranking, popular models
    legacy.ts      v1/v2.0 flat chats → message tree (used by DB migration and JSON import)
  db/            Dexie schema (v11 legacy → v12 tree → v13 drops old tables), plain() proxy unwrapping
  ollama/        HTTP client (fetch + NDJSON), wire types, chat transport, model endpoints
  markdown/      Shared markdown-it instance, highlight.js (common languages), lazy KaTeX
  composables/   Module-level singleton state (no Pinia)
    useChats       Chat list, active chat, node cache per chat, CRUD, search, branching
    useGeneration  send / regenerate / edit / stop; one AbortController per chat; auto-title
    useModels      Model list, connection state, /api/show cache (capabilities), pulls, ps
    usePresets     Model and global generation defaults (Dexie `presets`)
    useSettings    localStorage UI prefs (URL, theme, locale, markdown…), applyTheme
    useTransfer    JSON export/import (v2 format + v1 arrays), Markdown export
    useUi / useToasts / useConfirm   Overlay state, toasts, promise-based confirm dialog
  components/    chat/, composer/, sidebar/, models/, settings/, ui/ (Modal on native <dialog>, Menu, Toggle…)
```

### Core model

- A **message** (`MessageNode`) has `parts[]` (text, reasoning, file, tool-call, error), modelled on Vercel AI SDK's UIMessage, and a `parentId`. A chat is a tree; `chat.activeLeafId` picks the visible path. Edit and regenerate add a sibling; `‹ n/m ›` switches leaves.
- **Generation** writes into the cached reactive node by id, never into "the active chat", so switching chats mid-stream is safe. Partial output is persisted every ~500 ms and on stop or error.
- **Thinking** uses Ollama's native `message.thinking`. `think` is only sent to models whose `/api/show` capabilities include `thinking`. Inline `<think>` tags in content are also split out (ThinkTagSplitter).
- **Images** are sent as `messages[].images` (base64 without the data-URL prefix). Text files are inlined into the content as fenced blocks.
- **Settings** resolve global → model → chat; empty fields inherit.

### Testing

- Unit and integration tests sit next to the code (`*.test.ts`) and use fake-indexeddb with a stubbed `fetch`.
- `e2e/helpers.ts` mocks the Ollama API with `page.route`. `manualStreams()` swaps `/api/chat` streaming for streams a test pushes chunk by chunk, so behaviour mid-reply can be tested: stop, reload, switching chats, deleting, dropped connections.

### Conventions

- New streaming behaviour: add a `ChatEvent` in `domain/parts.ts`, map it in `ollama/transport.ts`, render it in `components/chat/MessageItem.vue`.
- Schema changes: add a new Dexie version in `db/schema.ts` with an upgrade function and a test in `db/schema.test.ts`. Never change an existing version.
- Values written to Dexie go through `plain()`, because Vue proxies can't be structured-cloned.
- Use `confirmAction()` for destructive actions and `toast()` for feedback; never `alert` or `confirm`.
- Styling: Tailwind v4, CSS-first (`src/style.css`). Colors are CSS variables swapped by `.dark` on `<html>`; use the semantic tokens (`bg-panel`, `text-text-muted`, `border-border`…), not raw colors.
