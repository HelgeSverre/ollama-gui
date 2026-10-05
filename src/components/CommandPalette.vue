<script setup lang="ts">
import {
  IconAdjustmentsHorizontal,
  IconBox,
  IconMessage,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
} from '@tabler/icons-vue'
import { watchDebounced } from '@vueuse/core'
import { computed, nextTick, ref, watch, type Component } from 'vue'
import { useChats, type SearchHit } from '../composables/useChats'
import { isDark, theme } from '../composables/useSettings'
import { chatSettingsOpen, closeModal, modal, openModal } from '../composables/useUi'
import Modal from './ui/Modal.vue'

interface Item {
  id: string
  label: string
  detail?: string
  icon: Component
  section: 'Actions' | 'Chats' | 'Messages'
  run(): void
}

const chats = useChats()
const open = computed(() => modal.value === 'palette')
const query = ref('')
const selected = ref(0)
const hits = ref<SearchHit[]>([])
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()

watch(open, async (value) => {
  if (!value) return
  query.value = ''
  hits.value = []
  await nextTick()
  input.value?.focus()
})

watchDebounced(
  query,
  async (q) => {
    hits.value = await chats.searchMessages(q, 20)
  },
  { debounce: 150 },
)

const actions: Omit<Item, 'section'>[] = [
  { id: 'new', label: 'New chat', icon: IconPlus, run: () => chats.newChat() },
  { id: 'models', label: 'Manage models', icon: IconBox, run: () => openModal('models') },
  { id: 'settings', label: 'Settings', icon: IconSettings, run: () => openModal('settings') },
  { id: 'chat-settings', label: 'Chat settings and system prompt', icon: IconAdjustmentsHorizontal, run: () => (chatSettingsOpen.value = true) },
  {
    id: 'theme',
    label: 'Toggle light / dark theme',
    icon: IconMoon,
    run: () => (theme.value = isDark.value ? 'light' : 'dark'),
  },
]

const items = computed<Item[]>(() => {
  const q = query.value.trim().toLowerCase()
  const out: Item[] = actions
    .filter((a) => !q || a.label.toLowerCase().includes(q))
    .map((a) => ({ ...a, icon: a.id === 'theme' && isDark.value ? IconSun : a.icon, section: 'Actions' }))
  const titled = chats.chats.value
    .filter((c) => !q || c.title.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, q ? 20 : 8)
  for (const chat of titled) {
    out.push({ id: `chat-${chat.id}`, label: chat.title, detail: chat.model, icon: IconMessage, section: 'Chats', run: () => chats.openChat(chat.id) })
  }
  for (const hit of hits.value) {
    out.push({
      id: `hit-${hit.nodeId}`,
      label: hit.title,
      detail: hit.snippet,
      icon: IconSearch,
      section: 'Messages',
      run: () => chats.revealNode(hit.chatId, hit.nodeId),
    })
  }
  return out
})

watch(items, () => (selected.value = 0))

function run(item: Item | undefined) {
  if (!item) return
  closeModal()
  item.run()
}

async function move(delta: number) {
  if (!items.value.length) return
  selected.value = (selected.value + delta + items.value.length) % items.value.length
  await nextTick()
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    void move(-1)
  } else if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    run(items.value[selected.value])
  }
}

const sectionStart = (i: number) => i === 0 || items.value[i - 1].section !== items.value[i].section
</script>

<template>
  <Modal
    :open="open"
    width="580px"
    @close="closeModal('palette')"
  >
    <div data-testid="command-palette">
      <div class="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <IconSearch
          :size="17"
          class="text-text-muted flex-none"
        />
        <input
          ref="input"
          v-model="query"
          type="text"
          placeholder="Search chats, messages and commands…"
          class="text-text placeholder:text-text-muted min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          @keydown="onKeydown"
        >
      </div>
      <div
        id="palette-list"
        ref="list"
        role="listbox"
        class="max-h-[55vh] overflow-y-auto p-1.5"
      >
        <p
          v-if="!items.length"
          class="text-text-muted px-3 py-6 text-center text-[12.5px]"
        >
          No results
        </p>
        <template
          v-for="(item, i) in items"
          :key="item.id"
        >
          <div
            v-if="sectionStart(i)"
            class="text-text-muted px-2.5 pt-2 pb-1 text-[11px] font-semibold"
          >
            {{ item.section }}
          </div>
          <div
            role="option"
            :aria-selected="i === selected"
            class="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2"
            :class="i === selected ? 'bg-sel' : ''"
            @click="run(item)"
            @mousemove="selected = i"
          >
            <component
              :is="item.icon"
              :size="16"
              class="text-text-muted flex-none"
            />
            <span class="min-w-0 flex-1">
              <span class="text-text block truncate text-[13px]">{{ item.label }}</span>
              <span
                v-if="item.detail"
                class="text-text-muted block truncate text-[11.5px]"
              >{{ item.detail }}</span>
            </span>
          </div>
        </template>
      </div>
      <div class="border-border text-text-muted flex gap-4 border-t px-4 py-2 text-[11px]">
        <span>↑↓ navigate</span>
        <span>↵ open</span>
        <span>esc close</span>
      </div>
    </div>
  </Modal>
</template>
