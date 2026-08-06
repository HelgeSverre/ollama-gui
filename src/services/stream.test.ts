import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const getOllamaMock = vi.fn()
vi.mock('./api', () => ({
  getOllama: () => ({ chat: getOllamaMock, list: getOllamaMock }),
}))

describe('streamResponse', () => {
  let streamResponse: Function
  let activeStream: ReturnType<typeof ref<{ abort(): void } | null>>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('./stream')
    streamResponse = mod.streamResponse
    activeStream = mod.activeStream
    activeStream.value = null
  })

  it('streams partial chunks via onMessage', async () => {
    let messageContent = ''
    const onMessage = vi.fn((content: string) => {
      messageContent += content
    })
    const onDone = vi.fn()

    async function* mockStream() {
      yield {
        done: false,
        message: { content: 'Hello' },
        total_duration: 0,
        eval_count: 0,
        prompt_eval_count: 0,
      }
      yield {
        done: false,
        message: { content: ' world' },
        total_duration: 0,
        eval_count: 0,
        prompt_eval_count: 0,
      }
      yield {
        done: true,
        message: { content: '' },
        total_duration: 500,
        eval_count: 10,
        prompt_eval_count: 5,
      }
    }

    getOllamaMock.mockResolvedValue(mockStream())

    await streamResponse(
      'llama2',
      [{ role: 'user', content: 'hi', createdAt: new Date(), chatId: 1 } as any],
      undefined,
      10,
      onMessage,
      onDone,
    )

    expect(getOllamaMock).toHaveBeenCalledWith({
      model: 'llama2',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    })
    expect(onMessage).toHaveBeenCalledTimes(2)
    expect(onMessage).toHaveBeenCalledWith('Hello')
    expect(onMessage).toHaveBeenCalledWith(' world')

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith({
      total_duration: 500,
      eval_count: 10,
      prompt_eval_count: 5,
    })
  })

  it('truncates message history to historyLength', async () => {
    const onMessage = vi.fn()
    const onDone = vi.fn()

    async function* mockStream() {
      yield {
        done: true,
        message: { content: '' },
        total_duration: 0,
        eval_count: 0,
        prompt_eval_count: 0,
      }
    }
    getOllamaMock.mockResolvedValue(mockStream())

    const messages = [
      { role: 'user', content: 'old1', createdAt: new Date(), chatId: 1 } as any,
      { role: 'user', content: 'old2', createdAt: new Date(), chatId: 1 } as any,
      { role: 'user', content: 'new1', createdAt: new Date(), chatId: 1 } as any,
      { role: 'user', content: 'new2', createdAt: new Date(), chatId: 1 } as any,
    ]

    await streamResponse('llama2', messages, undefined, 2, onMessage, onDone)

    const sent = getOllamaMock.mock.calls[0][0].messages
    expect(sent).toHaveLength(2)
    expect(sent[0].content).toBe('new1')
  })

  it('prepends system message when provided', async () => {
    const onMessage = vi.fn()
    const onDone = vi.fn()

    async function* mockStream() {
      yield {
        done: true,
        message: { content: '' },
        total_duration: 0,
        eval_count: 0,
        prompt_eval_count: 0,
      }
    }
    getOllamaMock.mockResolvedValue(mockStream())

    const system = {
      role: 'system',
      content: 'Be helpful',
      createdAt: new Date(),
      chatId: 1,
    } as any

    await streamResponse(
      'llama2',
      [{ role: 'user', content: 'hi', createdAt: new Date(), chatId: 1 } as any],
      system,
      10,
      onMessage,
      onDone,
    )

    const sent = getOllamaMock.mock.calls[0][0].messages
    expect(sent[0].role).toBe('system')
  })

  it('cleans up activeStream after completion', async () => {
    async function* mockStream() {
      yield {
        done: true,
        message: { content: '' },
        total_duration: 0,
        eval_count: 0,
        prompt_eval_count: 0,
      }
    }
    getOllamaMock.mockResolvedValue(mockStream())

    await streamResponse('llama2', [], undefined, 10, vi.fn(), vi.fn())

    expect(activeStream.value).toBeNull()
  })

  it('cleans up activeStream on error', async () => {
    async function* mockStream() {
      throw new Error('Stream failed')
    }
    getOllamaMock.mockResolvedValue(mockStream())

    await expect(
      streamResponse('llama2', [], undefined, 10, vi.fn(), vi.fn()),
    ).rejects.toThrow('Stream failed')

    expect(activeStream.value).toBeNull()
  })
})
