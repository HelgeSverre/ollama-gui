<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useChats } from '../services/chat.ts'
import { useAI } from '../services/useAI.ts'
import { toggleSettingsPanel, toggleSystemPromptPanel } from '../services/appConfig.ts'
import { IconSearch, IconPlus, IconSettings, IconMessageCode } from '@tabler/icons-vue'
import { useFocusTrap } from '../services/useFocusTrap.ts'

const { sortedChats, switchChat, startNewChat } = useChats()
const { refreshModels } = useAI()

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()

const { activate: trapFocus, deactivate: releaseFocus } = useFocusTrap(panelRef)

watch(isOpen, (open) => {
  if (open) {
    trapFocus()
    setTimeout(() => inputRef.value?.focus(), 50)
  } else {
    releaseFocus()
  }
})

const actions = [
  {
    id: 'new-chat',
    label: 'New Chat',
    icon: IconPlus,
    action: () => {
      startNewChat('New chat')
      close()
    },
  },
  {
    id: 'refresh-models',
    label: 'Refresh Models',
    icon: IconSearch,
    action: () => {
      refreshModels()
      close()
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: IconSettings,
    action: () => {
      toggleSettingsPanel()
      close()
    },
  },
  {
    id: 'system-prompt',
    label: 'System Prompt',
    icon: IconMessageCode,
    action: () => {
      toggleSystemPromptPanel()
      close()
    },
  },
]

const filteredChats = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return sortedChats.value.slice(0, 10)
  return sortedChats.value.filter((c) => c.name.toLowerCase().includes(q))
})

const filteredActions = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return actions
  return actions.filter((a) => a.label.toLowerCase().includes(q))
})

const items = computed(() => {
  return [
    ...filteredActions.value.map((a, i) => ({ type: 'action' as const, ...a, index: i })),
    ...filteredChats.value.map((c, i) => ({
      type: 'chat' as const,
      ...c,
      index: filteredActions.value.length + i,
    })),
  ]
})

onKeyStroke('k', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return
    }
    e.preventDefault()
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      query.value = ''
      selectedIndex.value = 0
    }
  }
})

onKeyStroke('ArrowDown', (e) => {
  if (!isOpen.value || items.value.length === 0) return
  e.preventDefault()
  selectedIndex.value = Math.min(selectedIndex.value + 1, items.value.length - 1)
})

onKeyStroke('ArrowUp', (e) => {
  if (!isOpen.value) return
  e.preventDefault()
  selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
})

onKeyStroke('Enter', () => {
  if (!isOpen.value) return
  const item = items.value[selectedIndex.value]
  if (!item) return
  if (item.type === 'chat' && 'id' in item) {
    switchChat(item.id!)
  } else if (item.type === 'action' && 'action' in item) {
    item.action()
  }
  close()
})

onKeyStroke('Escape', () => {
  if (isOpen.value) close()
})

onClickOutside(panelRef, () => close())

function close() {
  isOpen.value = false
  query.value = ''
}

watch(query, () => {
  selectedIndex.value = 0
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      data-testid="command-palette"
    >
      <div
        class="absolute inset-0 bg-black/55"
        @click="close"
        data-testid="command-palette-backdrop"
      ></div>

      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        class="border-border-strong bg-panel relative flex max-h-[60vh] w-[520px] flex-col overflow-hidden rounded-[10px] border shadow-2xl"
      >
        <div class="border-border flex items-center gap-2.5 border-b px-3.5 py-2.5">
          <IconSearch :size="16" class="text-text-muted flex-none" />
          <input
            ref="inputRef"
            id="command-palette-title"
            v-model="query"
            type="text"
            placeholder="Search chats and commands..."
            class="text-text placeholder:text-text-muted flex-1 bg-transparent text-[13px] outline-none"
          />
        </div>

        <div class="overflow-y-auto">
          <div
            v-if="items.length === 0"
            class="text-text-muted px-4 py-6 text-center text-[12px]"
          >
            No results
          </div>

          <template v-else>
            <div
              v-if="filteredActions.length > 0"
              class="text-text-muted px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Actions
            </div>
            <div
              v-for="(item, idx) in filteredActions"
              :key="item.id"
              @click="item.action()"
              @mouseenter="selectedIndex = idx"
              :class="[
                'flex cursor-pointer items-center gap-2.5 border-l-2 px-3.5 py-2',
                selectedIndex === idx
                  ? 'border-accent bg-sel'
                  : 'hover:bg-hover border-transparent',
              ]"
            >
              <component
                :is="item.icon"
                :size="16"
                class="text-text-secondary flex-none"
              />
              <span class="text-text text-[12px]">{{ item.label }}</span>
            </div>

            <div
              v-if="filteredChats.length > 0"
              class="text-text-muted px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Chats
            </div>
            <div
              v-for="(chat, idx) in filteredChats"
              :key="chat.id"
              @click="switchChat(chat.id!)"
              @mouseenter="selectedIndex = filteredActions.length + idx"
              :class="[
                'flex cursor-pointer flex-col border-l-2 px-3.5 py-1.5',
                selectedIndex === filteredActions.length + idx
                  ? 'border-accent bg-sel'
                  : 'hover:bg-hover border-transparent',
              ]"
            >
              <span class="text-text text-[12px] font-semibold">{{ chat.name }}</span>
              <span class="text-text-muted font-mono text-[10px]">{{ chat.model }}</span>
            </div>
          </template>
        </div>

        <div
          class="border-border text-text-muted flex items-center gap-4 border-t px-3.5 py-2 text-[10px]"
        >
          <span>Esc to close</span>
          <span>&middot;</span>
          <span>&uarr;&darr; navigate</span>
          <span>&middot;</span>
          <span>&#9166; select</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
