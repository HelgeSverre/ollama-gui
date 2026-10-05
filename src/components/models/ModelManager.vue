<script setup lang="ts">
import { IconChevronRight, IconPlayerEject, IconTrash, IconX } from '@tabler/icons-vue'
import { computed, ref, watch } from 'vue'
import { useChats } from '../../composables/useChats'
import { confirmAction } from '../../composables/useConfirm'
import { useModels } from '../../composables/useModels'
import { locale } from '../../composables/useSettings'
import { errorMessage, toast } from '../../composables/useToasts'
import { closeModal, modal } from '../../composables/useUi'
import { formatBytes, relativeTime } from '../../domain/format'
import CapabilityBadges from '../composer/CapabilityBadges.vue'
import Modal from '../ui/Modal.vue'
import PullCombobox from './PullCombobox.vue'

const models = useModels()
const chats = useChats()

const tab = ref<'installed' | 'running'>('installed')
const expanded = ref<string | null>(null)
const open = computed(() => modal.value === 'models')

watch(open, (value) => {
  if (!value) return
  void models.refresh()
  void models.refreshRunning()
  for (const m of models.models.value) void models.loadInfo(m.name)
})
// Capability badges for models that appear while the dialog is open (e.g. after a pull)
watch(models.models, (list) => {
  if (open.value) for (const m of list) void models.loadInfo(m.name)
})
watch(tab, (value) => {
  if (value === 'running') void models.refreshRunning()
})

const bytes = (n: number) => formatBytes(n, locale.value)
const percent = (completed: number, total: number) =>
  total ? Math.floor((completed / total) * 100) : 0

function pull(name: string) {
  void models.pull(name)
}

