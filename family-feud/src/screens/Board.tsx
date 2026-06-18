import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  useGameState, useConfig, usePublicRounds,
  useAudiencePlayers, useAudienceAnswersForRound,
} from '../hooks/useFirebase'
import AepHeader from '../components/AepHeader'
import AnswerCard from '../components/AnswerCard'
import StrikeOverlay from '../components/StrikeOverlay'
import { tallyGuessesByTeam } from '../utils/matchAnswer'
import { roundPosition } from '../utils/rounds'
import type { AudiencePlayers } from '../types'

export default function Board() {
  const gameState = useGameState()
  const config = useConfig()
  const rounds = usePublicRounds()
  const players = useAudiencePlayers()
  const audienceCounts = useMemo(() => countByTeam(players), [players])

  // Audience-guess tally for the current round. Only computed (and shown) once
  // every answer is revealed — until then the room sees nothing, per the rules.
  const currentRoundId = gameState?.currentRound
  const audienceAnswers = useAudienceAnswersForRound(currentRoundId)
  const { team1Tally, team2Tally, allRevealed } = useMemo(() => {
    const empty = { team1Tally: [] as number[], team2Tally: [] as number[], allRevealed: false }
    const answers = currentRoundId && rounds ? rounds[currentRoundId]?.answers : undefined
    if (!answers || answers.length === 0) return empty
    if (!answers.every((a) => a.revealed)) return empty
    const canon = answers.map((a, i) => ({ text: a.text, index: i }))
    const guesses = audienceAnswers
      ? Object.values(audienceAnswers).map((g) => ({ text: g.text, team: g.team }))
      : []
    const { team1, team2 } = tallyGuessesByTeam(guesses, canon)
    return { team1Tally: team1, team2Tally: team2, allRevealed: true }
  }, [currentRoundId, rounds, audienceAnswers])

  if (!gameState || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl opacity-50">Connecting...</p>
      </div>
    )
  }

  if (gameState.status === 'title') {
    return <TitleScreen config={config} playerCount={players ? Object.keys(players).length : 0} />
  }

  if (gameState.status === 'final') {
    return <FinalScreen gameState={gameState} config={config} />
  }

  const currentRound = rounds?.[gameState.currentRound]

  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      <div className="flex-1 flex flex-col px-6 pb-6 relative" style={{ paddingTop: '1.75rem' }}>
        <StrikeOverlay strikes={gameState.strikes} />
        <RoundIntroSplash roundId={gameState.currentRound} round={currentRound} position={roundPosition(gameState.currentRound, rounds)} />
        <StealFailedOverlay
          stealFailedAt={gameState.stealFailedAt ?? null}
          originalTeamName={gameState.activeTeam === 1 ? config.team1Name : config.team2Name}
        />

        {/* Steal phase banner OR normal question header */}
        {gameState.status === 'steal' ? (
          <StealBanner
            stealingTeamName={gameState.activeTeam === 1 ? config.team2Name : config.team1Name}
            stealingSide={gameState.activeTeam === 1 ? 'right' : 'left'}
          />
        ) : (
          <div className="text-center" style={{ marginBottom: '3.75rem' }}>
            <p className="font-bungee text-sm tracking-widest text-white/30 tagline-pulse" style={{ marginBottom: '0.5rem' }}>
              SURVEY SAYS…
            </p>
            <h2 className="font-bungee text-4xl text-[var(--gold)] title-glow">
              {currentRound?.question || 'Waiting for round...'}
            </h2>
          </div>
        )}

        {/* Answer Board — 2-column layout in a marquee-light stage */}
        <div className="flex items-start justify-center">
          <div className="w-full max-w-5xl">
            <MarqueeFrame>
              <div
                style={{
                  border: '2px solid rgba(255, 215, 0, 0.28)',
                  borderRadius: '1.25rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(180deg, rgba(13,33,55,0.55), rgba(10,22,40,0.75))',
                  boxShadow: 'inset 0 0 40px rgba(255,215,0,0.05), 0 0 30px rgba(0,0,0,0.35)',
                }}
              >
                {currentRound?.answers ? (
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gridTemplateRows: `repeat(${Math.ceil(currentRound.answers.length / 2)}, minmax(0, 1fr))`,
                      gridAutoFlow: 'column',
                    }}
                  >
                    {currentRound.answers.map((answer, i) => (
                      <AnswerCard
                        key={i}
                        answer={answer}
                        index={i}
                        large
                        team1Count={team1Tally[i]}
                        team2Count={team2Tally[i]}
                        showAudienceCount={allRevealed}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center opacity-50 text-xl py-8">No round loaded</p>
                )}
              </div>
            </MarqueeFrame>
          </div>
        </div>

        {/* Round Points — gold pill. Generous top margin keeps it clear of
            the outer marquee ring (bulb center 28px below stage + ~16px glow)
            and gives breathing room before the score band. */}
        <div className="text-center" style={{ marginTop: '5rem', marginBottom: '0.75rem' }}>
          <RoundPointsPill value={gameState.roundPoints} />
        </div>

        {/* Scores row — centered band with owl between the two score cards.
            During the steal phase the "THEIR TURN" pointer follows the
            stealing team (not the one that struck out). */}
        <div className="flex items-center justify-center gap-12 self-center" style={{ marginTop: '2rem' }}>
          <TeamScore
            name={config.team1Name}
            score={gameState.team1Score}
            active={
              gameState.status === 'steal'
                ? gameState.activeTeam !== 1
                : gameState.activeTeam === 1
            }
            audienceCount={audienceCounts.team1}
            side="left"
          />
          <div className="flex flex-col items-center shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}Game_Show_Owl.webp`}
              alt="Equity Family Feud Owl"
              className="owl-idle object-contain"
              style={{ width: 180, height: 180, filter: 'drop-shadow(0 0 40px rgba(255,200,50,0.45)) drop-shadow(0 0 80px rgba(172,34,40,0.35))' }}
            />
          </div>
          <TeamScore
            name={config.team2Name}
            score={gameState.team2Score}
            active={
              gameState.status === 'steal'
                ? gameState.activeTeam !== 2
                : gameState.activeTeam === 2
            }
            audienceCount={audienceCounts.team2}
            side="right"
          />
        </div>
      </div>
    </div>
  )
}

