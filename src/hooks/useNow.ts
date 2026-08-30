import { useCallback, useSyncExternalStore } from 'react'
import { now, subscribe } from '../lib/ticker'

/**
 * Subscribes to the shared clock, quantised to `resolutionMs`.
 *
 * The quantised value is the snapshot, so React re-renders only when the
 * displayed precision actually changes — a clock showing minutes re-renders
 * once a minute even though the ticker fires every frame.
 */
export function useNow(resolutionMs: number): number {
  const getSnapshot = useCallback(
    () => Math.floor(now() / resolutionMs) * resolutionMs,
    [resolutionMs],
  )
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
