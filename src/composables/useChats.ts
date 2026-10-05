import { useLocalStorage } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { plain } from '../db/plain'
import { db } from '../db/schema'
import { textOf } from '../domain/parts'
import { activePath, indexNodes, newestLeaf, subtreeIds, type ThreadIndex } from '../domain/thread'
import type { Chat, GenerationSettings, MessageNode } from '../domain/types'
import { currentModel } from './useSettings'

const chats = ref<Chat[]>([])
/** Empty string means the unsaved "new chat" draft; a chat row is created on first send. */
const activeChatId = useLocalStorage('ollama-gui:active-chat', '')
/** Loaded message nodes per chat. Generation mutates these objects in place. */
const nodeCache = reactive(new Map<string, Map<string, MessageNode>>())
const loaded = ref(false)
/** Settings picked in the composer before the draft chat exists (e.g. the think toggle). */
const draftSettings = ref<GenerationSettings | undefined>()

const activeChat = computed(() => chats.value.find((c) => c.id === activeChatId.value) ?? null)

const activeIndex = computed<ThreadIndex>(() => {
  const nodes = nodeCache.get(activeChatId.value)
  return indexNodes(nodes ? nodes.values() : [])
})

const activeThread = computed(() => activePath(activeIndex.value, activeChat.value?.activeLeafId ?? null))

/** Model for the next message: the active chat's model, or the global pick for a draft. */
const activeModel = computed(() => activeChat.value?.model || currentModel.value)

type DeleteHook = (chatId: string | null) => void
const deleteHooks: DeleteHook[] = []
/** Called before a chat (or, with null, every chat) is deleted. Generation uses it to stop streams. */
function onBeforeDelete(hook: DeleteHook) {
  deleteHooks.push(hook)
}

async function init() {
  await repairInterrupted()
  const rows = await db.conversations.toArray()
  chats.value = rows
  if (activeChatId.value && !rows.some((c) => c.id === activeChatId.value)) activeChatId.value = ''
  if (activeChatId.value) await ensureNodes(activeChatId.value)
  loaded.value = true
}

/**
 * Replies still marked `streaming` at startup were cut off by a reload or closed tab. Mark them
 * aborted so they get their action bar back and can be regenerated.
 */
async function repairInterrupted() {
  const stuck = await db.nodes.filter((n) => n.status === 'streaming').toArray()
  if (!stuck.length) return
  for (const node of stuck) {
    node.status = 'aborted'
    for (const part of node.parts) {
      if (part.type === 'reasoning' && part.durationMs === undefined) {
        part.durationMs = 0
        delete part.startedAt
      }
    }
  }
  await db.nodes.bulkPut(stuck)
}

async function ensureNodes(chatId: string) {
  if (nodeCache.has(chatId)) return nodeCache.get(chatId)!
  const rows = await db.nodes.where('chatId').equals(chatId).toArray()
  nodeCache.set(chatId, new Map(rows.map((n) => [n.id, n])))
  return nodeCache.get(chatId)!
}

function getChat(chatId: string) {
  return chats.value.find((c) => c.id === chatId)
}

function chatIndex(chatId: string): ThreadIndex {
  const nodes = nodeCache.get(chatId)
  return indexNodes(nodes ? nodes.values() : [])
}

/** Root-to-leaf path currently shown for a chat. */
function chatPath(chatId: string) {
  return activePath(chatIndex(chatId), getChat(chatId)?.activeLeafId ?? null)
}

/** Live (reactive) node from the cache. */
function getNode(chatId: string, nodeId: string) {
  return nodeCache.get(chatId)?.get(nodeId)
}

async function openChat(chatId: string) {
  await ensureNodes(chatId)
  draftSettings.value = undefined
  activeChatId.value = chatId
  const chat = getChat(chatId)
  if (chat?.model) currentModel.value = chat.model
}

function newChat() {
  if (activeChatId.value) draftSettings.value = undefined
  activeChatId.value = ''
}

async function createChat(model: string, title = 'New chat'): Promise<Chat> {
  const now = new Date()
  const chat: Chat = {
    id: crypto.randomUUID(),
    title,
    model,
    createdAt: now,
    updatedAt: now,
    activeLeafId: null,
  }
  if (draftSettings.value) chat.settings = plain(draftSettings.value)
  draftSettings.value = undefined
  await db.conversations.add(chat)
  nodeCache.set(chat.id, new Map())
  chats.value.push(chat)
  activeChatId.value = chat.id
  return getChat(chat.id)!
}

async function updateChat(chatId: string, changes: Partial<Omit<Chat, 'id'>>) {
  const chat = getChat(chatId)
  if (!chat) return
  Object.assign(chat, changes)
  await db.conversations.put(plain(chat))
}

const renameChat = (chatId: string, title: string) =>
  updateChat(chatId, { title: title.trim() || 'Untitled', titleGenerated: true })

async function togglePin(chatId: string) {
  const chat = getChat(chatId)
  if (chat) await updateChat(chatId, { pinned: !chat.pinned || undefined, archived: undefined })
}

async function toggleArchive(chatId: string) {
  const chat = getChat(chatId)
  if (!chat) return
  await updateChat(chatId, { archived: !chat.archived || undefined, pinned: undefined })
  if (chat.archived && activeChatId.value === chatId) newChat()
}

