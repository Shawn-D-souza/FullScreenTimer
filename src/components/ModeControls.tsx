import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MINUTE, formatDurationWords } from '../lib/time'
import {
  adjustTimer,
  primaryAction,
  recordLap,
  resetActive,
  skipPhase,
  startPreset,
} from '../state/controller'
import { useSettings } from '../state/settings'
import { useSession } from '../state/session'
import { GhostButton } from './GhostButton'

/**
 * The row of secondary actions above the mode tabs. Everything here is also a
 * keyboard shortcut; this row exists for the pointer, and for discovering that
 * the shortcut is there at all.
 */
export function ModeControls() {
  const mode = useSession((state) => state.activeMode)

  switch (mode) {
    case 'clock':
      return null
    case 'stopwatch':
      return <StopwatchControls />
    case 'timer':
      return <TimerControls />
    case 'pomodoro':
      return <PomodoroControls />
    case 'flowmodoro':
      return <FlowControls />
  }
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-1">{children}</div>
}

function StopwatchControls() {
  const running = useSession((state) => state.stopwatch.running)
  const dirty = useSession(
    (state) => state.stopwatch.accumulated > 0 || state.stopwatch.laps.length > 0,
  )

  return (
    <Row>
      <GhostButton variant="solid" onClick={primaryAction}>
        {running ? 'Pause' : dirty ? 'Resume' : 'Start'}
      </GhostButton>
      <GhostButton onClick={recordLap} disabled={!running}>
        Lap
      </GhostButton>
      <GhostButton onClick={resetActive} disabled={!running && !dirty}>
        Reset
      </GhostButton>
    </Row>
  )
}

function TimerControls() {
  const status = useSession((state) => state.timer.status)
  const presets = useSettings(useShallow((state) => state.modes.timer.presetsMs))
  const idle = status === 'idle'

  return (
    <Row>
      {idle ? (
        <>
          <GhostButton onClick={() => adjustTimer(-MINUTE)} aria-label="One minute less">
            −
          </GhostButton>
          {presets.map((ms) => (
            <GhostButton
              key={ms}
              onClick={() => startPreset(ms)}
              title={`Start a ${formatDurationWords(ms)} timer`}
            >
              {formatDurationWords(ms)}
            </GhostButton>
          ))}
          <GhostButton onClick={() => adjustTimer(MINUTE)} aria-label="One minute more">
            +
          </GhostButton>
        </>
      ) : null}

      <GhostButton variant="solid" onClick={primaryAction}>
        {status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'}
      </GhostButton>

      {status !== 'idle' ? <GhostButton onClick={resetActive}>Reset</GhostButton> : null}
    </Row>
  )
}

function PomodoroControls() {
  const status = useSession((state) => state.pomodoro.status)
  const pending = useSession((state) => state.pomodoro.autoStartAt !== null)

  return (
    <Row>
      <GhostButton variant="solid" onClick={primaryAction}>
        {status === 'running' ? 'Pause' : pending ? 'Start now' : status === 'paused' ? 'Resume' : 'Start'}
      </GhostButton>
      <GhostButton onClick={skipPhase}>Skip</GhostButton>
      <GhostButton onClick={resetActive}>Reset</GhostButton>
    </Row>
  )
}

function FlowControls() {
  const stage = useSession((state) => state.flow.stage)
  const focusRunning = useSession((state) => state.flow.focusRunning)
  const breakStatus = useSession((state) => state.flow.breakStatus)

  const label =
    stage === 'focus'
      ? focusRunning
        ? 'Take a break'
        : 'Start focusing'
      : breakStatus === 'running'
        ? 'Pause break'
        : breakStatus === 'finished'
          ? 'Back to focus'
          : 'Start break'

  return (
    <Row>
      <GhostButton variant="solid" onClick={primaryAction}>
        {label}
      </GhostButton>
      <GhostButton onClick={resetActive}>Reset</GhostButton>
    </Row>
  )
}