async function remove(name: string) {
  const ok = await confirmAction({
    title: `Delete ${name}?`,
    message: 'The model files are removed from disk. You can pull it again later.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (!ok) return
  try {
    await models.remove(name)
    toast(`Deleted ${name}`, 'success')
  } catch (error) {
    toast(errorMessage(error), 'error')
  }
}

async function unload(name: string) {
  try {
    await models.unload(name)
  } catch (error) {
    toast(errorMessage(error), 'error')
  }
}

async function use(name: string) {
  await chats.setModel(name)
  closeModal()
}

function toggle(name: string) {
  expanded.value = expanded.value === name ? null : name
  if (expanded.value) void models.loadInfo(name)
}

function details(name: string) {
  const info = models.info.get(name)
  const m = models.models.value.find((x) => x.name === name)
  return [
    ['Family', m?.details?.family],
    ['Parameters', m?.details?.parameter_size],
    ['Quantization', m?.details?.quantization_level],
    [
      'Context length',
      info?.contextLength
        ? new Intl.NumberFormat(locale.value).format(info.contextLength)
        : undefined,
    ],
    ['Capabilities', info?.capabilities.join(', ')],
  ].filter((row): row is [string, string] => !!row[1])
}
</script>

<template>
  <Modal :open="open" title="Models" width="620px" @close="closeModal('models')">
    <div class="space-y-5 p-4">
      <section>
        <PullCombobox :installed="models.models.value.map((m) => m.name)" @pull="pull" />
        <a
          href="https://ollama.com/search"
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent mt-1.5 inline-block text-[11.5px] hover:underline"
        >
          Browse the full library on ollama.com ↗
        </a>

        <div
          v-for="job in models.pulls.values()"
          :key="job.model"
          class="border-border mt-3 rounded-lg border p-3"
          data-testid="pull-job"
        >
          <div class="flex items-center gap-2 text-[12.5px]">
            <span class="font-medium">{{ job.model }}</span>
            <span
              class="text-text-muted truncate text-[11.5px]"
              :class="{ 'text-red': job.error }"
            >
              {{ job.error ?? job.status }}
            </span>
            <button
              type="button"
              class="text-text-muted hover:text-text ml-auto rounded p-0.5"
              :aria-label="job.error ? 'Dismiss' : 'Cancel pull'"
              @click="job.error ? models.pulls.delete(job.model) : job.abort()"
            >
              <IconX :size="14" />
            </button>
          </div>
          <div v-if="!job.error" class="mt-2 flex items-center gap-2">
            <div class="bg-hover h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                class="bg-accent h-full rounded-full transition-[width]"
                :style="{ width: `${percent(job.completed, job.total)}%` }"
              />
            </div>
            <span class="text-text-muted w-[140px] text-right text-[11px] tabular-nums">
              {{ job.total ? `${bytes(job.completed)} / ${bytes(job.total)}` : '' }}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div class="border-border mb-2 flex gap-4 border-b text-[12.5px]">
          <button
            v-for="t in ['installed', 'running'] as const"
            :key="t"
            type="button"
            class="-mb-px border-b-2 pb-1.5"
            :class="
              tab === t
                ? 'border-accent text-text font-semibold'
                : 'text-text-secondary border-transparent'
            "
            @click="tab = t"
          >
            {{
              t === 'installed'
                ? `Installed (${models.models.value.length})`
                : `Loaded (${models.running.value.length})`
            }}
          </button>
        </div>

        <template v-if="tab === 'installed'">
          <p
            v-if="!models.models.value.length"
            class="text-text-muted py-6 text-center text-[12.5px]"
          >
            No models installed yet. Pull one above.
          </p>
          <div
            v-for="m in models.models.value"
            :key="m.name"
            class="border-border rounded-lg border-b last:border-b-0"
            data-testid="installed-model"
          >
            <div class="flex items-center gap-2 py-2">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 text-left"
                :aria-expanded="expanded === m.name"
                @click="toggle(m.name)"
              >
                <IconChevronRight
                  :size="14"
                  class="text-text-muted flex-none transition-transform"
                  :class="{ 'rotate-90': expanded === m.name }"
                />
                <span class="min-w-0">
                  <span class="text-text block truncate text-[13px] font-medium">
                    {{ m.name }}
                  </span>
                  <span class="text-text-muted block text-[11.5px]">
                    {{ bytes(m.size) }} · updated
                    {{ relativeTime(new Date(m.modified_at), locale) }}
                  </span>
                </span>
              </button>
              <CapabilityBadges :capabilities="models.info.get(m.name)?.capabilities" />
              <button
                type="button"
                class="text-accent hover:bg-hover rounded-md px-2 py-1 text-[12px]"
                @click="use(m.name)"
              >
                Use
              </button>
              <button
                type="button"
                class="text-text-muted hover:text-red hover:bg-hover rounded-md p-1.5"
                :aria-label="`Delete ${m.name}`"
                @click="remove(m.name)"
              >
                <IconTrash :size="15" />
              </button>
            </div>
            <dl
              v-if="expanded === m.name"
              class="mb-3 ml-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]"
            >
              <template v-for="[label, value] in details(m.name)" :key="label">
                <dt class="text-text-muted">
                  {{ label }}
                </dt>
                <dd class="text-text">
                  {{ value }}
                </dd>
              </template>
              <template v-if="models.info.get(m.name)?.raw.license">
                <dt class="text-text-muted">License</dt>
                <dd>
                  <details>
                    <summary class="text-accent cursor-pointer">Show</summary>
                    <pre
                      class="bg-list mt-1 max-h-48 overflow-auto rounded p-2 text-[11px] whitespace-pre-wrap"
                      >{{ models.info.get(m.name)?.raw.license }}</pre>
                  </details>
                </dd>
              </template>
            </dl>
          </div>
        </template>

        <template v-else>
          <p
            v-if="!models.running.value.length"
            class="text-text-muted py-6 text-center text-[12.5px]"
          >
            No models loaded in memory.
          </p>
          <div
            v-for="m in models.running.value"
            :key="m.name"
            class="border-border flex items-center gap-3 border-b py-2 last:border-b-0"
          >
            <span class="min-w-0 flex-1">
              <span class="text-text block truncate text-[13px] font-medium">
                {{ m.name }}
              </span>
              <span class="text-text-muted block text-[11.5px]">
                {{ bytes(m.size_vram) }} VRAM of {{ bytes(m.size) }}
                <template v-if="m.context_length">· ctx {{ m.context_length }}</template>
                · unloads {{ relativeTime(new Date(m.expires_at), locale) }}
              </span>
            </span>
            <button
              type="button"
              class="text-text-secondary hover:bg-hover flex items-center gap-1 rounded-md px-2 py-1 text-[12px]"
              @click="unload(m.name)"
            >
              <IconPlayerEject :size="14" />
              Unload
            </button>
          </div>
        </template>
      </section>
    </div>
  </Modal>
</template>
