import Clarity from '@microsoft/clarity'

const clarityProjectId = 'w8nwd7jrih'

let hasInitializedClarity = false

function canUseClarity() {
  return hasInitializedClarity && import.meta.env.PROD && typeof window !== 'undefined'
}

export function initClarity() {
  if (hasInitializedClarity || !import.meta.env.PROD || typeof window === 'undefined') {
    return
  }

  Clarity.init(clarityProjectId)
  hasInitializedClarity = true
}

export function trackClarityEvent(eventName: string) {
  if (!canUseClarity()) {
    return
  }

  Clarity.event(eventName)
}

export function setClarityTag(key: string, value: string | string[]) {
  if (!canUseClarity()) {
    return
  }

  Clarity.setTag(key, value)
}

export function identifyClarityUser(
  customId: string,
  customSessionId?: string,
  customPageId?: string,
  friendlyName?: string,
) {
  if (!canUseClarity()) {
    return
  }

  Clarity.identify(customId, customSessionId, customPageId, friendlyName)
}
