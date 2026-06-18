import { useEffect, useState } from 'react'

interface Props {
  strikes: number
}

export default function StrikeOverlay({ strikes }: Props) {
  const [showStrike, setShowStrike] = useState(false)
  const [prevStrikes, setPrevStrikes] = useState(0)

  useEffect(() => {
    if (strikes > prevStrikes && strikes > 0) {
      setShowStrike(true)
      const timer = setTimeout(() => setShowStrike(false), 2000)
      setPrevStrikes(strikes)
      return () => clearTimeout(timer)
    }
    setPrevStrikes(strikes)
  }, [strikes])

  if (!showStrike) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="screen-shake flex gap-8">
        {Array.from({ length: strikes }).map((_, i) => (
          <div
            key={i}
            className="strike-x text-[200px] font-bungee text-[var(--strike-red)] leading-none"
            style={{
              textShadow: '0 0 40px rgba(255, 23, 68, 0.8), 0 0 80px rgba(255, 23, 68, 0.4)',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            X
          </div>
        ))}
      </div>
    </div>
  )
}
