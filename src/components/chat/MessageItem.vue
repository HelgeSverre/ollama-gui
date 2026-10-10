<script setup lang="ts">
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconGitBranch,
  IconPencil,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import { formatDuration } from '../../domain/format'
import { filesOf, textOf } from '../../domain/parts'
import { siblings, switchSibling, type ThreadIndex } from '../../domain/thread'
import type { MessageNode } from '../../domain/types'
import { useChats } from '../../composables/useChats'
import { copyText } from '../../composables/useClipboard'
import { confirmAction } from '../../composables/useConfirm'
import { toast } from '../../composables/useToasts'
import { useGeneration } from '../../composables/useGeneration'
import { avatarUrl, enableMarkdown, locale } from '../../composables/useSettings'
import { editingNodeId } from '../../composables/useUi'
import ActionButton from './ActionButton.vue'
import Attachments from './parts/Attachments.vue'
import BranchNav from './BranchNav.vue'
import Markdown from './Markdown.vue'
import ReasoningBlock from './parts/ReasoningBlock.vue'
import ToolCallCard from './parts/ToolCallCard.vue'

const props = defineProps<{ node: MessageNode; index: ThreadIndex; isLast: boolean }>()

const chats = useChats()
const generation = useGeneration()

const streaming = computed(() => props.node.status === 'streaming')
const busy = computed(() => generation.isGenerating(props.node.chatId))
const text = computed(() => textOf(props.node.parts))
const files = computed(() => filesOf(props.node.parts))
const sibling = computed(() => siblings(props.index, props.node))
const lastPart = computed(() => props.node.parts.at(-1))
const waiting = computed(() => streaming.value && !props.node.parts.length)

const stats = computed(() => {
  const meta = props.node.meta
  if (!meta || props.node.role !== 'assistant') return null
  const bits: string[] = []
  if (meta.model) bits.push(meta.model)
  if (meta.evalTokens && meta.evalMs) {
    const rate = meta.evalTokens / (meta.evalMs / 1000)
    bits.push(
      `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(rate)} tok/s`,
    )
  }
  if (meta.evalTokens) bits.push(`${meta.evalTokens} tokens`)
  if (meta.totalMs) bits.push(formatDuration(meta.totalMs))
  return bits.join(' · ')
})

