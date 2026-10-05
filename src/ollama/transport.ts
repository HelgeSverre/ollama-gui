import type { ChatEvent } from '../domain/parts'
import { isImage, ThinkTagSplitter } from '../domain/parts'
import type { GenerationSettings, MessageNode, Part } from '../domain/types'
import { OllamaError, streamJson } from './client'
import type { ChatChunk, ChatRequest, WireMessage } from './types'

export interface ChatInput {
  model: string
  /** Root-to-parent path of the message being generated. */
  history: MessageNode[]
  settings: GenerationSettings
  /** Only send `think` to models that report the thinking capability; others reject it. */
  supportsThinking: boolean
}

export interface ChatStream {
  events: AsyncGenerator<ChatEvent>
  abort(): void
}

export function buildChatRequest(input: ChatInput): ChatRequest {
  const { settings } = input
  const messages: WireMessage[] = []
  if (settings.systemPrompt?.trim())
    messages.push({ role: 'system', content: settings.systemPrompt })
  for (const node of input.history) {
    const wire = toWireMessage(node)
    if (wire) messages.push(wire)
  }
  const request: ChatRequest = { model: input.model, messages, stream: true }
  if (input.supportsThinking && settings.think !== undefined)
    request.think = settings.think
  if (settings.keepAlive) request.keep_alive = settings.keepAlive
  if (settings.options && Object.keys(settings.options).length)
    request.options = { ...settings.options }
  return request
}

function toWireMessage(node: MessageNode): WireMessage | null {
  const text: string[] = []
  const images: string[] = []
  const toolCalls: WireMessage['tool_calls'] = []
  for (const part of node.parts) {
    if (part.type === 'text') text.push(part.text)
    else if (part.type === 'file') {
      if (isImage(part)) images.push(part.data)
      else text.push(fileAsText(part))
    } else if (part.type === 'tool-call') {
      toolCalls.push({
        function: {
          name: part.name,
          arguments: (part.args ?? {}) as Record<string, unknown>,
        },
      })
    }
  }
  const content = text.join('\n\n').trim()
  if (!content && !images.length && !toolCalls.length) return null
  const wire: WireMessage = { role: node.role, content }
  if (images.length) wire.images = images
  if (toolCalls.length) wire.tool_calls = toolCalls
  return wire
}

function fileAsText(part: Extract<Part, { type: 'file' }>): string {
  return `File: ${part.name}\n\`\`\`\n${decodeBase64(part.data)}\n\`\`\``
}

export function decodeBase64(data: string): string {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Starts a streamed chat. Pass a signal to tie it to an existing controller. */
export function startChat(input: ChatInput, signal?: AbortSignal): ChatStream {
  const controller = new AbortController()
  signal?.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  if (signal?.aborted) controller.abort(signal.reason)
  return {
    events: chatEvents(buildChatRequest(input), controller.signal),
    abort: () => controller.abort(),
  }
}

/** Maps Ollama chat chunks to provider-neutral events. */
export async function* chatEvents(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const splitter = new ThinkTagSplitter()
  let finished = false
  for await (const chunk of streamJson<ChatChunk>('chat', request, signal)) {
    const message = chunk.message
    if (message?.thinking) yield { type: 'reasoning', text: message.thinking }
    if (message?.content) yield* splitter.push(message.content)
    for (const call of message?.tool_calls ?? []) {
      yield { type: 'tool-call', name: call.function.name, args: call.function.arguments }
    }
    if (chunk.done) {
      finished = true
      yield* splitter.flush()
      yield {
        type: 'finish',
        meta: {
          model: chunk.model,
          promptTokens: chunk.prompt_eval_count,
          evalTokens: chunk.eval_count,
          totalMs: nsToMs(chunk.total_duration),
          evalMs: nsToMs(chunk.eval_duration),
          loadMs: nsToMs(chunk.load_duration),
          doneReason: chunk.done_reason,
        },
      }
    }
  }
  // A dropped connection ends the body without a final `done` chunk
  if (!finished)
    throw new OllamaError(
      'The response ended unexpectedly. Ollama may have stopped or the connection dropped.',
    )
}

const nsToMs = (ns?: number) => (ns === undefined ? undefined : ns / 1e6)
