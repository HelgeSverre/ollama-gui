<script setup lang="ts">
import { IconFileExport, IconUpload, IconTrashX, IconX } from '@tabler/icons-vue'
import ToggleInput from './Inputs/ToggleInput.vue'
import TextInput from './Inputs/TextInput.vue'
import ExportButton from './History/ExportButton.vue'
import ImportButton from './History/ImportButton.vue'
import {
  baseUrl,
  historyMessageLength,
  enableMarkdown,
  showSystem,
  gravatarEmail,
  isSettingsOpen,
  toggleSettingsPanel,
} from '../services/appConfig.ts'
import { useChats } from '../services/chat.ts'
import { ref } from 'vue'

const { wipeDatabase } = useChats()
const panelRef = ref<HTMLElement>()
const confirmingWipe = ref(false)

const requestWipe = () => {
  confirmingWipe.value = true
}

const confirmWipe = () => {
  wipeDatabase()
  confirmingWipe.value = false
}

const cancelWipe = () => {
  confirmingWipe.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      data-testid="settings-overlay"
    >
      <div
        class="absolute inset-0 bg-black/55"
        data-testid="settings-backdrop"
        @click="toggleSettingsPanel"
      />

      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        class="border-border-strong bg-panel relative max-h-[80vh] w-[520px] overflow-hidden rounded-[10px] border shadow-2xl"
      >
        <div class="border-border flex items-center justify-between border-b px-4 py-2.5">
          <h2
            id="settings-title"
            class="text-text text-[13px] font-semibold"
          >
            Settings
          </h2>
          <button
            class="hover:bg-hover rounded-[4px] p-1.5"
            data-testid="settings-close"
            @click="toggleSettingsPanel"
          >
            <IconX
              :size="16"
              class="text-text-secondary"
            />
          </button>
        </div>

        <div class="space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Display
            </div>
            <div class="space-y-1">
              <ToggleInput
                v-model="enableMarkdown"
                label="Enable Markdown"
                data-testid="toggle-markdown"
              />
              <ToggleInput
                v-model="showSystem"
                label="Show System Messages"
                data-testid="toggle-system-msgs"
              />
            </div>
          </div>

          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Connection
            </div>
            <TextInput
              id="base-url"
              v-model="baseUrl"
              label="Ollama API URL"
              data-testid="input-base-url"
            />
          </div>

          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Profile
            </div>
            <TextInput
              id="gravatar-email"
              v-model="gravatarEmail"
              label="Gravatar Email"
              data-testid="input-gravatar"
            />
          </div>

          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              History
            </div>
            <div>
              <label
                for="chat-history-length"
                class="text-text mb-1.5 block text-[11px]"
              >
                Context length (messages)
              </label>
              <input
                id="chat-history-length"
                v-model="historyMessageLength"
                type="number"
                min="0"
                max="100"
                class="border-border bg-list text-text focus:border-accent block w-full rounded-[5px] border p-2 text-[11px] outline-none"
                placeholder="10"
                data-testid="input-context-length"
              >
            </div>
          </div>

          <div>
            <div
              class="text-text-muted mb-2 text-[10px] font-bold tracking-[0.08em] uppercase"
            >
              Data
            </div>
            <div class="space-y-1">
              <ImportButton
                class="text-text hover:bg-hover flex w-full items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-[11.5px]"
                data-testid="import-chats"
              >
                <IconUpload
                  :size="14"
                  class="text-text-muted"
                />
                Import Chats
              </ImportButton>
              <ExportButton
                class="text-text hover:bg-hover flex w-full items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-[11.5px]"
                data-testid="export-chats"
              >
                <IconFileExport
                  :size="14"
                  class="text-text-muted"
                />
                Export Chats
              </ExportButton>
              <template v-if="!confirmingWipe">
                <button
                  class="text-red hover:bg-hover flex w-full items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-[11.5px]"
                  data-testid="delete-all-chats"
                  @click="requestWipe"
                >
                  <IconTrashX :size="14" />
                  Delete All Chats
                </button>
              </template>
              <template v-else>
                <div class="flex items-center gap-2">
                  <span class="text-text text-[11px]">Are you sure?</span>
                  <button
                    class="text-red text-[11px] font-bold hover:underline"
                    @click="confirmWipe"
                  >
                    Yes, delete all
                  </button>
                  <button
                    class="text-text-secondary hover:text-text text-[11px]"
                    @click="cancelWipe"
                  >
                    Cancel
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
