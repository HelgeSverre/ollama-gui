import { ref } from 'vue'

/** Which overlay or side panel is open. Only one modal at a time. */
export type Modal = 'settings' | 'models' | 'palette' | null

export const modal = ref<Modal>(null)
export const chatSettingsOpen = ref(false)
/** Mobile drawer state; the sidebar is always visible on wide screens. */
export const sidebarOpen = ref(false)

export function openModal(name: Exclude<Modal, null>) {
  modal.value = name
}

export function closeModal() {
  modal.value = null
}

export function toggleModal(name: Exclude<Modal, null>) {
  modal.value = modal.value === name ? null : name
}

/** User message currently being edited inline (ArrowUp in an empty composer edits the last one). */
export const editingNodeId = ref<string | null>(null)
