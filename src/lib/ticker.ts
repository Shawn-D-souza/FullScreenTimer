/**
 * A single shared clock for the whole app.
 *
 * Every mode derives its display from `Date.now()` against a stored deadline, so
 * this ticker never needs to be accurate — it only needs to be *frequent enough*
 * while the tab is visible and *awake at the right moment* while it is not.
 *
 * Three sources drive it:
 *   - requestAnimationFrame while the document is visible (smooth, free)
 *   - a worker interval that keeps ticking while the tab is hidden, since
 *     background rAF stops entirely and main-thread intervals get throttled
 *   - one-shot wake-ups at known deadlines, so an alarm's side effects fire on
 *     time instead of on the next throttled interval
 */

type Listener = () => void

const listeners = new Set<Listener>()
const wakeTimers = new Map<string, number>()

let lastNow = Date.now()
let rafId: number | null = null
let worker: Worker | null = null
let fallbackInterval: number | null = null
let started = false

const WORKER_SOURCE = `
let ticker = null
const wakes = new Map()
self.onmessage = (event) => {
  const data = event.data
  if (data.type === 'start') {
    if (ticker === null) ticker = setInterval(() => self.postMessage(0), data.interval)
  } else if (data.type === 'stop') {
    if (ticker !== null) { clearInterval(ticker); ticker = null }
  } else if (data.type === 'wake') {
    const existing = wakes.get(data.id)
    if (existing !== undefined) clearTimeout(existing)
    if (data.at === null) { wakes.delete(data.id); return }
    wakes.set(data.id, setTimeout(() => { wakes.delete(data.id); self.postMessage(0) }, Math.max(0, data.at - Date.now())))
  }
}
`

function emit(): void {
  lastNow = Date.now()
  for (const listener of [...listeners]) listener()
}

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
    const instance = new Worker(url)
    URL.revokeObjectURL(url)
    instance.onmessage = emit
    return instance
  } catch {
    return null
  }
}

function frame(): void {
  emit()
  rafId = requestAnimationFrame(frame)
}

function startFrames(): void {
  if (rafId === null && !document.hidden) rafId = requestAnimationFrame(frame)
}

function stopFrames(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    stopFrames()
  } else {
    startFrames()
  }
  // Catch up immediately either way: something may have elapsed while hidden.
  emit()
}

function start(): void {
  if (started) return
  started = true

  worker = createWorker()
  if (worker) {
    worker.postMessage({ type: 'start', interval: 250 })
  } else {
    fallbackInterval = window.setInterval(emit, 250)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', emit)
  startFrames()
}

function stop(): void {
  if (!started) return
  started = false

  stopFrames()
  if (worker) {
    worker.postMessage({ type: 'stop' })
    worker.terminate()
    worker = null
  }
  if (fallbackInterval !== null) {
    clearInterval(fallbackInterval)
    fallbackInterval = null
  }
  for (const timer of wakeTimers.values()) clearTimeout(timer)
  wakeTimers.clear()

  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', emit)
}

/** Stable identity — `useSyncExternalStore` re-subscribes whenever this changes. */
export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  start()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

/**
 * The most recent emitted timestamp. Reading a cached value rather than
 * `Date.now()` keeps every snapshot within one render pass consistent, which
 * `useSyncExternalStore` requires.
 */
export function now(): number {
  return lastNow
}

/** Force a tick — used after any state change that alters what is on screen. */
export function poke(): void {
  emit()
}

/**
 * Ask to be woken at an exact moment. Extra ticks are harmless, so this fires
 * on both the main thread and the worker and lets whichever survives throttling
 * win.
 */
export function wakeAt(id: string, at: number | null): void {
  const existing = wakeTimers.get(id)
  if (existing !== undefined) {
    clearTimeout(existing)
    wakeTimers.delete(id)
  }
  worker?.postMessage({ type: 'wake', id, at })

  if (at === null) return
  wakeTimers.set(id, window.setTimeout(emit, Math.max(0, at - Date.now())))
}
