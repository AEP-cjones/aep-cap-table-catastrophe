import { useEffect, useState } from 'react'
import type { Answer } from '../types'
import FitText from './FitText'

interface Props {
  answer: Answer
  index: number
  large?: boolean
  /** Audience guesses that matched this answer, split by team (Board only). */
  team1Count?: number
  team2Count?: number
  /** Gate: only show the audience counts once every answer is revealed. */
  showAudienceCount?: boolean
}

export default function AnswerCard({ answer, index, large, team1Count, team2Count, showAudienceCount }: Props) {
  const [justRevealed, setJustRevealed] = useState(false)
  const [wasRevealed, setWasRevealed] = useState(answer.revealed)

  useEffect(() => {
    if (answer.revealed && !wasRevealed) {
      setJustRevealed(true)
      const timer = setTimeout(() => setJustRevealed(false), 800)
      setWasRevealed(true)
      return () => clearTimeout(timer)
    }
    setWasRevealed(answer.revealed)
  }, [answer.revealed])

  const height = large ? 'h-20' : 'h-16'
  const maxFontPx = large ? 24 : 20

  return (
    <div className={`flip-card w-full ${height} ${justRevealed ? 'reveal-glow' : ''}`}>
      <div className={`flip-card-inner ${answer.revealed ? 'revealed' : ''}`}>
        <div className="flip-card-front">
          <span className={`font-bungee ${large ? 'text-5xl' : 'text-4xl'} text-[#3a6a9f]`}>
            {index + 1}
          </span>
        </div>
        {/* Revealed face: auto-fit answer text (shrinks/wraps to fit) + small
            points badge on the right. The 80px side inset on FitText keeps long
            answers clear of the points (right) / audience (left) badges. */}
        <div className="flip-card-back relative">
          <FitText
            text={answer.text}
            maxFontPx={maxFontPx}
            sideInset={80}
            className="font-bungee text-[var(--navy)]"
          />
          <span
            className="absolute font-bungee text-2xl text-white"
            style={{
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: '3.25rem',
              padding: '0.35rem 0.5rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(180deg, #1f4a7a, #143759)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 1px 0 rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            {answer.points}
          </span>
          {/* Audience-guess counts by team — mirror of the points badge,
              anchored left. Blue = Team 1, red = Team 2. Shown once revealed. */}
          {showAudienceCount && ((team1Count ?? 0) + (team2Count ?? 0)) > 0 && (
            <span
              className="absolute font-bungee text-2xl"
              style={{
                left: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0.35rem 0.6rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(180deg, #1f4a7a, #143759)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 1px 0 rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                lineHeight: 1,
              }}
              title="Audience guesses by team"
            >
              <span style={{ color: '#60a5fa' }}>{team1Count ?? 0}</span>
              <span style={{ width: '1px', height: '1.1rem', background: 'rgba(255,255,255,0.28)' }} />
              <span style={{ color: '#f87171' }}>{team2Count ?? 0}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
