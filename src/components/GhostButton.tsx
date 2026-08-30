import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../lib/cn'
import { useUi } from '../state/ui'

type Variant = 'ghost' | 'solid' | 'icon'

interface GhostButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

const BASE =
  'rounded-full transition-[opacity,background-color,color] duration-200 ease-precise ' +
  'disabled:pointer-events-none disabled:opacity-25'

const VARIANTS: Record<Variant, string> = {
  ghost: 'chrome-label px-3 py-2 opacity-55 hover:opacity-100 focus-visible:opacity-100',
  solid: 'chrome-label bg-ink px-3.5 py-2 text-paper hover:opacity-85',
  icon: 'grid size-9 place-items-center opacity-55 hover:opacity-100 focus-visible:opacity-100',
}

/**
 * Every control in the chrome. Hovering one pins the interface open, so a user
 * reaching for a button never has it fade out from under the cursor.
 */
export function GhostButton({
  variant = 'ghost',
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  ref,
  ...rest
}: GhostButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(BASE, VARIANTS[variant], className)}
      onPointerEnter={(event) => {
        useUi.getState().setHovering(true)
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        useUi.getState().setHovering(false)
        onPointerLeave?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
