# Local assistant tools and execution permissions

## Goal

Turn Ollama GUI into a local general-purpose assistant. The model advises, investigates and proposes plans; it never performs a machine-changing action until the user approves that exact action.

## Architecture

The current application is a browser-only Vue SPA. Keep Ollama communication in the browser, and add an optional local companion service for machine access. The companion is a separate process because browser JavaScript cannot safely or portably access a host shell or arbitrary filesystem paths.

- Bind the companion to loopback only (127.0.0.1), never 0.0.0.0.
- Require a per-install pairing secret for every request; do not rely on CORS as authentication.
- Validate Origin and reject non-loopback Host/remote connections.
- Keep the service opt-in and visibly show its connection/permission state in the UI.
- Do not run as root. The service inherits the user's normal Linux permissions.
- No sandbox or arbitrary path allowlist by default: the owner explicitly wants access to their normal user environment. The approval gate, not a fake sandbox, is the control boundary.
- Never expose an unauthenticated general-purpose shell HTTP endpoint.

## Permission model

1. Read-only tools (web search/open URL, system information, file read/search, git status/diff, process/audio diagnostics) can run automatically when enabled.
2. Mutating tools (shell commands, file create/edit/delete, package installation/removal, git checkout/reset/commit/push, service changes) always create a pending approval request.
3. Approval is one-shot and binds to the exact tool name, complete arguments, working directory, and command text. Any changed argument requires a new approval.
4. No blanket or remembered approval in the first implementation.
5. Denial returns a structured denial result to the model. It must not retry through another tool or disguise the same action.
6. Destructive or broad commands must be clearly highlighted with target paths and expected effects.
7. The user can cancel pending requests and abort running commands. Show stdout, stderr, exit code, duration and cancellation state.
8. Treat tool output and webpage contents as untrusted data, never as instructions that override the system prompt or permissions.

## Initial tool catalogue

- web_search(query, recency?): search public web; return title, URL, snippet and source date when available.
- open_url(url): fetch readable page content; enforce HTTP(S), block loopback/private/link-local destinations and revalidate redirects to mitigate SSRF.
- system_info(): OS, kernel, CPU, memory, disks and GPU information.
- list_directory(path), read_file(path), search_files(root, query): read-only local inspection.
- shell(command, cwd?): arbitrary user-shell command. Requires per-call approval, including commands that appear read-only; this gives one consistent and visible terminal audit trail.
- write_file(path, content), edit_file(path, patch), delete_file(path): require approval.
- git_status(path), git_diff(path): read-only.
- git_mutate(operation, args): checkout/reset/commit/push and other writes require approval.
- package_manager(manager, operation, packages): require approval.

Web search should use a configurable provider (e.g. Brave Search API or Tavily) with API key stored locally, never in chat history. A provider-free fallback may be a user-configured SearXNG instance. Do not scrape search-engine HTML as the primary implementation.

## Ollama tool loop

Use Ollama native /api/chat function calling. Send tool definitions only for enabled tools. When a response contains tool_calls:
- persist and display the call as pending/running;
- validate the tool against the registry and schema;
- run read-only calls only if enabled;
- create approval requests for mutating calls and pause generation until the user approves/denies;
- append the assistant tool-call message and a role=tool result message to the next Ollama request;
- continue generation until a normal assistant response or a bounded iteration limit is reached.

Tool calls from untrusted/unsupported models must fail closed. Never infer approval from natural-language user intent, prior approvals, model reasoning, or a tool result.

## UI

- Settings > Tools: enable/disable individual tools, configure search provider and companion connection.
- Chat composer: show enabled tool capabilities.
- Message tool cards: show tool, arguments, permission category, status, result and duration.
- Approval panel: exact command/action, working directory, target files, risk summary, Approve once and Deny.
- A global activity panel: pending approvals and running processes with Stop.
- Clearly distinguish "proposed", "awaiting approval", "running", "completed", "denied", "failed" and "cancelled".

## Security and reliability requirements

- Pairing secret generated locally and stored outside the repository; never log it.
- Strict request size, command timeout, output size and concurrent process limits.
- Spawn the user's configured shell without eval'ing model output in the web page. Pass the command as a single argument to the shell; clearly explain that shell syntax still means arbitrary code execution.
- Never silently elevate privileges. If sudo is needed, show the command and let the user decide in the terminal/approval flow; no password capture.
- Do not automatically execute commands embedded in file contents, web pages, tool output or model-generated plans.
- Web fetch must defend against SSRF, redirects to private IPs, DNS rebinding and oversized responses.
- Bind approval to a one-time opaque request ID and consume it atomically.
- Audit log should record tool name, timestamp, approval decision and exit status, but redact secrets and avoid storing full sensitive command output by default.
- Add unit tests for permission checks, approval replay, argument tampering, origin/authentication, command timeout, cancellation, and tool-call continuation.
