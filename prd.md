# Product Requirements Document: Full Screen Timer

## 1. Vision
Monochrome is a fullscreen, black-and-white, distraction-free time tool that unifies a clock, stopwatch, timer, pomodoro, and flowmodoro in a single place. The entire interface disappears when you don't need it and reappears only when you do. Nothing is locked behind an account or a paywall. Everything is configurable.
The guiding principle: **the screen belongs to the user, not the app.**

## 2. Target Users
- Developers, writers, designers, and students who work long sessions at a computer
- People who find existing focus apps too cluttered, too colourful, or too opinionated
- Power users who want keyboard-driven tools
- Anyone who wants a clock visible on a second monitor without visual noise

## 3. Core Principles
- **Ghost UI.** All controls, labels, and navigation are hidden by default. They appear on hover or on a keyboard trigger and fade out when idle. The only thing on screen is the active mode's display.
- **Black and white only.** No colour except pure black and white. Dark mode (white on black) is the default. Light mode (black on white) is available in settings.
- **Everything is configurable.** No decision is forced on the user. Every default can be changed.
- **No account. No paywall. No ads.** The full product is free and works without signing in.
- **Works offline.** The app is installable and fully functional without an internet connection.
- **Runs in the background.** Timers and alarms continue to function when the user switches tabs or minimises the window.

## 4. Modes
The app has five modes. All five are enabled by default. The user can disable any mode or reorder them in settings.

### 4.1 Clock
Displays the current local time in large digits. Seconds can be shown or hidden (configurable). 12h or 24h format (configurable). The clock is **disabled by default** as the default active view — it is a mode the user opts into from settings if they want it as their primary screen. When enabled, it appears as a mode tab alongside the others.

### 4.2 Stopwatch
Counts up from zero. Supports lap recording. Each lap is listed below the main counter and is scrollable. The lap list disappears with the ghost UI when the user is idle.

### 4.3 Timer
Counts down from a user-set duration. When the timer reaches zero, the alarm triggers (sound, vibration, and/or browser notification depending on user settings). The timer does not reset automatically — it stays at 00:00 until the user resets or restarts it.
Quick-pick presets (5 / 10 / 15 / 25 / 45 min) are available as ghost pill buttons that appear on hover, allowing the user to start a timer without opening settings.

### 4.4 Pomodoro
Structured focus sessions with automatic break cycling.
**Default configuration:**
- Work session: 25 minutes
- Short break: 5 minutes
- Rounds before long break: 4
- Long break: 20 minutes
The current round is shown as a subtle dot indicator (e.g. ● ● ○ ○). All four values are fully customisable in settings.
At the end of each phase (work session, short break, long break), the alarm triggers and the next phase is announced before it starts. Auto-start for breaks and work sessions is individually configurable.

### 4.5 Flowmodoro
A flow-state-respecting alternative to Pomodoro. Instead of counting down from a fixed interval, the user starts a stopwatch when they begin working and stops it when they naturally lose focus. The app then calculates the break length as **focused time ÷ 5** and starts the break timer automatically.
Example: 40 minutes of focus → 8 minute break.
A brief explanation of how Flowmodoro works is shown to first-time users via the tips system.

## 5. Ghost UI & Navigation
- All UI chrome (mode switcher, controls, settings access) is **invisible by default**.
- It fades in when the user moves the mouse, presses any key, or taps the screen (mobile).
- It fades out after a configurable idle period (default: 3 seconds of inactivity).
- Mode switching happens via a minimal tab bar that appears at the bottom or top of the screen (configurable) only when the UI is visible.
- A single settings icon appears at the edge of the screen when the UI is visible.

## 6. Keyboard Controls
All actions are available via keyboard. The following shortcuts are defaults and are listed in the shortcuts sheet (accessible via `?`).
| Action | Key |
|---|---|
| Start / pause | `Space` |
| Reset | `R` |
| Next mode | `Tab` |
| Previous mode | `Shift + Tab` |
| Add lap (stopwatch) | `L` |
| Open settings | `S` |
| Open shortcuts | `?` |
| Toggle UI visibility | `H` |
| Toggle dark / light mode | `D` |
Keyboard shortcuts are also listed in the Tips page inside settings.

## 7. Browser Tab & Background Behaviour
- The browser tab title always reflects the active mode's current state. Examples:
  - `24:58 — Pomodoro`
  - `00:03:42 — Stopwatch`
  - `Break — 4:55`
- When running as an installed app or backgrounded tab, timers continue running and alarms still fire.
- Browser notifications fire when a phase ends (requires the user to grant notification permission on first use). Permission is requested contextually — only when the user first starts a timer, not on app load.