// In-memory state goes first: a generation that is finishing checks getChat() before saving,
// so it can't write rows back after the database delete.
async function deleteChat(chatId: string) {
  for (const hook of deleteHooks) hook(chatId)
  chats.value = chats.value.filter((c) => c.id !== chatId)
  nodeCache.delete(chatId)
  if (activeChatId.value === chatId) newChat()
  await db.transaction('rw', db.conversations, db.nodes, async () => {
    await db.nodes.where('chatId').equals(chatId).delete()
    await db.conversations.delete(chatId)
  })
}

async function deleteAllChats() {
  for (const hook of deleteHooks) hook(null)
  chats.value = []
  nodeCache.clear()
  newChat()
  await db.transaction('rw', db.conversations, db.nodes, async () => {
    await db.nodes.clear()
    await db.conversations.clear()
  })
}

async function setModel(model: string) {
  currentModel.value = model
  if (activeChat.value) await updateChat(activeChat.value.id, { model })
}

async function setChatSettings(chatId: string, settings: GenerationSettings | undefined) {
  await updateChat(chatId, { settings })
}

async function setLeaf(chatId: string, leafId: string | null) {
  await updateChat(chatId, { activeLeafId: leafId })
}

/** Adds a node to cache and DB and returns the reactive cached copy. */
async function addNode(node: MessageNode): Promise<MessageNode> {
  const nodes = await ensureNodes(node.chatId)
  nodes.set(node.id, node)
  await db.nodes.add(plain(node))
  return nodes.get(node.id)!
}

async function saveNode(node: MessageNode) {
  await db.nodes.put(plain(node))
}

/** Deletes a node and its descendants, moving the leaf to a surviving branch. */
async function deleteBranch(chatId: string, nodeId: string) {
  const index = chatIndex(chatId)
  const node = index.byId.get(nodeId)
  if (!node) return
  const ids = subtreeIds(index, nodeId)
  await db.nodes.bulkDelete(ids)
  const nodes = nodeCache.get(chatId)
  for (const id of ids) nodes?.delete(id)
  await setLeaf(chatId, newestLeaf(chatIndex(chatId), node.parentId))
}

/** Copies the path up to `nodeId` into a new chat (ChatGPT's "Branch in new chat"). */
/** Settings for the active chat, or the draft's pending settings. */
async function setActiveSettings(settings: GenerationSettings | undefined) {
  if (activeChat.value) await setChatSettings(activeChat.value.id, settings)
  else draftSettings.value = settings
}

async function branchToNewChat(chatId: string, nodeId: string) {
  const source = getChat(chatId)
  if (!source) return
  const path = activePath(chatIndex(chatId), nodeId)
  const pending = draftSettings.value
  draftSettings.value = undefined
  const chat = await createChat(source.model, `${source.title} (branch)`)
  draftSettings.value = pending
  let parentId: string | null = null
  const nodes = path.map((n) => {
    const copy: MessageNode = { ...plain(n), id: crypto.randomUUID(), chatId: chat.id, parentId }
    parentId = copy.id
    return copy
  })
  await db.nodes.bulkAdd(nodes)
  nodeCache.set(chat.id, new Map(nodes.map((n) => [n.id, n])))
  await updateChat(chat.id, {
    activeLeafId: parentId,
    settings: source.settings ? plain(source.settings) : undefined,
    titleGenerated: true,
    updatedAt: new Date(),
  })
  await openChat(chat.id)
}

export interface SearchHit {
  chatId: string
  nodeId: string
  title: string
  snippet: string
}

/** Full-text search across message text. Scans the table; fine for local-sized histories. */
async function searchMessages(query: string, limit = 30): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: SearchHit[] = []
  await db.nodes
    .filter((n) => textOf(n.parts).toLowerCase().includes(q))
    .until(() => hits.length >= limit)
    .each((n) => {
      const chat = getChat(n.chatId)
      if (!chat) return
      hits.push({ chatId: n.chatId, nodeId: n.id, title: chat.title, snippet: snippet(textOf(n.parts), q) })
    })
  return hits
}

function snippet(text: string, q: string, radius = 60) {
  const at = text.toLowerCase().indexOf(q)
  const start = Math.max(0, at - radius)
  const end = Math.min(text.length, at + q.length + radius)
  return (start ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '')
}

/** Opens a chat with the branch containing `nodeId` visible. */
async function revealNode(chatId: string, nodeId: string) {
  await openChat(chatId)
  await setLeaf(chatId, newestLeaf(chatIndex(chatId), nodeId))
}

export function useChats() {
  return {
    chats,
    loaded,
    activeChatId,
    activeChat,
    activeIndex,
    activeThread,
    activeModel,
    draftSettings,
    setActiveSettings,
    init,
    onBeforeDelete,
    activePath: chatPath,
    ensureNodes,
    getChat,
    getNode,
    chatIndex,
    openChat,
    newChat,
    createChat,
    updateChat,
    renameChat,
    togglePin,
    toggleArchive,
    deleteChat,
    deleteAllChats,
    setModel,
    setChatSettings,
    setLeaf,
    addNode,
    saveNode,
    deleteBranch,
    branchToNewChat,
    searchMessages,
    revealNode,
  }
}
