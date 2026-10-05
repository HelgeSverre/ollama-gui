<script setup lang="ts">
import { IconCheck, IconDownload } from '@tabler/icons-vue'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { locale } from '../../composables/useSettings'
import {
  formatPulls,
  popularModels,
  searchCatalog,
  type CatalogModel,
  type Suggestion,
} from '../../domain/catalog'
import type { Capability } from '../../ollama/models'
import CapabilityBadges from '../composer/CapabilityBadges.vue'

const props = defineProps<{ installed: string[] }>()
const emit = defineEmits<{ pull: [ref: string] }>()

const query = ref('')
const open = ref(false)
const active = ref(-1)
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
const catalog = shallowRef<CatalogModel[]>([])
const generatedAt = ref('')

// The catalog ships with the app (no request to ollama.com); load it only when the manager opens
onMounted(async () => {
  const data = (await import('../../data/model-catalog.json')).default
  catalog.value = data.models
  generatedAt.value = data.generatedAt
})

const installedBases = computed(
  () => new Set(props.installed.map((n) => n.split(':')[0])),
)
const isInstalled = (model: CatalogModel) => installedBases.value.has(model.name)

const options = computed<Suggestion[]>(() =>
  query.value.trim()
    ? searchCatalog(catalog.value, query.value)
    : popularModels(catalog.value, props.installed, 6).map((model) => ({
        model,
        ref: model.name,
      })),
)

watch(options, () => (active.value = query.value.trim() ? 0 : -1))

const optionId = (i: number) => `pull-option-${i}`

function pull(ref: string) {
  const name = ref.trim()
  if (!name) return
  emit('pull', name)
  query.value = ''
  open.value = false
  active.value = -1
}

function submit() {
  const choice = options.value[active.value]
  pull(choice && open.value ? choice.ref : query.value)
}

async function move(delta: number) {
  open.value = true
  const count = options.value.length
  if (!count) return
  active.value = (active.value + delta + count) % count
  await nextTick()
  list.value
    ?.querySelector(`#${optionId(active.value)}`)
    ?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    void move(-1)
  } else if (event.key === 'Tab' && open.value && options.value[active.value]) {
    // Complete the name and show its sizes, like a shell completing a path
    const choice = options.value[active.value]
    if (
      !choice.size &&
      choice.model.sizes.length &&
      query.value !== `${choice.model.name}:`
    ) {
      event.preventDefault()
      query.value = `${choice.model.name}:`
    }
  } else if (event.key === 'Escape' && open.value) {
    // Close the list without closing the dialog
    event.preventDefault()
    event.stopPropagation()
    open.value = false
  }
}

function pickSize(model: CatalogModel, size: string) {
  pull(`${model.name}:${size}`)
  input.value?.focus()
}

const updated = computed(() =>
  generatedAt.value
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
        new Date(generatedAt.value),
      )
    : '',
)
</script>

<template>
  <div class="relative">
    <form class="flex gap-2" @submit.prevent="submit">
      <input
        ref="input"
        v-model="query"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="pull-options"
        :aria-expanded="open && options.length > 0"
        :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
        autocomplete="off"
        spellcheck="false"
        placeholder="Search the Ollama library, or type a name like qwen3:8b"
        class="border-border bg-list text-text placeholder:text-text-muted focus:border-accent min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-[13px] outline-none"
        data-testid="pull-input"
        @input="open = true"
        @focus="open = true"
        @blur="open = false"
        @keydown="onKeydown"
      />
      <button
        type="submit"
        :disabled="!query.trim() && !(open && options[active])"
        class="bg-accent flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        <IconDownload :size="15" />
        Pull
      </button>
    </form>

    <div
      v-if="open && options.length"
      id="pull-options"
      ref="list"
      role="listbox"
      aria-label="Models in the Ollama library"
      class="bg-panel border-border-strong mt-1 max-h-[340px] overflow-y-auto rounded-lg border p-1 shadow-sm"
      data-testid="pull-suggestions"
      @mousedown.prevent
    >
      <div
        v-if="!query.trim()"
        class="text-text-muted px-2.5 pt-1.5 pb-1 text-[11px] font-semibold"
      >
        Popular
      </div>
      <div
        v-for="(option, i) in options"
        :id="optionId(i)"
        :key="option.ref"
        role="option"
        :aria-selected="i === active"
        class="cursor-pointer rounded-md px-2.5 py-2"
        :class="i === active ? 'bg-sel' : 'hover:bg-hover'"
        data-testid="pull-suggestion"
        @mousemove="active = i"
        @click="pull(option.ref)"
      >
        <div class="flex items-center gap-2">
          <span class="text-text text-[13px] font-medium">{{ option.ref }}</span>
          <CapabilityBadges :capabilities="option.model.capabilities as Capability[]" />
          <span
            v-if="isInstalled(option.model)"
            class="text-green flex items-center gap-0.5 text-[11px]"
          >
            <IconCheck :size="12" />
            Installed
          </span>
          <span class="text-text-muted ml-auto flex-none text-[11px] tabular-nums">
            {{ formatPulls(option.model.pulls, locale) }} pulls
          </span>
        </div>
        <p v-if="!option.size" class="text-text-muted mt-0.5 line-clamp-1 text-[11.5px]">
          {{ option.model.description }}
        </p>
        <div
          v-if="!option.size && option.model.sizes.length"
          class="mt-1.5 flex flex-wrap gap-1"
        >
          <button
            v-for="size in option.model.sizes"
            :key="size"
            type="button"
            tabindex="-1"
            class="border-border text-text-secondary hover:border-accent hover:text-text rounded-full border px-2 py-px text-[11px]"
            :data-testid="`pull-size-${option.model.name}-${size}`"
            :aria-label="`Pull ${option.model.name}:${size}`"
            @click.stop="pickSize(option.model, size)"
          >
            {{ size }}
          </button>
        </div>
      </div>
      <div
        class="border-border text-text-muted mt-1 flex items-center gap-3 border-t px-2.5 pt-1.5 pb-1 text-[11px]"
      >
        <span>↑↓ choose · Tab sizes · ↵ pull</span>
        <span v-if="updated" class="ml-auto">Library list from {{ updated }}</span>
      </div>
    </div>
  </div>
</template>
