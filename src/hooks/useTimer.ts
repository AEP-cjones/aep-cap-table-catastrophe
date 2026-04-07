import { useState, useEffect } from 'react'

/**
 * Returns the number of seconds remaining based on questionStartTime from Firebase.
 * Counts down from timeLimit to 0.
 */
export function useTimer(questionStartTime: number | null, timeLimit: number): number {
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit)

  useEffect(() => {
    if (questionStartTime === null) {
      setTimeRemaining(timeLimit)
      return
    }

    const tick = () => {
      const elapsed = (Date.now() - questionStartTime) / 1000
      const remaining = Math.max(0, timeLimit - elapsed)
      setTimeRemaining(Math.ceil(remaining))
    }

    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [questionStartTime, timeLimit])

  return timeRemaining
}
