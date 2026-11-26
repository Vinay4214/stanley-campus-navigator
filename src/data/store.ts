import type { CampusEdge } from './types'
import { edgeKey } from './routing'

export interface DemoState {
  blocked: string[]
  announcement: string
  searches: Record<string, number>
  routes: Record<string, number>
}

const STATE_KEY = 'stanley-navigator-state'
const CHANNEL_NAME = 'stanley-navigator-live'
const emptyState: DemoState = { blocked: [], announcement: '', searches: {}, routes: {} }
let channel: BroadcastChannel | null = null

function browser() {
  return typeof window !== 'undefined'
}

export function readState(): DemoState {
  if (!browser()) return emptyState
  try {
    const value = window.localStorage.getItem(STATE_KEY)
    return value ? { ...emptyState, ...JSON.parse(value) as Partial<DemoState> } : emptyState
  } catch (error) {
    console.error('Unable to read saved campus demo state.', error)
    return emptyState
  }
}

export function writeState(state: DemoState) {
  if (!browser()) return
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
  channel ??= typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
  channel?.postMessage(state)
}

export function toggleBlocked(state: DemoState, edge: CampusEdge): DemoState {
  const key = edgeKey(edge)
  return {
    ...state,
    blocked: state.blocked.includes(key)
      ? state.blocked.filter(item => item !== key)
      : [...state.blocked, key]
  }
}

export function trackSearch(state: DemoState, query: string): DemoState {
  const key = query.trim()
  return key ? { ...state, searches: { ...state.searches, [key]: (state.searches[key] ?? 0) + 1 } } : state
}

export function trackRoute(state: DemoState, route: string): DemoState {
  return { ...state, routes: { ...state.routes, [route]: (state.routes[route] ?? 0) + 1 } }
}

export function subscribeState(listener: (state: DemoState) => void) {
  if (!browser()) return () => undefined
  channel ??= typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
  const onStorage = (event: StorageEvent) => {
    if (event.key === STATE_KEY) listener(readState())
  }
  const onMessage = (event: MessageEvent<DemoState>) => listener(event.data)
  window.addEventListener('storage', onStorage)
  channel?.addEventListener('message', onMessage)
  return () => {
    window.removeEventListener('storage', onStorage)
    channel?.removeEventListener('message', onMessage)
  }
}
