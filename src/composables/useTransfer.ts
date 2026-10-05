import { db } from '../db/schema'
import {
  convertLegacyChat,
  toDate,
  type LegacyChat,
  type LegacyMessage,
} from '../domain/legacy'
import { textOf } from '../domain/parts'
import { activePath, indexNodes } from '../domain/thread'
import type { Chat, MessageNode, Part } from '../domain/types'
import { useChats } from './useChats'

const FORMAT = 'ollama-gui'
const VERSION = 2

interface ExportFile {
  format: typeof FORMAT
  version: number
  exportedAt: string
  chats: (Chat & { nodes: MessageNode[] })[]
}

export async function exportAll(): Promise<ExportFile> {
  const chats = await db.conversations.orderBy('updatedAt').reverse().toArray()
  const nodes = await db.nodes.toArray()
  const byChat = new Map<string, MessageNode[]>()
  for (const node of nodes) {
    const list = byChat.get(node.chatId)
    if (list) list.push(node)
    else byChat.set(node.chatId, [node])
  }
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    chats: chats.map((chat) => ({ ...chat, nodes: byChat.get(chat.id) ?? [] })),
  }
}

/** Imports a v2 export or a v1 array of `{ name, model, messages[] }`. Returns the count imported. */
export async function importData(data: unknown): Promise<number> {
  const chats = useChats()
  const converted: { chat: Chat; nodes: MessageNode[] }[] = []

  if (Array.isArray(data)) {
    for (const legacy of data as (LegacyChat & { messages?: LegacyMessage[] })[]) {
      if (!legacy || typeof legacy !== 'object') continue
      converted.push(
        convertLegacyChat(legacy, Array.isArray(legacy.messages) ? legacy.messages : []),
      )
    }
  } else if (isExportFile(data)) {
    for (const entry of data.chats) {
      if (entry && typeof entry === 'object') converted.push(reId(entry))
    }
  } else {
    throw new Error('Unrecognised file. Expected an Ollama GUI export.')
  }
  if (!converted.length) throw new Error('The file contains no chats.')

  await db.transaction('rw', db.conversations, db.nodes, async () => {
    await db.conversations.bulkAdd(converted.map((c) => c.chat))
    await db.nodes.bulkAdd(converted.flatMap((c) => c.nodes))
  })
  await chats.init()
  return converted.length
}

function isExportFile(data: unknown): data is ExportFile {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as ExportFile).format === FORMAT &&
    Array.isArray((data as ExportFile).chats)
  )
}

/** Fresh ids so importing the same file twice never collides. */
function reId(entry: Chat & { nodes?: MessageNode[] }): {
  chat: Chat
  nodes: MessageNode[]
} {
  const chatId = crypto.randomUUID()
  const ids = new Map<string, string>()
  const source = (Array.isArray(entry.nodes) ? entry.nodes : []).filter(
    (node): node is MessageNode =>
      !!node &&
      typeof node === 'object' &&
      typeof node.id === 'string' &&
      ROLES.includes(node.role),
  )
  for (const node of source) ids.set(node.id, crypto.randomUUID())
  const nodes = source.map((node): MessageNode => ({
    id: ids.get(node.id)!,
    chatId,
    parentId: node.parentId ? (ids.get(node.parentId) ?? null) : null,
    role: node.role,
    parts: (Array.isArray(node.parts) ? node.parts : [])
      .map(normalizePart)
      .filter((p): p is Part => !!p),
    // A reply that was streaming when exported is incomplete
    status:
      STATUSES.includes(node.status) && node.status !== 'streaming'
        ? node.status
        : 'aborted',
    meta: node.meta && typeof node.meta === 'object' ? node.meta : undefined,
    createdAt: toDate(node.createdAt),
  }))
  const rest: Partial<Chat> & { nodes?: unknown } = { ...entry }
  delete rest.nodes
  const chat: Chat = {
    ...rest,
    id: chatId,
    title: String(rest.title ?? 'Imported chat'),
    model: String(rest.model ?? ''),
    createdAt: toDate(rest.createdAt),
    updatedAt: toDate(rest.updatedAt ?? rest.createdAt),
    activeLeafId: rest.activeLeafId ? (ids.get(rest.activeLeafId) ?? null) : null,
  }
  return { chat, nodes }
}

const ROLES: MessageNode['role'][] = ['user', 'assistant', 'system', 'tool']
const STATUSES: MessageNode['status'][] = ['streaming', 'done', 'aborted', 'error']

/** Keeps only well-formed parts, so a hand-edited or corrupted file can't break rendering. */
function normalizePart(raw: unknown): Part | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  switch (p.type) {
    case 'text':
      return { type: 'text', text: str(p.text) }
    case 'reasoning':
      return {
        type: 'reasoning',
        text: str(p.text),
        durationMs: typeof p.durationMs === 'number' ? p.durationMs : 0,
      }
    case 'file':
      return typeof p.data === 'string'
        ? {
            type: 'file',
            mediaType: str(p.mediaType) || 'application/octet-stream',
            name: str(p.name) || 'file',
            data: p.data,
          }
        : null
    case 'tool-call':
      return {
        type: 'tool-call',
        name: str(p.name),
        args: p.args,
        result: p.result,
        state: p.state === 'error' ? 'error' : 'done',
      }
    case 'error':
      return { type: 'error', message: str(p.message) }
    default:
      return null
  }
}

/** Markdown of the visible branch of a chat. */
export async function chatToMarkdown(chatId: string): Promise<string> {
  const chats = useChats()
  const chat = chats.getChat(chatId)
  if (!chat) return ''
  const nodes = await chats.ensureNodes(chatId)
  const path = activePath(indexNodes(nodes.values()), chat.activeLeafId)
  const lines = [
    `# ${chat.title}`,
    '',
    `Model: \`${chat.model}\` · ${chat.createdAt.toISOString().slice(0, 10)}`,
    '',
  ]
  if (chat.settings?.systemPrompt)
    lines.push('**System**', '', chat.settings.systemPrompt, '')
  for (const node of path) {
    const label =
      node.role === 'user'
        ? 'You'
        : node.role === 'assistant'
          ? (node.meta?.model ?? 'Assistant')
          : 'System'
    lines.push('---', '', `**${label}**`, '', textOf(node.parts).trim(), '')
  }
  return lines.join('\n')
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFileName(title: string) {
  return (
    title
      .replace(/[^\p{L}\p{N}\- ]+/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'chat'
  )
}
