import { shallowRef } from 'vue'

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  resolve(value: boolean): void
}

export const pendingConfirm = shallowRef<ConfirmRequest | null>(null)

/** Promise-based confirm rendered by <ConfirmDialog>; replaces window.confirm. */
export function confirmAction(
  options: Omit<ConfirmRequest, 'resolve'>,
): Promise<boolean> {
  pendingConfirm.value?.resolve(false)
  return new Promise((resolve) => {
    pendingConfirm.value = {
      ...options,
      resolve: (value) => {
        pendingConfirm.value = null
        resolve(value)
      },
    }
  })
}