const copied = ref(false)
async function copy() {
  if (!(await copyText(text.value))) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function step(offset: number) {
  const leaf = switchSibling(props.index, props.node, offset)
  if (leaf) void chats.setLeaf(props.node.chatId, leaf)
}

const regenerate = () => generation.regenerate(props.node.chatId, props.node.id)
const branch = () => chats.branchToNewChat(props.node.chatId, props.node.id)

async function remove() {
  const ok = await confirmAction({
    title: 'Delete this message?',
    message: 'The message and every reply below it on this branch will be deleted.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (ok) await chats.deleteBranch(props.node.chatId, props.node.id)
}

// Inline edit of user messages
const editing = computed(() => editingNodeId.value === props.node.id)
const { textarea, input: draft } = useTextareaAutosize()
watch(editing, async (value) => {
  if (!value) return
  draft.value = text.value
  await nextTick()
  textarea.value?.focus()
  textarea.value?.setSelectionRange(draft.value.length, draft.value.length)
})
function startEdit() {
  editingNodeId.value = props.node.id
}
function cancelEdit() {
  editingNodeId.value = null
}
async function submitEdit() {
  const value = draft.value.trim()
  if (!value) return
  if (value === text.value.trim()) {
    editingNodeId.value = null
    return
  }
  if (busy.value) {
    toast(
      'Wait for the current reply to finish, or stop it, before sending an edit',
      'error',
    )
    return
  }
  editingNodeId.value = null
  await generation.edit(props.node.chatId, props.node.id, value)
}
function onEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submitEdit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  }
}
</script>

<template>
  <!-- User -->
  <div
    v-if="node.role === 'user'"
    class="group flex flex-col items-end gap-1.5 py-3"
    data-testid="user-message"
  >
    <Attachments :files="files" />
    <div
      v-if="editing"
      class="border-accent bg-panel w-full max-w-[85%] rounded-2xl border p-2"
    >
      <textarea
        ref="textarea"
        v-model="draft"
        rows="1"
        class="text-text block max-h-[50vh] w-full resize-none bg-transparent px-1.5 py-1 text-[14px] leading-relaxed outline-none"
        data-testid="edit-textarea"
        @keydown="onEditKeydown"
      />
      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="hover:bg-hover text-text-secondary rounded-md px-3 py-1 text-[12.5px]"
          @click="cancelEdit"
        >
          Cancel
        </button>
        <button
          type="button"
          class="bg-accent rounded-md px-3 py-1 text-[12.5px] font-semibold text-white hover:opacity-90"
          data-testid="edit-submit"
          @click="submitEdit"
        >
          Send
        </button>
      </div>
    </div>
    <div
      v-else-if="text"
      class="bg-sel text-text max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap"
    >
      {{ text }}
    </div>
    <div
      v-if="!editing"
      class="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
    >
      <img v-if="avatarUrl" :src="avatarUrl" alt="" class="mr-1 h-5 w-5 rounded-full" />
      <BranchNav
        :index="sibling.index"
        :count="sibling.count"
        :disabled="busy"
        @step="step"
      />
      <ActionButton
        :icon="copied ? IconCheck : IconCopy"
        :label="copied ? 'Copied' : 'Copy'"
        @click="copy"
      />
      <ActionButton
        :icon="IconPencil"
        label="Edit"
        :disabled="busy"
        data-testid="edit-btn"
        @click="startEdit"
      />
    </div>
  </div>

  <!-- System -->
  <div
    v-else-if="node.role === 'system'"
    class="border-border bg-list my-2 rounded-lg border px-3 py-2"
  >
    <div class="text-text-muted mb-1 text-[11px] font-semibold tracking-wide uppercase">
      System
    </div>
    <div class="text-text-secondary text-[12.5px] whitespace-pre-wrap">
      {{ text }}
    </div>
  </div>

  <!-- Assistant / tool -->
  <div v-else class="group py-3" data-testid="ai-message" :data-status="node.status">
    <div v-if="waiting" class="shimmer text-[13px]">Thinking…</div>
    <template v-for="(part, i) in node.parts" :key="i">
      <ReasoningBlock
        v-if="part.type === 'reasoning'"
        :part="part"
        :streaming="streaming"
      />
      <template v-else-if="part.type === 'text'">
        <Markdown
          v-if="enableMarkdown"
          class="text-text text-[14px] leading-relaxed"
          :source="part.text"
          :streaming="streaming"
        />
        <div v-else class="text-text text-[14px] leading-relaxed whitespace-pre-wrap">
          {{ part.text }}
        </div>
      </template>
      <ToolCallCard v-else-if="part.type === 'tool-call'" :part="part" />
      <div
        v-else-if="part.type === 'error'"
        class="border-red/40 bg-red/10 text-text my-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px]"
        data-testid="message-error"
      >
        <IconAlertTriangle :size="15" class="text-red mt-px flex-none" />
        <span class="min-w-0 flex-1 break-words">{{ part.message }}</span>
        <button
          type="button"
          class="text-accent flex-none font-semibold hover:underline"
          :disabled="busy"
          @click="regenerate"
        >
          Retry
        </button>
      </div>
    </template>
    <span v-if="streaming && lastPart?.type === 'text'" class="typing-cursor" />
    <div
      v-if="node.status === 'aborted'"
      class="text-text-muted mt-1 text-[11.5px] italic"
    >
      Stopped
    </div>

    <div
      v-if="!streaming"
      class="mt-1 -ml-1.5 flex items-center gap-0.5 transition-opacity"
      :class="
        isLast ? '' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
      "
    >
      <ActionButton
        :icon="copied ? IconCheck : IconCopy"
        :label="copied ? 'Copied' : 'Copy'"
        :disabled="!text"
        data-testid="copy-btn"
        @click="copy"
      />
      <ActionButton
        :icon="IconRefresh"
        label="Regenerate"
        :disabled="busy"
        data-testid="regenerate-btn"
        @click="regenerate"
      />
      <ActionButton :icon="IconGitBranch" label="Branch in new chat" @click="branch" />
      <ActionButton :icon="IconTrash" label="Delete" :disabled="busy" @click="remove" />
      <BranchNav
        :index="sibling.index"
        :count="sibling.count"
        :disabled="busy"
        @step="step"
      />
      <span
        v-if="stats"
        class="text-text-muted ml-2 truncate text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
        data-testid="message-stats"
      >
        {{ stats }}
      </span>
    </div>
  </div>
</template>
