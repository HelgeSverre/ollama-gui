# Local companion service

The companion is an optional local process that gives the UI access to the logged-in user's machine. It is deliberately separate from the browser app.

## Run

From the repository root:

```bash
OLLAMA_GUI_AGENT_TOKEN="$(openssl rand -hex 32)" npm run agent
```

The service prints the generated token if `OLLAMA_GUI_AGENT_TOKEN` is omitted. Keep it private. It listens on `127.0.0.1:3210` only. Run it as your normal desktop user, never with sudo.

To enable web search, configure a Brave Search API key:

```bash
BRAVE_SEARCH_API_KEY="your-key" OLLAMA_GUI_AGENT_TOKEN="your-token" npm run agent
```

## API (v1)

Every request requires `Authorization: Bearer <token>`.

- `GET /v1/health` — companion status.
- `POST /v1/inspect` with `{"path":"/path"}` — inspect one directory or read a text file (up to 1 MiB).
- `POST /v1/web-search` with `{"query":"..."}` — Brave web search.
- `POST /v1/open-url` with `{"url":"https://..."}` — fetch readable public text/JSON.
- `POST /v1/actions` with `{"tool":"shell","command":"...","cwd":"/path"}` — stage a shell command. This does not execute it.
- `POST /v1/actions/:id/approve` — consume the staged request and execute the exact command once.
- `POST /v1/actions/:id/cancel` — cancel a pending or running request.

The approval endpoint must only be called by a deliberate user interaction in the UI. Never wire it directly to a model tool call. Approval IDs are one-shot and are consumed before command execution.

## Important status

This is the first companion-service foundation. The current commit does not yet wire the Vue chat's Ollama tool-call loop or approval UI to this service. Do not treat the companion as a complete assistant integration until those pieces and their tests are implemented.
