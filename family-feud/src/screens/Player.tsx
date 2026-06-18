import { useEffect, useMemo, useState } from 'react'
import AepHeader from '../components/AepHeader'
import {
  useGameState, useConfig, usePublicRounds,
  useAudiencePlayer, useAudienceAnswersForRound,
  joinAudience, submitAudienceAnswer, submitLead,
} from '../hooks/useFirebase'
import { matchGuess } from '../utils/matchAnswer'
import type { Answer } from '../types'

const PLAYER_ID_KEY = 'equityFeudPlayerId'

function getOrCreatePlayerId(): string {
  const existing = localStorage.getItem(PLAYER_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(PLAYER_ID_KEY, id)
  return id
}

export default function Player() {
  const playerId = useMemo(() => getOrCreatePlayerId(), [])
  const gameState = useGameState()
  const config = useConfig()
  const rounds = usePublicRounds()
  const player = useAudiencePlayer(playerId)
  const currentRoundId = gameState?.currentRound
  const audienceAnswers = useAudienceAnswersForRound(currentRoundId)

  if (!gameState || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center title-bg">
        <p className="text-xl opacity-50">Connecting...</p>
      </div>
    )
  }

  // Not joined yet — show team picker
  if (!player) {
    return <JoinScreen playerId={playerId} config={config} />
  }

  // Final → lead capture (auto-appears, Option A)
  if (gameState.status === 'final') {
    return <LeadScreen playerId={playerId} team={player.team} />
  }

  // Title → waiting
  if (gameState.status === 'title') {
    return (
      <WaitingScreen
        player={player}
        configLabel={player.team === 1 ? config.team1Name : config.team2Name}
        message="Game starting soon…"
      />
    )
  }

  // Playing / steal → show current question + answer form
  const round = currentRoundId ? rounds?.[currentRoundId] : null
  const alreadySubmitted = audienceAnswers?.[playerId]
  const roundAnswers = round?.answers ?? null
  const allRevealed =
    !!roundAnswers && roundAnswers.length > 0 && roundAnswers.every((a) => a.revealed)
  return (
    <AnswerScreen
      playerId={playerId}
      team={player.team}
      teamName={player.team === 1 ? config.team1Name : config.team2Name}
      question={round?.question || 'Waiting for round…'}
      hasRound={!!round}
      currentRoundId={currentRoundId || ''}
      alreadySubmittedText={alreadySubmitted?.text || null}
      answers={roundAnswers}
      allRevealed={allRevealed}
    />
  )
}

// ─── Team picker ────────────────────────────────────────────────────────
function JoinScreen({
  playerId,
  config,
}: {
  playerId: string
  config: { team1Name: string; team2Name: string }
}) {
  const [busy, setBusy] = useState<1 | 2 | null>(null)

  const pick = async (team: 1 | 2) => {
    setBusy(team)
    try {
      await joinAudience(playerId, team)
    } catch (err) {
      console.error(err)
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-bungee text-4xl text-[var(--gold)] title-glow text-center">
          Pick Your Team
        </h1>
        <p className="text-center opacity-70 text-lg max-w-sm">
          You'll help your team score audience bonus points by answering questions on your phone.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <TeamButton
            color="blue"
            name={config.team1Name}
            busy={busy === 1}
            onClick={() => pick(1)}
          />
          <TeamButton
            color="red"
            name={config.team2Name}
            busy={busy === 2}
            onClick={() => pick(2)}
          />
        </div>
      </div>
    </div>
  )
}

function TeamButton({
  color, name, busy, onClick,
}: {
  color: 'blue' | 'red'
  name: string
  busy: boolean
  onClick: () => void
}) {
  const styles = color === 'blue'
    ? { bg: 'bg-blue-600 hover:bg-blue-500', glow: 'team-glow-blue' }
    : { bg: 'bg-[var(--aep-red)] hover:brightness-110', glow: 'team-glow-red' }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`${styles.bg} ${styles.glow} font-bungee text-2xl text-white py-6 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50`}
    >
      {busy ? '…' : name}
    </button>
  )
}

// ─── Waiting ────────────────────────────────────────────────────────────
function WaitingScreen({
  player, configLabel, message,
}: {
  player: { team: 1 | 2 }
  configLabel: string
  message: string
}) {
  const accent = player.team === 1 ? 'text-blue-400 team-glow-blue' : 'text-[var(--aep-red)] team-glow-red'
  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="opacity-60 uppercase tracking-widest text-sm">You're on</p>
        <p className={`font-bungee text-4xl ${accent}`}>{configLabel}</p>
        <p className="text-xl opacity-70 mt-6">{message}</p>
      </div>
    </div>
  )
}

