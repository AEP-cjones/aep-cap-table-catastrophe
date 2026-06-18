import type { ReactNode } from 'react'

/**
 * Shared card chrome used across Host + Admin screens.
 *
 * Visual anchors:
 * - 2px gold top-border accent so every panel reads as part of the same system
 * - Navy-light background with a subtle inset top highlight
 * - Optional Bungee section label with a small gold bullet
 * - Optional right-aligned action slot for buttons/badges
 */
export default function Panel({
  title,
  action,
  accent = 'gold',
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  /** Colors the top-border accent + title bullet. Defaults to gold. */
  accent?: 'gold' | 'red'
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const accentColor = accent === 'red' ? 'var(--aep-red)' : 'var(--gold)'

  return (
    <section
      className={`relative bg-[var(--navy-light)] rounded-xl overflow-hidden ${className}`}
      style={{
        borderTop: `2px solid ${accentColor}`,
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.2)',
      }}
    >
      {(title || action) && (
        <header
          className="flex items-center justify-between"
          style={{ padding: '14px 18px 10px 18px' }}
        >
          {title ? (
            <h3
              className="font-bungee uppercase flex items-center"
              style={{
                color: accentColor,
                fontSize: 15,
                letterSpacing: '0.16em',
                gap: 10,
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  background: accentColor,
                  boxShadow: `0 0 10px ${accentColor}`,
                }}
              />
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </header>
      )}
      <div
        className={bodyClassName}
        style={{
          padding: title || action ? '0 18px 18px 18px' : 18,
        }}
      >
        {children}
      </div>
    </section>
  )
}
