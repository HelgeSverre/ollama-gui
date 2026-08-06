import { ref } from 'vue'
import { Message } from './database'
import { getOllama } from './api'

export const activeStream = ref<{ abort(): void } | null>(null)

export async function streamResponse(
  model: string,
  messages: Message[],
  system: Message | undefined,
  historyLength: number | undefined,
  onMessage: (content: string) => void,
  onDone: (meta: {
    total_duration: number
    eval_count: number
    prompt_eval_count: number
  }) => void,
): Promise<void> {
  let chatHistory = messages.slice(-(historyLength ?? 0))
  if (system) chatHistory.unshift(system)

  const stream = await getOllama().chat({
    model,
    messages: chatHistory.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  })
  activeStream.value = stream

  try {
    for await (const chunk of stream) {
      if (!chunk.done) {
        onMessage(chunk.message.content)
      } else {
        onDone({
          total_duration: chunk.total_duration ?? 0,
          eval_count: chunk.eval_count ?? 0,
          prompt_eval_count: chunk.prompt_eval_count ?? 0,
        })
      }
    }
  } finally {
    activeStream.value = null
  }
}
