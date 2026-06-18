import { useLayoutEffect, useRef, useState } from 'react'

interface FitTextProps {
  /** Text to display; shrinks (and wraps) to fit the available box. */
  text: string
  /** Largest font size (px) to use when the text already fits comfortably. */
  maxFontPx: number
  /** Smallest font size (px) before we stop shrinking. */
  minFontPx?: number
  /** Horizontal inset (px) on each side, to clear absolutely-positioned badges. */
  sideInset?: number
  /** Applied to the text element (font family / color, etc.). */
  className?: string
}

/**
 * Renders `text` centered in its parent and auto-shrinks the font size (allowing
 * wrapping) so the whole answer fits without clipping or running off the board.
 *
 * Binary-searches the largest font size in [minFontPx, maxFontPx] whose rendered
 * text fits the available width AND height. Because wrapping is allowed, a long
 * answer first wraps at the max size and only shrinks once even the wrapped text
 * would overflow the card height — which keeps long answers as readable as
 * possible. Re-fits on text change and on container resize (ResizeObserver).
 *
 * The parent must be a positioned element — AnswerCard's `.flip-card-back` is
 * `position:absolute`, so the inset zone below anchors to the card box.
 */
export default function FitText({
  text,
  maxFontPx,
  minFontPx = 11,
  sideInset = 0,
  className,
}: FitTextProps) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontPx, setFontPx] = useState(maxFontPx)

  useLayoutEffect(() => {
    const zone = zoneRef.current
    const el = textRef.current
    if (!zone || !el) return

    const fit = () => {
      let lo = minFontPx
      let hi = maxFontPx
      let best = minFontPx
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        el.style.fontSize = `${mid}px`
        const fits = el.scrollWidth <= zone.clientWidth && el.scrollHeight <= zone.clientHeight
        if (fits) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      el.style.fontSize = `${best}px`
      setFontPx(best)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(zone)
    return () => ro.disconnect()
  }, [text, maxFontPx, minFontPx])

  return (
    <div
      ref={zoneRef}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: sideInset,
        right: sideInset,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <span
        ref={textRef}
        className={className}
        style={{
          fontSize: `${fontPx}px`,
          lineHeight: 1.08,
          display: 'block',
          width: '100%',
          textAlign: 'center',
          overflowWrap: 'break-word',
        }}
      >
        {text}
      </span>
    </div>
  )
}
