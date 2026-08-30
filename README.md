# FullScreenTimer

A full-screen clock, stopwatch, timer, pomodoro and flowmodoro that gets out of the way.

Open it, glance at it from across the room, and forget it is a web page. The
interface fades out a few seconds after you stop touching anything, leaving only
the time. Move the mouse or press a key and it comes back. Everything runs
offline, nothing is sent anywhere, and every setting lives in your own browser.

## Modes

| Mode | What it does |
| --- | --- |
| **Timer** | Counts down. Presets, `↑`/`↓` to nudge the duration, optional auto-reset when it ends. |
| **Pomodoro** | Work / short break / long break with a round counter, configurable lengths, and independent auto-start for breaks and work. |
| **Stopwatch** | Counts up, with laps and split times. Hundredths can be turned off for a calmer screen. |
| **Flowmodoro** | Focus for as long as the focus lasts; the break you have earned (focused time ÷ divisor, clamped to a min and max) is shown live while you work. |
| **Clock** | The current time, optionally with seconds, a 12/24-hour override, and the date. |

Modes can be reordered or switched off entirely in **Settings → Modes** — the
tab strip, the `Tab`/arrow shortcuts and the number keys all follow your order.
At least one mode always stays on.

## Keyboard

| Keys | Action |
| --- | --- |
| `Space` | Start / pause the current mode |
| `R` | Reset |
| `Tab` / `Shift`+`Tab` | Next / previous mode |
| `←` `→` | Previous / next mode |
| `1`–`5` | Jump straight to a mode |
| `L` | Record a lap (stopwatch) |
| `↑` `↓` | Adjust the duration (timer) |
| `N` | Skip to the next phase (pomodoro) |
| `H` | Hide / show the interface |
| `D` | Dark / light |
| `M` | Mute everything |
| `F` | Fullscreen |
| `S` | Settings |
| `?` | The shortcut sheet |
| `Esc` | Close an overlay |

Shortcuts stand down while focus is inside a control, so `Space` still toggles a
switch and `Tab` still moves through the settings panel as usual.

On a phone there is no keyboard, so tapping the empty screen is the primary
action — start, pause, resume. Taps on buttons, fields and the lap list are left
alone.

## Install and offline

FullScreenTimer is a PWA. A hand-rolled service worker (`public/sw.js`, no
Workbox) pre-caches the shell on install, serves navigations network-first and
falls back to the cached shell when there is no network, and serves assets
cache-first — immutable hashed builds straight from the cache, everything else
revalidated in the background. Old caches are dropped on activate. When the
browser offers installation, a download icon appears in the interface;
installed, it runs as its own standalone window with no address bar.

Nothing leaves the device. Settings, tip state and the running session are
persisted to `localStorage` under `fst:settings`, `fst:tips` and `fst:session` —
so a reload or a crash mid-pomodoro picks up where it left off, at the correct
remaining time rather than where the clock was when the tab died.

## How it keeps time

Background tabs are throttled, `setInterval` drifts, and audio scheduled from a
throttled main thread arrives late. Three decisions make that irrelevant:

- **Nothing counts.** Every mode stores a deadline (or a start instant) and the
  display is derived from `Date.now()` against it. There is no accumulator to
  drift, so a tab that was asleep for an hour is instantly correct on wake.
- **Alarm tones are pre-scheduled on the audio thread.** When a deadline is
  known, the tone is queued at `audioContext.currentTime + offset` — the
  WebAudio clock, not a JS timer — so it plays on time even if the main thread
  is frozen when the moment arrives. The engine re-anchors after the context
  suspends and retries until the browser's autoplay lock is released by a
  gesture.
- **One shared ticker.** `requestAnimationFrame` while visible, a blob-URL Web
  Worker interval while hidden (workers escape most throttling), plus one-shot
  wake-ups registered at each known deadline so side effects — notification,
  haptics, phase transition — fire at the right moment rather than on the next
  throttled tick.

The same care goes into render economy: components subscribe to a quantized
clock (`useNow(resolutionMs)` via `useSyncExternalStore`), so a clock without
seconds re-renders once a minute and a stopwatch showing hundredths gets its
own frames. The document title, cursor visibility and theme are written
imperatively from store subscriptions instead of re-rendering the tree once a
second, and the session store skips its update entirely on ticks where no
deadline was crossed.

The hero digits are sized from a glyph-metric table (`--hero-em`) and the layout
takes `min(width-based, height-based)`, so the display fills the screen without
reflowing as the numbers change.

## Settings

Everything is under `S`:

- **General** — theme, display size, interface position, idle timeout (or never
  hide), hide-cursor, 12/24 hour, which mode to open on, global mute, keep the
  screen awake, tips.
- **Modes** — enable and reorder, then per-mode options and per-alert sound,
  volume and vibration. Six synthesised tones plus silent (no audio files to
  load), each previewable in place.
- **Notifications** — a permission-aware master switch plus one per alerting
  mode, for alerts that land while the tab is in the background.
- **Keyboard** — the full binding list.
- **Tips** — the whole catalogue, so a dismissed tip is never lost, with
  show-again per tip.

Settings are validated on read with zod: every leaf carries a default and a
`catch`, so a value written by an older build, renamed since, or hand-edited in
devtools degrades to its default instead of taking the app down.

## Accessibility

Alerts, phase changes and mode switches are spoken through a polite live region
(with an invisible alternation so a repeated message is re-announced). Faded
chrome is marked `inert` and `aria-hidden`, so it leaves the tab order rather
than becoming an invisible trap. Overlays are Radix dialogs, with focus
management and `Esc` for free. Round dots, lap lists and the tab strip all carry
proper roles and labels.

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run lint       # ESLint
npm run build      # tsc -b && vite build
npm run preview    # serve dist/ (needed to exercise the service worker)
```

Stack: React 19, TypeScript (strict), Tailwind CSS v4 (CSS-first `@theme`, no
config file), Vite 8, zustand + immer for state, zod for the settings schema,
Radix primitives for the overlays and form controls, lucide-react for icons.

```
src/
  lib/          time formatting, WebAudio tones, ticker, haptics,
                notifications, PWA registration, shortcut table
  state/        zod schema, settings / session / ui / tips stores, controller
                (the one place that knows what "start" means per mode)
  hooks/        useNow, ticker-driven title, document chrome, ghost UI,
                hotkeys, alarm engine
  components/   hero display, chrome, mode views, overlays, settings sections
public/         sw.js, manifest, icons
```

The service worker only runs from a build, not from `npm run dev` — use
`npm run build && npm run preview` to test installation and offline behaviour.
