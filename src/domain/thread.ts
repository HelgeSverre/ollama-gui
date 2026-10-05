import type { MessageNode } from './types'

/**
 * A chat is a tree of message nodes. The visible conversation is the path from a root
 * to the chat's active leaf; editing or regenerating adds a sibling and moves the leaf.
 */
export interface ThreadIndex {
  byId: Map<string, MessageNode>
  /** Children per parent id (null key = roots), oldest first. */
  children: Map<string | null, MessageNode[]>
}

export function indexNodes(nodes: Iterable<MessageNode>): ThreadIndex {
  const byId = new Map<string, MessageNode>()
  const children = new Map<string | null, MessageNode[]>()
  for (const node of nodes) {
    byId.set(node.id, node)
    const list = children.get(node.parentId)
    if (list) list.push(node)
    else children.set(node.parentId, [node])
  }
  for (const list of children.values()) list.sort(byCreatedAt)
  return { byId, children }
}

function byCreatedAt(a: MessageNode, b: MessageNode) {
  return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
}

/** Follows the newest child from `nodeId` down to a leaf. */
export function newestLeaf(index: ThreadIndex, nodeId: string | null): string | null {
  let current = nodeId
  for (;;) {
    const kids = index.children.get(current)
    if (!kids?.length) return current
    current = kids[kids.length - 1].id
  }
}

/** Root-to-leaf path. Falls back to the newest leaf when `leafId` is missing or unknown. */
export function activePath(index: ThreadIndex, leafId: string | null): MessageNode[] {
  let id = leafId && index.byId.has(leafId) ? leafId : newestLeaf(index, null)
  const path: MessageNode[] = []
  const seen = new Set<string>()
  while (id) {
    const node = index.byId.get(id)
    if (!node || seen.has(id)) break
    seen.add(id)
    path.push(node)
    id = node.parentId
  }
  return path.reverse()
}

export interface SiblingInfo {
  index: number
  count: number
  ids: string[]
}

export function siblings(index: ThreadIndex, node: MessageNode): SiblingInfo {
  const ids = (index.children.get(node.parentId) ?? []).map((n) => n.id)
  return { index: ids.indexOf(node.id), count: ids.length, ids }
}

/** Leaf to activate when the user steps from `node` to the sibling `offset` away. */
export function switchSibling(
  index: ThreadIndex,
  node: MessageNode,
  offset: number,
): string | null {
  const { ids, index: i } = siblings(index, node)
  const target = ids[i + offset]
  return target ? newestLeaf(index, target) : null
}

/** All node ids in the subtree rooted at `nodeId`, including it. */
export function subtreeIds(index: ThreadIndex, nodeId: string): string[] {
  const out: string[] = []
  const stack = [nodeId]
  while (stack.length) {
    const id = stack.pop()!
    out.push(id)
    for (const child of index.children.get(id) ?? []) stack.push(child.id)
  }
  return out
}
