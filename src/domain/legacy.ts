import { partsFromLegacyContent } from './parts'
import type { Chat, MessageNode } from './types'
import { uuid } from './uuid'

/** Chat and message shape from v1 / v2.0 (flat list, numeric ids, `content` strings). */
export interface LegacyChat {
  id?: number
  name?: string
  model?: string
  createdAt?: Date | string
  pinned?: boolean
  archived?: boolean
}

export interface LegacyMessage {
  id?: number
  role?: string
  content?: string
  meta?: { total_duration?: number; eval_count?: number; prompt_eval_count?: number }
  createdAt?: Date | string
}

/**
 * Converts a flat legacy chat into a linear message tree. A leading run of system messages
 * becomes the chat's system prompt.
 */
export function convertLegacyChat(
  old: LegacyChat,
  messages: LegacyMessage[],
): { chat: Chat; nodes: MessageNode[] } {
  const chatId = uuid()
  const model = String(old.model ?? '')
  const sorted = [...messages].sort(
    (a, b) =>
      toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime() ||
      (a.id ?? 0) - (b.id ?? 0),
  )
  const createdAt = toDate(old.createdAt ?? sorted[0]?.createdAt)

  const leadingSystem: string[] = []
  while (sorted[0]?.role === 'system')
    leadingSystem.push(String(sorted.shift()!.content ?? ''))

  const nodes: MessageNode[] = []
  let parentId: string | null = null
  for (const m of sorted) {
    if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') continue
    const content = String(m.content ?? '')
    const node: MessageNode = {
      id: uuid(),
      chatId,
      parentId,
      role: m.role,
      parts:
        m.role === 'system'
          ? [{ type: 'text', text: content }]
          : partsFromLegacyContent(content),
      status: 'done',
      createdAt: toDate(m.createdAt),
    }
    if (m.role === 'assistant') {
      node.meta = {
        model,
        totalMs: m.meta?.total_duration ? m.meta.total_duration / 1e6 : undefined,
        evalTokens: m.meta?.eval_count,
        promptTokens: m.meta?.prompt_eval_count,
      }
    }
    nodes.push(node)
    parentId = node.id
  }

  const systemPrompt = leadingSystem.join('\n\n').trim()
  const title = String(old.name ?? '').trim() || 'New chat'
  const chat: Chat = {
    id: chatId,
    title,
    model,
    createdAt,
    updatedAt: nodes.at(-1)?.createdAt ?? createdAt,
    activeLeafId: parentId,
    titleGenerated: title !== 'New chat',
  }
  if (old.pinned) chat.pinned = true
  if (old.archived) chat.archived = true
  if (systemPrompt) chat.settings = { systemPrompt }
  return { chat, nodes }
}

export function toDate(value: unknown): Date {
  const d = value instanceof Date ? value : new Date(value as string)
  return Number.isNaN(d.getTime()) ? new Date() : d
}
