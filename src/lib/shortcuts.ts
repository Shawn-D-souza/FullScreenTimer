import type { ModeId } from '../state/schema'

/**
 * The single source of truth for key bindings: what `useAppHotkeys` binds, what
 * the shortcuts sheet lists, and what Settings → Keyboard prints all read from
 * here. Rebinding is out of scope for the MVP, but because bindings are data,
 * adding it later is a change to this file rather than a rewrite.
 */

export interface Shortcut {
  /** react-hotkeys-hook binding string. */
  binding: string
  /** How the key is drawn in the UI. */
  keys: string[]
  action: string
  /** Present when the shortcut only does something in particular modes. */
  modes?: ModeId[]
}

export const SHORTCUTS: Shortcut[] = [
  { binding: 'space', keys: ['Space'], action: 'Start / pause' },
  { binding: 'r', keys: ['R'], action: 'Reset' },
  { binding: 'tab', keys: ['Tab'], action: 'Next mode' },
  { binding: 'shift+tab', keys: ['Shift', 'Tab'], action: 'Previous mode' },
  { binding: 'right,left', keys: ['←', '→'], action: 'Previous / next mode' },
  { binding: '1,2,3,4,5', keys: ['1', '–', '5'], action: 'Jump to a mode' },
  { binding: 'l', keys: ['L'], action: 'Record a lap', modes: ['stopwatch'] },
  { binding: 'up,down', keys: ['↑', '↓'], action: 'Adjust the duration', modes: ['timer'] },
  { binding: 'n', keys: ['N'], action: 'Skip to the next phase', modes: ['pomodoro'] },
  { binding: 's', keys: ['S'], action: 'Open settings' },
  { binding: 'shift+slash', keys: ['?'], action: 'Show these shortcuts' },
  { binding: 'h', keys: ['H'], action: 'Hide / show the interface' },
  { binding: 'd', keys: ['D'], action: 'Dark / light' },
  { binding: 'm', keys: ['M'], action: 'Mute everything' },
  { binding: 'f', keys: ['F'], action: 'Fullscreen' },
  { binding: 'escape', keys: ['Esc'], action: 'Close an overlay' },
]
