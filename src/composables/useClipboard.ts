import { toast } from './useToasts'

/** Copy on HTTPS and HTTP LAN origins; only report success if the browser accepts it. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permissions can deny the async API even on HTTPS. Try the user-gesture fallback.
    }
  }

  const focused = document.activeElement as HTMLElement | null
  const input = document.createElement('textarea')
  input.value = text
  input.readOnly = true
  input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  // A modal makes document.body inert; the temporary selection must stay inside it.
  const container = focused?.closest('dialog[open]') ?? document.body
  container.append(input)
  try {
    input.select()
    // Deprecated, but still the available clipboard-write API on insecure origins.
    if (document.execCommand('copy')) return true
  } catch {
    // Some browsers disable legacy copying too. Leave success indicators unchanged.
  } finally {
    input.remove()
    focused?.focus({ preventScroll: true })
  }
  toast('Could not copy. Select the text and copy it manually.', 'error')
  return false
}
