import { describe, it, expect, vi } from 'vitest'

const sortChats = (
  chats: { id: number; pinned?: boolean; archived?: boolean; createdAt: Date }[],
) => {
  return [...chats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.archived && !b.archived) return 1
    if (!a.archived && b.archived) return -1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

describe('chat sorting', () => {
  const base = { id: 1, createdAt: new Date('2024-01-01') }
  const newer = { id: 2, createdAt: new Date('2024-06-01') }
  const oldest = { id: 3, createdAt: new Date('2023-01-01') }
  const pinned = { id: 4, pinned: true, createdAt: new Date('2023-06-01') }
  const archived = { id: 5, archived: true, createdAt: new Date('2024-04-01') }
  const pinnedAndArchived = { id: 6, pinned: true, archived: true, createdAt: new Date('2024-03-01') }

  it('sorts by createdAt desc for normal chats', () => {
    const result = sortChats([base, newer])
    expect(result[0].id).toBe(2)
    expect(result[1].id).toBe(1)
  })

  it('pinned chats sort to the top', () => {
    const result = sortChats([base, pinned, newer])
    expect(result[0].id).toBe(4)
  })

  it('archived chats sort to the bottom', () => {
    const result = sortChats([base, archived, newer])
    expect(result[result.length - 1].id).toBe(5)
  })

  it('pinned + archived still sorts after pinned but before archived', () => {
    const result = sortChats([base, pinned, archived, pinnedAndArchived])
    const ids = result.map((c) => c.id)
    expect(ids.indexOf(4)).toBeLessThan(ids.indexOf(6))
    expect(ids.indexOf(6)).toBeLessThan(ids.indexOf(5))
  })

  it('handles empty array', () => {
    expect(sortChats([])).toEqual([])
  })
})
