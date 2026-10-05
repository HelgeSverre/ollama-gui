import { describe, expect, it } from 'vitest'
import {
  activePath,
  indexNodes,
  newestLeaf,
  siblings,
  subtreeIds,
  switchSibling,
} from './thread'
import type { MessageNode } from './types'

let t = 0
const node = (
  id: string,
  parentId: string | null,
  role: MessageNode['role'] = 'user',
): MessageNode => ({
  id,
  chatId: 'c',
  parentId,
  role,
  parts: [{ type: 'text', text: id }],
  status: 'done',
  createdAt: new Date(++t * 1000),
})

// u1 → a1 → u2 → a2
//            ↘ a2b (regenerated)
//    ↘ a1b → u3 (branch after regenerating a1)
const nodes = [
  node('u1', null),
  node('a1', 'u1', 'assistant'),
  node('u2', 'a1'),
  node('a2', 'u2', 'assistant'),
  node('a1b', 'u1', 'assistant'),
  node('a2b', 'u2', 'assistant'),
  node('u3', 'a1b'),
]
const index = indexNodes(nodes)
const ids = (path: MessageNode[]) => path.map((n) => n.id)

describe('thread', () => {
  it('builds the path from root to leaf', () => {
    expect(ids(activePath(index, 'a2'))).toEqual(['u1', 'a1', 'u2', 'a2'])
  })

  it('falls back to the newest leaf for a null or unknown leaf', () => {
    expect(ids(activePath(index, null))).toEqual(['u1', 'a1b', 'u3'])
    expect(ids(activePath(index, 'missing'))).toEqual(['u1', 'a1b', 'u3'])
  })

  it('returns an empty path for an empty chat', () => {
    expect(activePath(indexNodes([]), null)).toEqual([])
  })

  it('reports sibling position', () => {
    expect(siblings(index, index.byId.get('a1')!)).toMatchObject({ index: 0, count: 2 })
    expect(siblings(index, index.byId.get('a2b')!)).toMatchObject({ index: 1, count: 2 })
    expect(siblings(index, index.byId.get('u1')!)).toMatchObject({ index: 0, count: 1 })
  })

  it('switches to a sibling and descends to its newest leaf', () => {
    expect(switchSibling(index, index.byId.get('a1')!, 1)).toBe('u3')
    expect(switchSibling(index, index.byId.get('a1b')!, -1)).toBe('a2b')
    expect(switchSibling(index, index.byId.get('a1')!, -1)).toBeNull()
  })

  it('finds the newest leaf below a node', () => {
    expect(newestLeaf(index, 'u2')).toBe('a2b')
  })

  it('collects a subtree', () => {
    expect(subtreeIds(index, 'a1').sort()).toEqual(['a1', 'a2', 'a2b', 'u2'])
  })

  it('survives a parent cycle', () => {
    const a = { ...node('x', 'y') }
    const b = { ...node('y', 'x') }
    expect(activePath(indexNodes([a, b]), 'x').length).toBe(2)
  })
})