## 8. Alerts System
Each mode has its own independently configurable alert profile. Alerts can consist of any combination of:
- **Sound** — a distinct audio tone or chime selected per mode
- **Vibration** — a haptic pattern (on supported devices)
- **Browser notification** — a system-level push notification with the phase name and next action

### 8.1 Sound
Each mode has its own sound selection. Sounds are distinct by default to help users identify which mode just finished without looking at the screen. A handful of built-in tones are provided (e.g. soft chime, clean bell, double-beep, long ring). Volume is independently configurable per mode.

### 8.2 Vibration
A haptic pattern fires alongside the sound on supported devices. Default patterns differ per mode (e.g. a short single pulse for timer, a longer double pulse for pomodoro end, a sustained rhythm for long break). Vibration can be toggled on/off per mode in settings.

### 8.3 Global override
A single "mute all" toggle is accessible from the ghost UI (visible on hover) and from settings. When enabled, no sound, vibration, or notification fires regardless of per-mode settings.

## 9. Settings
Settings are accessed via the ghost UI settings icon or the `S` key. They open as a fullscreen overlay (maintaining the B&W aesthetic) and are organised into sections.

### 9.1 General
- Dark mode / light mode
- Idle timeout (how long before ghost UI fades: 2s / 3s / 5s / never)
- Global mute
- Language / time format (12h / 24h)
- Install app prompt (for PWA installation)

### 9.2 Modes
- Enable or disable each of the five modes (at least one must remain enabled)
- Reorder modes via drag or up/down arrows
- Each mode has its own sub-section:

**Clock sub-section**
- Show/hide seconds
- 12h / 24h (inherits from general but can be overridden)

**Stopwatch sub-section**
- Sound, volume, vibration (on/off) for lap alert and reset

**Timer sub-section**
- Default duration
- Sound, volume, vibration (on/off) for end alert
- Auto-reset on finish (on/off)

**Pomodoro sub-section**
- Work duration
- Short break duration
- Rounds before long break
- Long break duration
- Auto-start breaks (on/off)
- Auto-start next work session (on/off)
- Sound, volume, vibration (on/off) — separately for: work end, short break end, long break end

**Flowmodoro sub-section**
- Sound, volume, vibration (on/off) for break start notification
- A short description of how Flowmodoro works

### 9.3 Notifications
- Master toggle for browser notifications
- Per-mode notification on/off

### 9.4 Keyboard shortcuts
- Full list of all keyboard shortcuts
- Read-only in MVP (custom rebinding is post-MVP)

### 9.5 Tips
- Full list of all tips the app has ever shown
- Toggle to re-enable tips (if user previously dismissed all)
- Per-tip "show again" control

## 10. Tips System
- Tips are short, single-sentence hints that appear once the first time a relevant action is available.
- Each tip has a **"don't show again"** checkbox that is checked by default. The user can uncheck it to make the tip persist.
- Tips never appear more than once per session unless the user re-enables them.
- The full list of tips is available in **Settings → Tips** so users can review everything at any time.
- The very first tip a user sees informs them that all tips can be found in settings.
- Tips use the same ghost UI aesthetic — they appear as a small, unobtrusive label at the edge of the screen and fade with the rest of the UI.

Example tips:
- "Press `Space` to start or pause."
- "Press `?` to see all keyboard shortcuts."
- "You can reorder or disable modes in Settings."
- "All tips are available anytime in Settings → Tips."
- "Flowmodoro sets your break based on how long you actually focused."
- "Install this app for background alarms that work even when the tab is closed."

## 11. Offline & Installation
- The app works fully offline after the first load.
- It can be installed to the home screen or desktop as a standalone app.
- All user settings and preferences are stored locally on the device — no account or sync required.
- Session state (e.g. a running timer) is preserved if the user closes and reopens the app.

## 12. What Is Explicitly Out of Scope for MVP
- User accounts or cloud sync
- Session history or focus analytics
- Ambient sounds or background music
- Custom keyboard shortcut rebinding
- Themes beyond dark and light
- Calendar or task integrations
- Social or sharing features
- Multiple timers running simultaneously

## 13. Success Metrics (MVP)
- User can complete a full Pomodoro session (4 rounds + long break) without touching settings
- User can discover and use all 5 modes within 2 minutes of first load, guided only by tips
- Alarms fire reliably when the tab is in the background and when the app is installed as a PWA
- All core actions are achievable via keyboard alone
- Settings changes persist across browser sessions and app restarts
