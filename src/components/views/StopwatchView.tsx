import { useShallow } from 'zustand/react/shallow'
import { cn } from '../../lib/cn'
import { SECOND, formatStopwatch } from '../../lib/time'
import { useSettings } from '../../state/settings'
import { stopwatchElapsed, useSession } from '../../state/session'
import { useNow } from '../../hooks/useNow'
import { HeroDisplay } from '../HeroDisplay'

export function StopwatchView() {
  const centiseconds = useSettings((state) => state.modes.stopwatch.centiseconds)
  const session = useSession(useShallow((state) => state.stopwatch))

  // Hundredths need every frame; whole seconds emphatically do not.
  const now = useNow(centiseconds ? 10 : SECOND)
  const elapsed = stopwatchElapsed(session, now)

  return (
    <>
      <HeroDisplay
        text={formatStopwatch(elapsed, centiseconds)}
        dim={!session.running && elapsed > 0}
        caption={!session.running && elapsed > 0 ? 'Paused' : undefined}
      />
      <LapList laps={session.laps} centiseconds={centiseconds} />
    </>
  )
}

function LapList({ laps, centiseconds }: { laps: number[]; centiseconds: boolean }) {
  if (laps.length === 0) return null

  return (
    <ol
      // Data, not chrome: laps stay readable after the interface has faded away.
      className="scroll-quiet mt-[3vh] max-h-[24vh] w-[min(24rem,84vw)] overflow-y-auto"
      aria-label="Laps"
      data-no-tap
    >
      {laps.map((total, index) => {
        const previous = laps[index + 1] ?? 0
        const number = laps.length - index
        return (
          <li
            key={`${number}-${total}`}
            className={cn(
              'rule-b flex items-baseline justify-between gap-4 py-2 tabular-nums',
              index === 0 ? 'opacity-100' : 'opacity-45',
            )}
          >
            <span className="chrome-label-sm opacity-70">Lap {number}</span>
            <span className="chrome-label">{formatStopwatch(total - previous, centiseconds)}</span>
            <span className="chrome-label-sm w-24 text-right opacity-70">
              {formatStopwatch(total, centiseconds)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
