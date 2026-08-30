import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { heroEmWidth } from '../lib/time'
import { useUi } from '../state/ui'

interface HeroDisplayProps {
  /** The digits themselves — the only thing on screen that matters. */
  text: string
  /** Small caption above, e.g. the pomodoro phase. */
  caption?: ReactNode
  /** Anything below: round dots, an earned-break estimate, a paused note. */
  meta?: ReactNode
  /** AM/PM, kept out of the digits so it cannot affect their width. */
  suffix?: string | null
  /** Paused or not yet started — shown by holding the digits back, not by a badge. */
  dim?: boolean
  className?: string
}

/**
 * The hero.
 *
 * Size comes from the string's own glyph metrics (`--hero-em`) rather than a
 * breakpoint table, so the digits fill the viewport at any aspect ratio and — the
 * part that matters — never resize between one tick and the next.
 */
export function HeroDisplay({
  text,
  caption,
  meta,
  suffix,
  dim = false,
  className,
}: HeroDisplayProps) {
  const flashKey = useUi((state) => state.flashKey)
  const style = { '--hero-em': String(heroEmWidth(text)) } as CSSProperties

  return (
    <div
      // Remounting on each alarm is what restarts the pulse; there is no state to lose.
      key={flashKey}
      className={cn(
        'flex flex-col items-center',
        flashKey > 0 && 'animate-flash',
        className,
      )}
    >
      {caption ? (
        <div className="chrome-label mb-[1.4vh] opacity-45 transition-opacity duration-500">
          {caption}
        </div>
      ) : null}

      <div
        className={cn(
          'flex items-start transition-opacity duration-500 ease-ghost',
          dim && 'opacity-40',
        )}
        style={style}
      >
        <span className="hero-digits">{text}</span>
        {suffix ? (
          <span className="chrome-label mt-[1.2vh] ml-[0.5vh] opacity-45 sm:mt-[2vh] sm:ml-[1vh]">
            {suffix}
          </span>
        ) : null}
      </div>

      {meta ? <div className="mt-[1.8vh] flex flex-col items-center">{meta}</div> : null}
    </div>
  )
}
