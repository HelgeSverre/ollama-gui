# Code Review: ollama-gui

## [CRITICAL] Writing to read-only computed property

**File:** `src/components/ChatInput.vue:85,103`
**Category:** Correctness

**Issue:** `isAiResponding` is defined as a read-only `computed(() => !!activeStream.value)` on line 30, but is assigned to directly on lines 85 and 103:
```ts
isAiResponding.value = false  // line 85
isAiResponding.value = true   // line 103
```

**Why it matters:** Vue 3 silently ignores writes to read-only computeds (or warns in dev mode). These assignments do nothing. The actual state is driven by `activeStream` becoming null in `stream.ts:42`. The UI happens to work because `abort()` nulls the stream, but the `= false` on line 85 and `= true` on line 103 are dead code. If the stream abort is delayed or fails, the UI state will be wrong.

**Suggestion:** Replace with a writable ref that shadows the computed:
```ts
const isAiResponding = ref(false)
// Remove the computed, manage the flag explicitly
```

---

## [HIGH] Database write on every streaming token

**File:** `src/services/chat.ts:360-369`
**Category:** Performance

**Issue:** `appendToAiMessage` calls `dbLayer.updateMessage` (an IndexedDB write) on every single streamed token chunk.

**Why it matters:** A typical response can produce hundreds of chunks, each triggering an IndexedDB write. This creates unnecessary I/O pressure and can cause visible jank during streaming.

**Suggestion:** Debounce the DB write, or only persist on completion:
```ts
const appendToAiMessage = (content: string, chatId: number) => {
  const aiMessage = ongoingAiMessages.value.get(chatId)
  if (aiMessage) aiMessage.content += content
  // DB write happens in handleAiCompletion only
}
```

---

## [HIGH] Context menu "Fork chat" checks wrong chat's messages

**File:** `src/components/Sidebar.vue:290`
**Category:** Correctness

**Issue:** `v-if="messages.length > 0"` checks the currently active chat's messages, not the right-clicked chat's messages.

**Why it matters:** Fork will appear/disappear based on the active chat, even when right-clicking a different chat that has messages (or vice versa).

---

## [MEDIUM] Hash collision risk in configId

**File:** `src/services/appConfig.ts:58-62`
**Category:** Correctness

**Issue:** `configId` uses a DJB2-like hash with `Math.abs`. Two different model names can produce the same hash, silently overwriting each other's config. Additionally, `Math.abs(-2147483648)` returns `-2147483648` in JavaScript (the minimum 32-bit int edge case).

**Suggestion:** Use the model name string as the primary key directly, or add a unique constraint and collision handling.

---

## [MEDIUM] N+1 queries in searchChats

**File:** `src/services/chat.ts:450-476`
**Category:** Performance

**Issue:** `searchChats` calls `getChat(id)` in a loop for each unique chatId found in search results.

**Suggestion:** Batch-load all chats at once:
```ts
const chatIds = [...new Set(results.map((m) => m.chatId))]
const chats = await db.chats.where('id').anyOf(chatIds).toArray()
```

---

## [MEDIUM] Inline MD5 implementation in config file

**File:** `src/services/appConfig.ts:64-102`
**Category:** Maintainability

**Issue:** ~40 lines of hand-rolled MD5 inlined in a config service. This is difficult to audit, maintain, and could have subtle bugs.

**Suggestion:** Use a library like `crypto-js/md5` or the Web Crypto API (`crypto.subtle.digest`).

---

## [LOW] Unused utility function

**File:** `src/utils.ts:4-6`
**Category:** Maintainability

**Issue:** `nanoToHHMMSS` is annotated `// noinspection JSUnusedLocalSymbols` — it's dead code.

---

## [LOW] Unnecessary dbLayer abstraction

**File:** `src/services/chat.ts:27-86`
**Category:** Maintainability

**Issue:** The `dbLayer` object wraps every Dexie call 1:1 with no added logic, adding ~60 lines of boilerplate.

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | CRITICAL | ChatInput.vue:85,103 | Writing to read-only computed (dead code, state bug) |
| 2 | HIGH | chat.ts:360-369 | IndexedDB write on every streaming token |
| 3 | HIGH | Sidebar.vue:290 | Fork visibility checks wrong chat's messages |
| 4 | MEDIUM | appConfig.ts:58-62 | Hash collision + Math.abs edge case in configId |
| 5 | MEDIUM | chat.ts:450-476 | N+1 queries in searchChats |
| 6 | MEDIUM | appConfig.ts:64-102 | Inline MD5 should be a library |
| 7 | LOW | utils.ts:4-6 | Unused function |
| 8 | LOW | chat.ts:27-86 | Unnecessary dbLayer wrapper |

**Verdict:** Request changes — items 1-3 should be fixed before shipping.
