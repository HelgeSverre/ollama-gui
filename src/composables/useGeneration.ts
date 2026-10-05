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

/** In-flight generations keyed by chat id; at most one per chat, any number across chats. */
const running = reactive(new Map<string, { nodeId: string; abort(): void }>())

const chats = useChats()
const models = useModels()
const presets = usePresets()

function isGenerating(chatId: string | undefined) {
  return !!chatId && running.has(chatId)
}

function stop(chatId: string | undefined) {
  if (chatId) running.get(chatId)?.abort()
}

function newNode(chat: Chat, parentId: string | null, role: MessageNode['role'], parts: Part[]): MessageNode {
  return {
    id: crypto.randomUUID(),
    chatId: chat.id,
    parentId,
    role,
    parts,
    status: 'done',
    createdAt: new Date(),
  }
}

/** Sends a user message on the active chat, creating the chat for a draft. */
async function send(parts: Part[]) {
  const model = chats.activeModel.value
  if (!model) {
    toast('Select a model first', 'error')
    return
  }
  const chat = chats.activeChat.value ?? (await chats.createChat(model, draftTitle(parts)))
  if (isGenerating(chat.id)) return
  const parentId = chats.activeThread.value.at(-1)?.id ?? null
  const user = await chats.addNode(newNode(chat, parentId, 'user', parts))
  await generate(chat, user.id)
}

/** Generates a new assistant reply as a sibling of `nodeId` (or below it, for a user node). */
async function regenerate(chatId: string, nodeId: string) {
  const chat = chats.getChat(chatId)
  const node = chats.getNode(chatId, nodeId)
  if (!chat || !node || isGenerating(chatId)) return
  await generate(chat, node.role === 'assistant' ? node.parentId : node.id)
}

/** Replaces a user message by adding an edited sibling, then answers it. */
async function edit(chatId: string, nodeId: string, text: string) {
  const chat = chats.getChat(chatId)
  const node = chats.getNode(chatId, nodeId)
  if (!chat || !node || node.role !== 'user' || isGenerating(chatId)) return
  const parts: Part[] = [...node.parts.filter((p) => p.type === 'file'), { type: 'text', text }]
  const edited = await chats.addNode(newNode(chat, node.parentId, 'user', parts.map((p) => ({ ...p }))))
  await generate(chat, edited.id)
}

async function generate(chat: Chat, parentId: string | null) {
  const model = chat.model || chats.activeModel.value
  const history = activePath(chats.chatIndex(chat.id), parentId)
  const draft = newNode(chat, parentId, 'assistant', [])
  draft.status = 'streaming'
  draft.meta = { model }
  const node = await chats.addNode(draft)
  await chats.updateChat(chat.id, { activeLeafId: node.id, updatedAt: new Date() })

  const info = await models.loadInfo(model)
  const settings = resolveSettings(presets.globalPreset(), presets.modelPreset(model), chat.settings)
  const stream = startChat({
    model,
    history,
    settings,
    supportsThinking: info?.capabilities.includes('thinking') ?? false,
  })
  running.set(chat.id, { nodeId: node.id, abort: stream.abort })

  let lastSave = Date.now()
  try {
    for await (const event of stream.events) {
      const meta = applyEvent(node.parts, event, Date.now())
      if (meta) node.meta = { ...node.meta, ...meta }
      if (Date.now() - lastSave > PERSIST_INTERVAL_MS) {
        lastSave = Date.now()
        void chats.saveNode(node)
      }
    }
    node.status = 'done'
  } catch (error) {
    const aborted = isAbort(error)
    node.status = aborted ? 'aborted' : 'error'
    if (!aborted) node.parts.push({ type: 'error', message: errorMessage(error) })
  } finally {
    closeReasoning(node.parts, Date.now())
    running.delete(chat.id)
    await chats.saveNode(node)
  }

  if (node.status === 'done' && history.length === 1 && !chat.titleGenerated && autoTitle.value) {
    void generateTitle(chat, history[0], node)
  }
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
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