function TitleScreen({
  config,
  playerCount,
}: {
  config: { team1Name: string; team2Name: string }
  playerCount: number
}) {
  const playUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}play` : '/play'
  return (
    <div className="min-h-screen flex flex-col title-bg">
      <AepHeader />
      {/* Title banner anchored near the top (uses the top space instead of
          floating in dead-center), then a hero row that GROWS to fill the rest
          of the height — owl left, teams center, big QR right. */}
      <div className="flex-1 flex flex-col" style={{ padding: '72px 80px 56px' }}>
        <div className="text-center shrink-0">
          <h1 className="font-bungee text-7xl text-[var(--gold)] title-glow" style={{ lineHeight: 1.05 }}>
            EQUITY FAMILY FEUD
          </h1>
          <p className="font-bungee text-xl tracking-[0.4em] text-white/35 tagline-pulse mt-6">
            SURVEY SAYS...
          </p>
        </div>

        {/* Symmetric 1fr / auto / 1fr grid so the matchup is truly screen-
            centered (aligned under the title), with owl + QR balanced in equal
            side columns. Inline grid avoids the Tailwind-JIT class issue. */}
        <div
          className="flex-1"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', columnGap: 40, marginTop: 24 }}
        >
          {/* LEFT — mascot, centered in its column */}
          <div style={{ justifySelf: 'center' }}>
            <img
              src={`${import.meta.env.BASE_URL}Game_Show_Owl.webp`}
              alt="Equity Family Feud Owl"
              className="owl-idle object-contain"
              style={{ width: 380, height: 302, filter: 'drop-shadow(0 0 60px rgba(255,200,50,0.5)) drop-shadow(0 0 100px rgba(172,34,40,0.4))' }}
            />
          </div>

          {/* CENTER — the matchup (screen-centered via equal 1fr sides) */}
          <div className="flex flex-col items-center gap-5">
            <p className="font-bungee text-sm tracking-[0.35em] text-white/35">TONIGHT'S MATCHUP</p>
            <div className="flex flex-col items-center gap-3 text-6xl font-bungee leading-tight text-center">
              <span className="text-blue-400 team-glow-blue">{config.team1Name}</span>
              <span className="text-white/30 text-3xl">VS</span>
              <span className="text-[var(--aep-red)] team-glow-red">{config.team2Name}</span>
            </div>
          </div>

          {/* RIGHT — scan-to-play + big QR + live join count */}
          <div className="flex flex-col items-center gap-3" style={{ justifySelf: 'center' }}>
            <p className="font-bungee text-base tracking-widest text-white/70 tagline-pulse">📱 SCAN TO PLAY</p>
            <div className="bg-white p-4 rounded-2xl" style={{ boxShadow: '0 0 44px rgba(255,255,255,0.2)' }}>
              <QRCodeSVG value={playUrl} size={240} />
            </div>
            <p className="font-bungee text-lg tracking-widest text-white/80 mt-2">
              <span className="text-[var(--gold)] title-glow">{playerCount}</span>{' '}
              {playerCount === 1 ? 'PLAYER' : 'PLAYERS'} JOINED
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FinalScreen({
  gameState,
  config,
}: {
  gameState: { team1Score: number; team2Score: number }
  config: { team1Name: string; team2Name: string }
}) {
  const winner =
    gameState.team1Score > gameState.team2Score
      ? config.team1Name
      : gameState.team2Score > gameState.team1Score
        ? config.team2Name
        : "It's a tie!"
  const isTie = gameState.team1Score === gameState.team2Score

  return (
    <div className="min-h-screen flex flex-col">
      <AepHeader />
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <img
          src={`${import.meta.env.BASE_URL}Game_Show_Owl.webp`}
          alt="Equity Family Feud Owl"
          className="owl-idle object-contain"
          style={{ width: 420, height: 420, filter: 'drop-shadow(0 0 40px rgba(255,200,50,0.45)) drop-shadow(0 0 80px rgba(172,34,40,0.35))' }}
        />
        <h1 className="font-bungee text-6xl text-[var(--gold)] title-glow">FINAL SCORE</h1>
        <div className="flex gap-16 items-center">
          <div className="text-center">
            <p className="font-bungee text-3xl text-blue-400 mb-2">{config.team1Name}</p>
            <p className="font-bungee text-6xl text-white">{gameState.team1Score}</p>
          </div>
          <span className="font-bungee text-4xl text-white opacity-30">—</span>
          <div className="text-center">
            <p className="font-bungee text-3xl text-[var(--aep-red)] mb-2">{config.team2Name}</p>
            <p className="font-bungee text-6xl text-white">{gameState.team2Score}</p>
          </div>
        </div>
        {!isTie && (
          <p className="font-bungee text-5xl text-[var(--gold)] mt-4 title-glow">
            {winner} Wins!
          </p>
        )}
        {isTie && (
          <p className="font-bungee text-5xl text-[var(--gold)] mt-4 title-glow">It's a Tie!</p>
        )}
      </div>
    </div>
  )
}

function TeamScore({
  name,
  score,
  active,
  audienceCount,
  side,
}: {
  name: string
  score: number
  active: boolean
  audienceCount: number
  side: 'left' | 'right'
}) {
  const accent = side === 'left' ? 'text-blue-400 team-glow-blue' : 'text-[var(--aep-red)] team-glow-red'
  const pop = usePopOnChange(score)
  return (
    <div className="shrink-0 basis-[360px] relative">
      {active && (
        <p
          className="absolute left-0 right-0 text-center font-bungee tracking-widest text-[var(--gold)] turn-pointer pointer-events-none"
          style={{ top: '-1.6rem', fontSize: '0.75rem', letterSpacing: '0.25em' }}
        >
          THEIR TURN ▼
        </p>
      )}
      <div
        className={`text-center px-6 py-5 rounded-2xl border-2 transition-all ${
          active
            ? 'bg-[var(--navy-light)] border-[var(--gold)] scale-105 shadow-[0_0_40px_rgba(255,215,0,0.55)]'
            : 'bg-[var(--navy-light)]/60 border-white/10 opacity-80'
        }`}
      >
        <p className={`font-bungee text-2xl mb-2 truncate ${accent}`}>{name}</p>
        <p className={`font-bungee text-6xl text-[var(--gold)] title-glow ${pop ? 'score-pop' : ''}`}>
          {score}
        </p>
        <p className="text-xs opacity-60 tracking-widest uppercase mt-2">
          👥 {audienceCount} {audienceCount === 1 ? 'fan' : 'fans'}
        </p>
      </div>
    </div>
  )
}

/**
 * Banner shown above the answer board during the steal phase.
 * Takes the place of the "SURVEY SAYS / question" block.
 */
function StealBanner({
  stealingTeamName,
  stealingSide,
}: {
  stealingTeamName: string
  stealingSide: 'left' | 'right'
}) {
  const accent = stealingSide === 'left' ? 'text-blue-400 team-glow-blue' : 'text-[var(--aep-red)] team-glow-red'
  return (
    <div className="text-center" style={{ marginBottom: '3.75rem' }}>
      <p className="font-bungee text-sm tracking-widest text-white/40 tagline-pulse" style={{ marginBottom: '0.5rem' }}>
        ⚡ STEAL ⚡
      </p>
      <h2 className="font-bungee text-4xl title-glow">
        <span className={accent}>{stealingTeamName}</span>
        <span className="text-[var(--gold)]"> — One Guess to Steal It</span>
      </h2>
    </div>
  )
}

/**
 * Full-screen overlay that fires briefly when `stealFailedAt` is set
 * within the last ~3 seconds. Reuses the existing strike-X animation
 * plus a "STEAL FAILED" banner and the original team name.
 *
 * The timestamp-based trigger means any late state read from Firebase
 * naturally self-expires — no cleanup needed on the Host side.
 */
function StealFailedOverlay({
  stealFailedAt,
  originalTeamName,
}: {
  stealFailedAt: number | null
  originalTeamName: string
}) {
  const DURATION_MS = 2800
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!stealFailedAt) {
      setShow(false)
      return
    }
    const age = Date.now() - stealFailedAt
    if (age >= DURATION_MS) {
      setShow(false)
      return
    }
    setShow(true)
    const t = setTimeout(() => setShow(false), DURATION_MS - age)
    return () => clearTimeout(t)
  }, [stealFailedAt])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 splash-fade pointer-events-none"
      style={{ background: 'rgba(10, 22, 40, 0.78)', backdropFilter: 'blur(4px)' }}
    >
      <div className="screen-shake flex gap-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="strike-x text-[160px] font-bungee text-[var(--strike-red)] leading-none"
            style={{
              textShadow: '0 0 40px rgba(255, 23, 68, 0.8), 0 0 80px rgba(255, 23, 68, 0.4)',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            X
          </div>
        ))}
      </div>
      <h1 className="font-bungee text-6xl text-[var(--strike-red)] splash-scale"
        style={{ textShadow: '0 0 30px rgba(255,23,68,0.6)' }}
      >
        STEAL FAILED
      </h1>
      <p className="font-bungee text-2xl text-white splash-sub">
        Points to <span className="text-[var(--gold)]">{originalTeamName}</span>
      </p>
    </div>
  )
}

/**
 * Vegas-marquee chase lights wrapped around the answer board. Two concentric
 * rings of gold bulbs sit just outside the inner stage border. Each bulb is
 * placed so its center sits the requested `offset` pixels outside the edge
 * (NOT using translate(-50%) which would pull the right/bottom bulbs inside
 * the container). The two rings use different phase offsets and slightly
 * different loop durations so the chase drifts and layers.
 */
function MarqueeFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const measure = () => {
      const r = el.getBoundingClientRect()
      setDims({ w: r.width, h: r.height })
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Pick edge bulb counts from stage aspect ratio. Both rings use the SAME
  // nHoriz/nVert so every bulb on the outer ring sits directly outside the
  // matching inner-ring bulb (concentric, no drift around the frame).
  const TARGET_SPACING = 54
  // Edge bulbs are inset by EDGE_INSET from the actual stage corners on
  // BOTH axes — so each corner cluster (top-last + diagonal + side-first)
  // has uniform spacing instead of one tight pair next to a looser pair.
  const EDGE_INSET = 14
  const nHoriz = dims
    ? Math.max(2, Math.round((dims.w - 2 * EDGE_INSET) / TARGET_SPACING) + 1)
    : 0
  const nVert = dims
    ? Math.max(2, Math.round((dims.h - 2 * EDGE_INSET) / TARGET_SPACING) + 1)
    : 0

  return (
    <div ref={ref} className="relative">
      {dims && (
        <>
          {/* Both rings share nHoriz/nVert AND loopSeconds so bulb `i` on
              the outer ring fires at exactly the same moment as bulb `i`
              on the inner ring — the two concentric bulbs pulse together
              as one "fat" highlight that rotates around the frame. */}
          <MarqueeRing dims={dims} offset={12} nHoriz={nHoriz} nVert={nVert} edgeInset={EDGE_INSET} size={10} loopSeconds={2} />
          <MarqueeRing dims={dims} offset={28} nHoriz={nHoriz} nVert={nVert} edgeInset={EDGE_INSET} size={7} loopSeconds={2} />
        </>
      )}
      {children}
    </div>
  )
}

/**
 * A single ring of chase bulbs around the perimeter. `offset` pushes the
 * bulb centers that many pixels outside the container edge. `phase` shifts
 * each bulb along its edge by that fraction of one slot (0 = slot-centered,
 * 0.5 = half a slot, landing between the inner ring's bulbs).
 */
/**
 * Places bulbs along each edge of the stage using STAGE-relative coordinates
 * (not expanded-rectangle-relative). Top/bottom edges place nHoriz bulbs
 * inclusive of both corners; side edges place nVert bulbs exclusive of
 * corners (since corners are covered by top/bottom). Because both rings
 * use identical nHoriz/nVert and the same stage coordinates, every outer
 * bulb sits directly outside the matching inner bulb — rings stay
 * concentric the whole way around, no drift.
 */
function MarqueeRing({
  dims,
  offset,
  nHoriz,
  nVert,
  edgeInset,
  size,
  loopSeconds,
}: {
  dims: { w: number; h: number }
  offset: number
  nHoriz: number
  nVert: number
  edgeInset: number
  size: number
  loopSeconds: number
}) {
  const half = size / 2
  const bulbBase: React.CSSProperties = {
    width: size,
    height: size,
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
  }

  const bulbs: Array<{ key: string; style: React.CSSProperties }> = []
  const horizSpan = dims.w - 2 * edgeInset
  const vertSpan = dims.h - 2 * edgeInset

  // Top edge — bulbs span x=edgeInset to x=w-edgeInset (corners pulled in
  // by edgeInset so the corner cluster has uniform spacing).
  for (let i = 0; i < nHoriz; i++) {
    const x = edgeInset + (i / Math.max(1, nHoriz - 1)) * horizSpan
    bulbs.push({
      key: `t${i}`,
      style: { ...bulbBase, top: -offset - half, left: x - half },
    })
  }
  // Diagonal TR corner bulb (at 45°, outside the stage corner).
  bulbs.push({
    key: 'c-tr',
    style: { ...bulbBase, top: -offset - half, right: -offset - half },
  })
  // Right edge — bulbs span y=edgeInset to y=h-edgeInset.
  for (let i = 0; i < nVert; i++) {
    const y = edgeInset + (i / Math.max(1, nVert - 1)) * vertSpan
    bulbs.push({
      key: `r${i}`,
      style: { ...bulbBase, right: -offset - half, top: y - half },
    })
  }
  // Diagonal BR corner bulb
  bulbs.push({
    key: 'c-br',
    style: { ...bulbBase, bottom: -offset - half, right: -offset - half },
  })
  // Bottom edge — same horizontal inset, reversed for clockwise flow
  for (let i = nHoriz - 1; i >= 0; i--) {
    const x = edgeInset + (i / Math.max(1, nHoriz - 1)) * horizSpan
    bulbs.push({
      key: `b${i}`,
      style: { ...bulbBase, bottom: -offset - half, left: x - half },
    })
  }
  // Diagonal BL corner bulb
  bulbs.push({
    key: 'c-bl',
    style: { ...bulbBase, bottom: -offset - half, left: -offset - half },
  })
  // Left edge — same vertical inset, reversed for clockwise flow
  for (let i = nVert - 1; i >= 0; i--) {
    const y = edgeInset + (i / Math.max(1, nVert - 1)) * vertSpan
    bulbs.push({
      key: `l${i}`,
      style: { ...bulbBase, left: -offset - half, top: y - half },
    })
  }
  // Diagonal TL corner bulb (completes the cycle)
  bulbs.push({
    key: 'c-tl',
    style: { ...bulbBase, top: -offset - half, left: -offset - half },
  })

  const total = bulbs.length
  return (
    <>
      {bulbs.map((b, idx) => (
        <span
          key={b.key}
          className="marquee-bulb"
          style={{
            ...b.style,
            animation: `bulbChase ${loopSeconds}s ease-in-out infinite`,
            animationDelay: `${(idx / total) * loopSeconds}s`,
          }}
        />
      ))}
    </>
  )
}

/**
 * Briefly overlays a "ROUND X" splash + question reveal when the current
 * round changes. Does NOT fire on initial mount (useRef seeds with the
 * first roundId seen), only on subsequent transitions — so a page reload
 * mid-game doesn't re-show the splash.
 */
function RoundIntroSplash({
  roundId,
  round,
  position,
}: {
  roundId: string
  round: { question: string } | undefined
  position: number
}) {
  const [show, setShow] = useState(false)
  const [label, setLabel] = useState('')
  const [question, setQuestion] = useState('')
  const prev = useRef(roundId)
  // Latest play-position, read by the round-change effect without being a dep
  // (so reordering the current round doesn't re-fire the splash).
  const positionRef = useRef(position)
  positionRef.current = position

  useEffect(() => {
    if (roundId === prev.current) return
    prev.current = roundId
    if (!roundId) {
      setShow(false)
      return
    }
    setLabel(positionRef.current > 0 ? `ROUND ${positionRef.current}` : roundId.toUpperCase())
    setQuestion(round?.question || '')
    setShow(true)
    const t = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(t)
  }, [roundId, round?.question])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 splash-fade"
      style={{ background: 'rgba(10, 22, 40, 0.82)', backdropFilter: 'blur(6px)' }}
    >
      <p className="font-bungee text-lg tracking-widest text-white/50 splash-sub">NEXT UP</p>
      <h1 className="font-bungee text-7xl text-[var(--gold)] title-glow splash-scale">{label}</h1>
      {question && (
        <p className="font-bungee text-2xl text-white max-w-3xl text-center px-8 splash-sub">
          {question}
        </p>
      )}
    </div>
  )
}

function RoundPointsPill({ value }: { value: number }) {
  const pop = usePopOnChange(value)
  return (
    <span
      className="inline-flex items-center gap-3 rounded-full border-2 font-bungee"
      style={{
        padding: '0.5rem 1.5rem',
        borderColor: 'rgba(255, 215, 0, 0.5)',
        background: 'rgba(255, 215, 0, 0.08)',
        boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)',
      }}
    >
      <span className="text-base text-white/60 tracking-widest uppercase">Round Points</span>
      <span className={`text-3xl text-[var(--gold)] title-glow ${pop ? 'score-pop' : ''}`}>{value}</span>
    </span>
  )
}

/**
 * Returns true for ~400ms whenever `value` changes, so the caller can
 * apply the .score-pop animation class. First render returns false.
 */
function usePopOnChange(value: number): boolean {
  const [pop, setPop] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (value === prev.current) return
    prev.current = value
    setPop(true)
    const t = setTimeout(() => setPop(false), 400)
    return () => clearTimeout(t)
  }, [value])
  return pop
}

function countByTeam(players: AudiencePlayers | null): { team1: number; team2: number } {
  if (!players) return { team1: 0, team2: 0 }
  let t1 = 0
  let t2 = 0
  for (const p of Object.values(players)) {
    if (p.team === 1) t1++
    else if (p.team === 2) t2++
  }
  return { team1: t1, team2: t2 }
}
