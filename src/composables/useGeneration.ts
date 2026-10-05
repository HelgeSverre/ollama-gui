import { reactive } from 'vue'
import { applyEvent, closeReasoning, textOf } from '../domain/parts'
import { resolveSettings } from '../domain/settings'
import { activePath } from '../domain/thread'
import type { Chat, MessageNode, Part } from '../domain/types'
import { requestJson } from '../ollama/client'
import { buildChatRequest, startChat } from '../ollama/transport'
import { useChats } from './useChats'
import { useModels } from './useModels'
import { usePresets } from './usePresets'
import { autoTitle } from './useSettings'
import { errorMessage, toast } from './useToasts'

const PERSIST_INTERVAL_MS = 500

/**
 * In-flight generations keyed by chat id; at most one per chat, any number across chats.
 * A slot is claimed synchronously before any await, so a second send/regenerate/edit can't slip
 * in while the first is still setting up, and Stop works from the very first moment.
 */
const running = reactive(new Map<string, { nodeId: string | null; abort(): void }>())
/** Slot key for a send from the unsaved new-chat draft, before its chat row exists. */
const DRAFT = '\0draft'

const chats = useChats()
const models = useModels()
const presets = usePresets()

// Deleting a chat (or all chats) stops its generation first.
chats.onBeforeDelete((chatId) => {
  if (chatId === null) for (const slot of running.values()) slot.abort()
  else stop(chatId)
})

function isGenerating(chatId: string | undefined) {
  return running.has(chatId ?? DRAFT)
}

function stop(chatId: string | undefined) {
  running.get(chatId ?? DRAFT)?.abort()
}

function claim(key: string): AbortController | null {
  if (running.has(key)) return null
  const controller = new AbortController()
  running.set(key, { nodeId: null, abort: () => controller.abort() })
  return controller
}

let lastTimestamp = 0
/** Strictly increasing timestamps: siblings are ordered by createdAt, so ties would shuffle versions. */
function nextTimestamp() {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
  return new Date(lastTimestamp)
}

function newNode(chat: Chat, parentId: string | null, role: MessageNode['role'], parts: Part[]): MessageNode {
  return {
    id: crypto.randomUUID(),
    chatId: chat.id,
    parentId,
    role,
    parts,
    status: 'done',
    createdAt: nextTimestamp(),
  }
}

/** Sends a user message on the active chat, creating the chat for a draft. Returns false if busy. */
async function send(parts: Part[]): Promise<boolean> {
  const model = chats.activeModel.value
  if (!model) {
    toast('Select a model first', 'error')
    return false
  }
  const existing = chats.activeChat.value
  const key = existing?.id ?? DRAFT
  const controller = claim(key)
  if (!controller) return false
  let chatId = key
  try {
    const chat = existing ?? (await chats.createChat(model, draftTitle(parts)))
    if (!existing) {
      // Move the slot from the draft to the new chat
      running.set(chat.id, running.get(DRAFT)!)
      running.delete(DRAFT)
      chatId = chat.id
    }
    const parentId = chats.activePath(chat.id).at(-1)?.id ?? null
    const user = await chats.addNode(newNode(chat, parentId, 'user', parts))
    await generate(chat, user.id, controller)
  } finally {
    running.delete(chatId)
  }
  return true
}

/** Generates a new assistant reply as a sibling of `nodeId` (or below it, for a user node). */
async function regenerate(chatId: string, nodeId: string): Promise<boolean> {
  const chat = chats.getChat(chatId)
  const node = chats.getNode(chatId, nodeId)
  if (!chat || !node) return false
  const controller = claim(chatId)
  if (!controller) return false
  try {
    await generate(chat, node.role === 'assistant' ? node.parentId : node.id, controller)
  } finally {
    running.delete(chatId)
  }
  return true
}

/** Replaces a user message by adding an edited sibling, then answers it. Returns false if busy. */
async function edit(chatId: string, nodeId: string, text: string): Promise<boolean> {
  const chat = chats.getChat(chatId)
  const node = chats.getNode(chatId, nodeId)
  if (!chat || !node || node.role !== 'user') return false
  const controller = claim(chatId)
  if (!controller) return false
  try {
    const parts: Part[] = [...node.parts.filter((p) => p.type === 'file'), { type: 'text', text }]
    const edited = await chats.addNode(newNode(chat, node.parentId, 'user', parts.map((p) => ({ ...p }))))
    await generate(chat, edited.id, controller)
  } finally {
    running.delete(chatId)
  }
  return true
}

