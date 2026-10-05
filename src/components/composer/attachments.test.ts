import { describe, expect, it } from 'vitest'
import { isTextFile, MAX_TEXT_BYTES, readAttachment } from './attachments'

describe('attachments', () => {
  it('reads text files as base64 file parts', async () => {
    const part = await readAttachment(new File(['hello'], 'notes.md', { type: '' }))
    expect(part).toEqual({ type: 'file', mediaType: 'text/plain', name: 'notes.md', data: btoa('hello') })
  })

  it('recognises code files by extension', () => {
    expect(isTextFile(new File([''], 'main.go'))).toBe(true)
    expect(isTextFile(new File([''], 'archive.zip', { type: 'application/zip' }))).toBe(false)
  })

  it('rejects unsupported and oversized files with a reason', async () => {
    expect(await readAttachment(new File(['x'], 'a.zip', { type: 'application/zip' }))).toMatch('unsupported')
    const big = new File([new Uint8Array(MAX_TEXT_BYTES + 1)], 'big.txt', { type: 'text/plain' })
    expect(await readAttachment(big)).toMatch('larger than 1 MB')
  })
})
