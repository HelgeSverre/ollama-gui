<script setup lang="ts">
import { IconBox, IconCheck, IconChevronDown, IconRefresh } from '@tabler/icons-vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useChats } from '../../composables/useChats'
import { useModels } from '../../composables/useModels'
import { openModal } from '../../composables/useUi'
import Menu from '../ui/Menu.vue'
import CapabilityBadges from './CapabilityBadges.vue'

const chats = useChats()
const models = useModels()
const open = ref(false)
const query = ref('')
const search = ref<HTMLInputElement>()

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return models.models.value.filter((m) => !q || m.name.toLowerCase().includes(q))
})

watch(open, async (value) => {
  if (!value) return
  query.value = ''
  for (const m of models.models.value) void models.loadInfo(m.name)
  await nextTick()
  search.value?.focus()
})

async function pick(name: string) {
  open.value = false
  await chats.setModel(name)
}
</script>

<template>
  <Menu
    v-model:open="open"
    align="left"
    placement="above"
  >
    <template #trigger="{ toggle }">
      <button
        type="button"
        class="hover:bg-hover text-text-secondary flex max-w-[220px] items-center gap-1 rounded-md px-2 py-1 text-[12.5px]"
        aria-label="Select model"
        data-testid="model-select"
        @click="toggle"
      >
        <span class="truncate">{{ chats.activeModel.value || 'Select a model' }}</span>
        <IconChevronDown
          :size="14"
          class="flex-none"
        />
      </button>
    </template>

    <div
      class="w-[300px]"
      @click.stop
    >
      <input
        ref="search"
        v-model="query"
        placeholder="Search models…"
        class="border-border bg-list text-text placeholder:text-text-muted mb-1 w-full rounded-md border px-2.5 py-1.5 text-[12.5px] outline-none"
        @keydown.enter.prevent="filtered[0] && pick(filtered[0].name)"
      >
      <div class="max-h-[300px] overflow-y-auto">
        <button
          v-for="m in filtered"
          :key="m.name"
          type="button"
          role="menuitemradio"
          :aria-checked="m.name === chats.activeModel.value"
          class="hover:bg-hover focus:bg-hover flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] outline-none"
          :data-testid="`model-option-${m.name}`"
          @click="pick(m.name)"
        >
          <span class="min-w-0 flex-1">
            <span class="text-text block truncate">{{ m.name }}</span>
            <span class="text-text-muted block text-[11px]">
              {{ [m.details?.parameter_size, m.details?.quantization_level].filter(Boolean).join(' · ') }}
            </span>
          </span>
          <CapabilityBadges :capabilities="models.info.get(m.name)?.capabilities" />
          <IconCheck
            v-if="m.name === chats.activeModel.value"
            :size="14"
            class="text-accent flex-none"
          />
        </button>
        <p
          v-if="!filtered.length"
          class="text-text-muted px-2.5 py-3 text-[12px]"
        >
          {{ models.models.value.length ? 'No matching models' : 'No models installed' }}
        </p>
      </div>
      <div class="border-border mt-1 flex gap-1 border-t pt-1">
        <button
          type="button"
          class="hover:bg-hover text-text-secondary flex flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px]"
          @click="open = false; openModal('models')"
        >
          <IconBox :size="14" />
          Manage models
        </button>
        <button
          type="button"
          class="hover:bg-hover text-text-secondary rounded-md p-1.5"
          title="Refresh models"
          aria-label="Refresh models"
          @click="models.refresh()"
        >
          <IconRefresh
            :size="14"
            :class="{ 'animate-spin': models.loading.value }"
          />
        </button>
      </div>
    </div>
  </Menu>
</template>