/** Streams a reply below `parentId`. The caller owns the running slot and its controller. */
async function generate(chat: Chat, parentId: string | null, controller: AbortController) {
  const model = chat.model || chats.activeModel.value
  const history = activePath(chats.chatIndex(chat.id), parentId)
  const draft = newNode(chat, parentId, 'assistant', [])
  draft.status = 'streaming'
  draft.meta = { model }
  const node = await chats.addNode(draft)
  const slot = running.get(chat.id)
  if (slot) slot.nodeId = node.id
  await chats.updateChat(chat.id, { activeLeafId: node.id, updatedAt: new Date() })

  // Skip writes once the chat is gone, so a late save can't resurrect deleted rows
  const save = () => (chats.getChat(chat.id) ? chats.saveNode(node) : Promise.resolve())
  let lastSave = Date.now()
  try {
    const info = await models.loadInfo(model)
    controller.signal.throwIfAborted()
    const settings = resolveSettings(presets.globalPreset(), presets.modelPreset(model), chat.settings)
    const stream = startChat(
      { model, history, settings, supportsThinking: info?.capabilities.includes('thinking') ?? false },
      controller.signal,
    )
    for await (const event of stream.events) {
      const meta = applyEvent(node.parts, event, Date.now())
      if (meta) node.meta = { ...node.meta, ...meta }
      if (Date.now() - lastSave > PERSIST_INTERVAL_MS) {
        lastSave = Date.now()
        void save()
      }
    }
    node.status = 'done'
  } catch (error) {
    const aborted = controller.signal.aborted || isAbort(error)
    node.status = aborted ? 'aborted' : 'error'
    if (!aborted) node.parts.push({ type: 'error', message: errorMessage(error) })
  } finally {
    closeReasoning(node.parts, Date.now())
    await save()
  }

  const current = chats.getChat(chat.id)
  if (node.status === 'done' && current && !current.titleGenerated && autoTitle.value) {
    const firstUser = history.find((n) => n.role === 'user')
    if (firstUser) void generateTitle(current, firstUser, node)
  }
}

function isAbort(error: unknown) {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

function draftTitle(parts: Part[]) {
  const text = textOf(parts).replace(/\s+/g, ' ').trim()
  if (!text) return 'New chat'
  return text.length > 48 ? `${text.slice(0, 47)}…` : text
}

const TITLE_PROMPT =
  'Write a short title (3 to 6 words) for the conversation below. Reply with the title only: no quotes, no punctuation at the end.'

/** Asks the chat's model for a short title. Leaves updatedAt alone so the chat doesn't jump. */
async function generateTitle(chat: Chat, user: MessageNode, reply: MessageNode) {
  const excerpt = (node: MessageNode) => textOf(node.parts).slice(0, 1500)
  const info = models.info.get(chat.model)
  const request = buildChatRequest({
    model: chat.model,
    history: [
      {
        ...user,
        parts: [{ type: 'text', text: `${TITLE_PROMPT}\n\nUser: ${excerpt(user)}\n\nAssistant: ${excerpt(reply)}` }],
      },
    ],
    settings: { think: false },
    supportsThinking: info?.capabilities.includes('thinking') ?? false,
  })
  try {
    const response = await requestJson<{ message?: { content?: string } }>('chat', {
      method: 'POST',
      body: { ...request, stream: false },
    })
    const title = cleanTitle(response.message?.content ?? '')
    const current = chats.getChat(chat.id)
    if (title && current && !current.titleGenerated) {
      await chats.updateChat(chat.id, { title, titleGenerated: true })
    }
  } catch {
    // keep the draft title
  }
}

export function cleanTitle(raw: string) {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
    ?.replace(/^["'*#\s]+|["'*.\s]+$/g, '')
    .replace(/^title:\s*/i, '')
    .slice(0, 60) ?? ''
}

export function useGeneration() {
  return { running, isGenerating, stop, send, regenerate, edit }
}