// ─── Answer form ────────────────────────────────────────────────────────
function AnswerScreen({
  playerId, team, teamName, question, hasRound, currentRoundId, alreadySubmittedText,
  answers, allRevealed,
}: {
  playerId: string
  team: 1 | 2
  teamName: string
  question: string
  hasRound: boolean
  currentRoundId: string
  alreadySubmittedText: string | null
  answers: Answer[] | null
  allRevealed: boolean
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const accent = team === 1 ? 'text-blue-400 team-glow-blue' : 'text-[var(--aep-red)] team-glow-red'

  // Reset the input when the round changes
  useEffect(() => {
    setText('')
  }, [currentRoundId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await submitAudienceAnswer(playerId, currentRoundId, team, trimmed)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      <div className="flex-1 flex flex-col gap-6 px-5" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="text-center">
          <p className="opacity-60 uppercase tracking-widest text-xs">You're on</p>
          <p className={`font-bungee text-2xl ${accent}`}>{teamName}</p>
        </div>

        <div className="rounded-2xl bg-[var(--navy-light)] border border-white/10 p-5 text-center">
          <p className="opacity-60 uppercase tracking-widest text-xs mb-2">Question</p>
          <h2 className="font-bungee text-2xl text-[var(--gold)] leading-tight">{question}</h2>
        </div>

        {!hasRound ? (
          <p className="text-center opacity-60">Waiting for the host to start a round…</p>
        ) : allRevealed ? (
          <ResultView answers={answers ?? []} myGuess={alreadySubmittedText} accent={accent} />
        ) : alreadySubmittedText ? (
          <div className="rounded-2xl border-2 border-[var(--gold)]/60 p-5 text-center">
            <p className="opacity-60 uppercase tracking-widest text-xs mb-2">Your answer</p>
            <p className="font-bungee text-xl text-[var(--gold)]">{alreadySubmittedText}</p>
            <p className="opacity-50 text-sm mt-4">Waiting for next question…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              placeholder="Your answer…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={120}
              className="rounded-2xl bg-[var(--navy-light)] border-2 border-white/15 px-4 py-4 text-lg text-white outline-none focus:border-[var(--gold)]/70"
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="bg-[var(--gold)] text-black font-bungee text-xl py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Lead capture ────────────────────────────────────────────────────────
function LeadScreen({ playerId, team }: { playerId: string; team: 1 | 2 }) {
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    optIn: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.email.trim()) return
    setBusy(true)
    try {
      await submitLead(playerId, { ...form, team })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col title-bg">
        <AepHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-bungee text-4xl text-[var(--gold)] title-glow">Thanks for playing!</h1>
          <p className="opacity-70 text-lg">We'll be in touch.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      <div className="flex-1 flex flex-col gap-4 px-5" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="text-center mb-2">
          <h1 className="font-bungee text-3xl text-[var(--gold)] title-glow">Thanks for Playing</h1>
          <p className="opacity-70 mt-2">Drop your info and we'll reach out.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="First name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <label className="flex items-start gap-3 mt-2 text-sm opacity-80 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 flex-shrink-0 accent-[var(--gold)]"
              checked={form.optIn}
              onChange={(e) => setForm({ ...form, optIn: e.target.checked })}
            />
            <span>
              Yes, I'd like to receive information about Accelerated Equity Plans solutions.
            </span>
          </label>
          <button
            type="submit"
            disabled={!form.firstName.trim() || !form.email.trim() || busy}
            className="bg-[var(--gold)] text-black font-bungee text-xl py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-40 mt-2"
          >
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="opacity-60 uppercase tracking-widest text-xs">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-xl bg-[var(--navy-light)] border-2 border-white/15 px-4 py-3 text-white outline-none focus:border-[var(--gold)]/70"
      />
    </label>
  )
}

// ─── Personal result (shown once the whole board is revealed) ──────────────
function ResultView({
  answers,
  myGuess,
  accent,
}: {
  answers: Answer[]
  myGuess: string | null
  accent: string
}) {
  const result =
    myGuess && answers.length
      ? matchGuess(
          myGuess,
          answers.map((a, i) => ({ text: a.text, index: i, points: a.points })),
        )
      : null
  const matched = result ? answers[result.index] : null
  const rank = result ? result.index + 1 : 0

  // Didn't get a guess in this round
  if (!myGuess) {
    return (
      <div className="rounded-2xl border-2 border-white/15 p-5 text-center">
        <p className="opacity-60 uppercase tracking-widest text-xs mb-2">Answers are up</p>
        <p className="text-lg opacity-70">You didn't lock in a guess this round.</p>
        <p className="opacity-50 text-sm mt-4">Get ready for the next question…</p>
      </div>
    )
  }

  // Guess matched a board answer
  if (matched) {
    return (
      <div
        className="rounded-2xl border-2 border-[var(--gold)]/70 p-5 text-center"
        style={{ background: 'rgba(255,215,0,0.06)' }}
      >
        <p className="font-bungee text-3xl text-[var(--gold)] title-glow">✓ On the board!</p>
        <p className="opacity-60 uppercase tracking-widest text-xs mt-4 mb-1">Your guess</p>
        <p className="font-bungee text-xl text-white mb-4">"{myGuess}"</p>
        <div className="rounded-xl bg-[var(--navy-light)] border border-[var(--gold)]/40 px-4 py-3">
          <p className={`font-bungee text-2xl ${accent}`}>
            #{rank} · {matched.text}
          </p>
          <p className="font-bungee text-lg text-[var(--gold)] mt-1">{matched.points} pts</p>
        </div>
      </div>
    )
  }

  // Guess didn't match any board answer
  return (
    <div className="rounded-2xl border-2 border-white/15 p-5 text-center">
      <p className="font-bungee text-2xl text-white/80">Not on the board</p>
      <p className="opacity-60 uppercase tracking-widest text-xs mt-4 mb-1">Your guess</p>
      <p className="font-bungee text-xl text-[var(--gold)]">"{myGuess}"</p>
      <p className="opacity-50 text-sm mt-4">Better luck next round!</p>
    </div>
  )
}
