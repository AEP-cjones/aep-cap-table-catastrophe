import { useEffect, useState, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { GameState, GameConfig, Player, Answer, Question } from '../../types'
import {
  subscribeToGameState,
  subscribeToPlayers,
  subscribeToConfig,
  subscribeToAnswers,
  subscribeToReactions,
  initializeGame,
  startGame,
  advanceToQuestion,
  showQuestionIntro,
  revealAnswer,
  showLeaderboard,
  endGame,
  resetGame,
  updatePlayerScore,
  updatePlayerLastAnswer,
  getQuestions,
  initializeQuestionsFromJson,
  startQuestion,
  clearReactions,
} from '../../firebase/gameService'
import { useTimer } from '../../hooks/useTimer'
import Header from '../shared/Header'
import questionsData from '../../data/questions.json'
import type { Question as QuestionType } from '../../types'
import { shuffleChoices } from '../../utils/shuffle'

const CHOICE_LABELS = ['A', 'B', 'C', 'D']
const ANSWER_REVEAL_DURATION = 5
const LEADERBOARD_DURATION = 10

// Stable confetti particles — defined outside component so they never reshuffle
const CONFETTI_PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${(i * 1.7) % 100}%`,
  color: ['#AC2228', '#FFD700', '#ffffff', '#4ade80', '#60a5fa', '#f472b6'][i % 6],
  delay: `${(i * 0.07) % 2.5}s`,
  duration: `${2.8 + (i % 5) * 0.4}s`,
  size: `${7 + (i % 5)}px`,
  isCircle: i % 3 !== 0,
}))

function Confetti() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {CONFETTI_PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: '-20px',
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animation: `confettiFall ${p.duration} ${p.delay} linear infinite`,
          }}
        />
      ))}
    </div>
  )
}

export default function HostScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [phaseCountdown, setPhaseCountdown] = useState(0)

  // Reaction bubbles
  const [reactionBubbles, setReactionBubbles] = useState<Array<{ id: string; player: string; reaction: string }>>([])
  const lastReactionCount = useRef(0)

  const answersRef = useRef<Record<string, Answer>>({})
  const playersRef = useRef<Record<string, Player>>({})
  const gameStateRef = useRef<GameState | null>(null)
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { gameStateRef.current = gameState }, [gameState])

  const revealTriggered = useRef(false)

  const status = gameState?.status ?? 'lobby'
  const currentIndex = gameState?.currentQuestionIndex ?? 0
  const questionStartTime = gameState?.questionStartTime ?? null
  const timeLimit = config?.timeLimit ?? 20

  const timeRemaining = useTimer(
    status === 'question' ? questionStartTime : null,
    timeLimit
  )

  useEffect(() => {
    initializeGame().then(() => {
      initializeQuestionsFromJson(questionsData as QuestionType[]).then(() => {
        getQuestions().then(setQuestions)
      })
    })
  }, [])

  useEffect(() => { const u = subscribeToGameState(setGameState); return u }, [])
  useEffect(() => { const u = subscribeToConfig(setConfig); return u }, [])
  useEffect(() => { const u = subscribeToPlayers(setPlayers); return u }, [])

  useEffect(() => {
    if (status === 'question' || status === 'answer_reveal') {
      const u = subscribeToAnswers(currentIndex, setAnswers)
      return u
    }
    setAnswers({})
  }, [status, currentIndex])

  // Subscribe to reactions — show bubbles on host screen
  useEffect(() => {
    const unsub = subscribeToReactions((reactions) => {
      const entries = Object.values(reactions)
      if (entries.length > lastReactionCount.current) {
        const newReactions = entries.slice(lastReactionCount.current)
        for (const r of newReactions) {
          const id = `${r.timestamp}-${r.player}`
          setReactionBubbles((prev) => [...prev, { id, player: r.player, reaction: r.reaction }])
          setTimeout(() => {
            setReactionBubbles((prev) => prev.filter((b) => b.id !== id))
          }, 4000)
        }
      }
      lastReactionCount.current = entries.length
    })
    return unsub
  }, [])

  // Reset reaction count when question changes
  useEffect(() => {
    lastReactionCount.current = 0
  }, [currentIndex])

  useEffect(() => {
    if (!gameState) return
    const ids: string[] = gameState.selectedQuestionIds ?? []
    if (ids.length === 0) return
    const qId = ids[currentIndex]
    if (qId && questions[qId]) setCurrentQuestion(questions[qId])
  }, [currentIndex, gameState?.selectedQuestionIds, questions])

  useEffect(() => { revealTriggered.current = false }, [currentIndex])

  const handleRevealAnswer = useCallback(async () => {
    if (revealTriggered.current) return
    revealTriggered.current = true
    await revealAnswer()
    const currentAnswers = answersRef.current
    const currentPlayers = playersRef.current
    for (const [pid, answer] of Object.entries(currentAnswers)) {
      if (answer.isCorrect) {
        const score = currentPlayers[pid]?.score ?? 0
        await updatePlayerScore(pid, score + answer.points)
        await updatePlayerLastAnswer(pid, true, answer.points)
      } else {
        await updatePlayerLastAnswer(pid, false, 0)
      }
    }
  }, [])

  const handleNextQuestion = useCallback(async () => {
    const gs = gameStateRef.current
    if (!gs) return
    const ids: string[] = gs.selectedQuestionIds ?? []
    const nextIndex = (gs.currentQuestionIndex ?? 0) + 1
    if (nextIndex >= ids.length) {
      await endGame()
    } else {
      await advanceToQuestion(nextIndex, ids)
    }
  }, [])

  useEffect(() => {
    if (status !== 'question') return
    if (timeRemaining > 0) return
    handleRevealAnswer()
  }, [timeRemaining, status, handleRevealAnswer])

  useEffect(() => {
    if (status !== 'question') return
    const playerCount = Object.keys(players).length
    const answerCount = Object.keys(answers).length
    if (playerCount === 0 || answerCount < playerCount) return
    const t = setTimeout(handleRevealAnswer, 1500)
    return () => clearTimeout(t)
  }, [Object.keys(answers).length, Object.keys(players).length, status, handleRevealAnswer])

  useEffect(() => {
    if (status !== 'answer_reveal') return
    setPhaseCountdown(ANSWER_REVEAL_DURATION)
    const countdown = setInterval(() => setPhaseCountdown((n) => Math.max(0, n - 1)), 1000)
    const advance = setTimeout(showLeaderboard, ANSWER_REVEAL_DURATION * 1000)
    return () => { clearInterval(countdown); clearTimeout(advance) }
  }, [status])

  useEffect(() => {
    if (status !== 'leaderboard') return
    setPhaseCountdown(LEADERBOARD_DURATION)
    const countdown = setInterval(() => setPhaseCountdown((n) => Math.max(0, n - 1)), 1000)
    const advance = setTimeout(handleNextQuestion, LEADERBOARD_DURATION * 1000)
    return () => { clearInterval(countdown); clearTimeout(advance) }
  }, [status, handleNextQuestion])

  // Question intro → auto-advance to question after 3 seconds
  const QUESTION_INTRO_DURATION = 3
  useEffect(() => {
    if (status !== 'question_intro') return
    const advance = setTimeout(async () => {
      await clearReactions()
      await startQuestion()
    }, QUESTION_INTRO_DURATION * 1000)
    return () => clearTimeout(advance)
  }, [status, currentIndex])

  const handleStartGame = async () => {
    const allQuestions = await getQuestions()
    const activeIds = Object.values(allQuestions).filter((q) => q.active).map((q) => q.id)
    const perGame = config?.questionsPerGame ?? 10
    let selected: string[]
    if (config?.randomizeOrder !== false) {
      const arr = [...activeIds]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      selected = arr.slice(0, Math.min(perGame, arr.length))
    } else {
      selected = activeIds.slice(0, Math.min(perGame, activeIds.length))
    }
    await startGame(selected)
  }

  const handleReset = async () => {
    if (window.confirm('Reset the game and clear all players?')) await resetGame()
  }

  if (!config || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1420' }}>
        <div className="text-white text-2xl animate-pulse">Loading...</div>
      </div>
    )
  }

  const selectedIds: string[] = gameState.selectedQuestionIds ?? []
  const safeChoices: string[] = currentQuestion?.choices ?? []
  const { shuffledChoices: displayChoices, newCorrectIndex } = currentQuestion
    ? shuffleChoices(currentQuestion.choices, currentQuestion.id)
    : { shuffledChoices: safeChoices, newCorrectIndex: (i: number) => i }
  const displayCorrectIndex = currentQuestion ? newCorrectIndex(currentQuestion.correctIndex) : -1
  const playerList = Object.values(players)
  const sortedPlayers = [...playerList].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const answerList = Object.values(answers)
  const answerCounts = displayChoices.map((_, idx) =>
    answerList.filter((a) => a.answerIndex === idx).length
  )
  const correctCount = answerList.filter((a) => a.isCorrect).length
  const isLastQuestion = currentIndex >= selectedIds.length - 1
  const allAnswered = playerList.length > 0 && answerList.length >= playerList.length
  const roomCode = config.roomCode ?? ''
  const playUrl = config.playUrl ?? ''
  const timerPercent = Math.max(0, (timeRemaining / timeLimit) * 100)
  const timerColor = timeRemaining <= 5 ? '#ef4444' : timeRemaining <= 10 ? '#f59e0b' : '#22c55e'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1420' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(172,34,40,0.5), 0 0 40px rgba(172,34,40,0.2); }
          50%       { box-shadow: 0 0 35px rgba(172,34,40,0.9), 0 0 70px rgba(172,34,40,0.4); }
        }
        @keyframes chipIn {
          from { opacity: 0; transform: scale(0.5) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes titleFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes scanPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.08); opacity: 1; }
        }
        @keyframes owlFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-10px) rotate(-3deg); }
        }
        @keyframes owlWobble {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(-6deg); }
          75%      { transform: rotate(6deg); }
        }
        @keyframes owlSlideLeft {
          from { opacity: 0; transform: translateX(-40px) rotate(-5deg); }
          to   { opacity: 1; transform: translateX(0) rotate(-5deg); }
        }
        @keyframes owlSlideRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes owlNod {
          0%, 100% { transform: rotate(0deg); }
          30%      { transform: rotate(4deg); }
          60%      { transform: rotate(-3deg); }
        }
        @keyframes owlCelebrate {
          0%, 100% { transform: scale(1) translateY(0); }
          25%      { transform: scale(1.05) translateY(-8px); }
          50%      { transform: scale(1) translateY(0); }
          75%      { transform: scale(1.03) translateY(-5px); }
        }
        .owl-float     { animation: owlFloat 4s ease-in-out infinite; }
        .owl-wobble     { animation: owlWobble 3s ease-in-out infinite; }
        .owl-slide-left { animation: owlSlideLeft 0.5s ease-out both; }
        .owl-slide-right{ animation: owlSlideRight 0.5s ease-out both; }
        .owl-nod        { animation: owlSlideRight 0.5s ease-out both, owlNod 2.5s ease-in-out 0.5s infinite; }
        .owl-celebrate  { animation: owlCelebrate 2s ease-in-out infinite; }
        .owl-bob-sm     { animation: owlFloat 5s ease-in-out infinite; }
        .owl-wobble-sm  { animation: owlWobble 4s ease-in-out infinite; }
        .title-float { animation: titleFloat 3s ease-in-out infinite; }
        .pulse-glow  { animation: pulseGlow 2s ease-in-out infinite; }
        .scan-pulse  { animation: scanPulse 1.8s ease-in-out infinite; }
        .chip-in     { animation: chipIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        .slide-in    { animation: slideInLeft 0.4s ease-out both; }
        @keyframes reactionFloat {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          10%  { transform: translateY(-10px) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-120px) scale(0.9); opacity: 0; }
        }
        .reaction-float { animation: reactionFloat 4s ease-out forwards; }
      `}</style>

      <Header />

      {/* ── LOBBY ─────────────────────────────────────────────────────────────── */}
      {status === 'lobby' && (
        <div className="flex-1" style={{ position: 'relative', overflow: 'hidden', height: 'calc(100vh - 64px)' }}>
          {/* Owl — absolutely positioned, overlaps into the title zone */}
          <img
            src="/Wise_Owl.webp"
            alt=""
            className="owl-float hidden lg:block"
            loading="eager"
            style={{
              position: 'absolute',
              left: '2%',
              top: '50%',
              transform: 'translateY(-50%)',
              height: '50vh',
              width: 'auto',
              zIndex: 1,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 0 40px rgba(255,200,50,0.45)) drop-shadow(0 0 80px rgba(172,34,40,0.35))',
            }}
          />

          {/* Centered content — sits above the owl, shifted slightly right */}
          <div
            className="flex flex-col items-center justify-center gap-5"
            style={{ position: 'relative', zIndex: 2, height: '100%', padding: '1rem 2rem', paddingLeft: '8%' }}
          >
            {/* Title */}
            <div className="text-center title-float" style={{ lineHeight: 1 }}>
              <div
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: 'clamp(3.5rem, 7vw, 7rem)',
                  color: '#ffffff',
                  textShadow: '0 0 40px rgba(172,34,40,0.7), 0 4px 0 rgba(172,34,40,0.8), 0 8px 0 rgba(100,10,14,0.6)',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
                Cap Table
              </div>
              <div
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: 'clamp(3rem, 6vw, 6rem)',
                  color: '#AC2228',
                  textShadow: '0 0 30px rgba(172,34,40,0.5), 0 4px 0 rgba(100,10,14,0.8)',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
                Catastrophe
              </div>
              <div
                style={{
                  fontFamily: "'Rajdhani','Roboto',sans-serif",
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginTop: '8px',
                }}
              >
                Test Your Equity IQ
              </div>
            </div>

            {/* QR + Room code row */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              {/* QR */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="scan-pulse"
                  style={{
                    fontFamily: "'Rajdhani','Roboto',sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  📱 Scan to Play!
                </div>
                <div className="bg-white p-4 rounded-2xl" style={{ boxShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
                  <QRCodeSVG value={`${playUrl}/play?room=${roomCode}`} size={220} />
                </div>
                <div className="text-center">
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    or go to
                  </div>
                  <div className="text-white font-mono text-sm mt-1">{playUrl}/play?room={roomCode}</div>
                </div>
              </div>

              {/* Room code + players + buttons */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <div
                    style={{
                      fontFamily: "'Rajdhani','Roboto',sans-serif",
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.5)',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Room Code
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bungee', cursive",
                      fontSize: 'clamp(4rem, 10vw, 8rem)',
                      color: '#AC2228',
                      lineHeight: 1,
                      textShadow: '0 0 30px rgba(172,34,40,0.4)',
                    }}
                  >
                    {roomCode}
                  </div>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', fontWeight: 600 }}>
                  {playerList.length} player{playerList.length !== 1 ? 's' : ''} joined
                </div>

                {playerList.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {playerList.map((p) => (
                      <span
                        key={p.id}
                        className="chip-in px-4 py-2 rounded-full text-white font-semibold text-base"
                        style={{ backgroundColor: '#2d3748', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        {p.nickname}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 mt-1">
                  <button
                    onClick={handleStartGame}
                    className="pulse-glow px-12 py-5 rounded-xl text-white text-2xl font-bold uppercase tracking-wide transition-all hover:opacity-95 active:scale-95"
                    style={{
                      backgroundColor: '#AC2228',
                      fontFamily: "'Bungee', cursive",
                      fontSize: '1.6rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Start Game!
                  </button>
                  {playerList.length > 0 && (
                    <button
                      onClick={handleReset}
                      className="px-8 py-5 rounded-xl text-white font-bold uppercase tracking-wide bg-gray-700 hover:bg-gray-600 transition-all text-lg"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION INTRO SPLASH ──────────────────────────────────────────── */}
      {status === 'question_intro' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <style>{`
            @keyframes splashScaleIn {
              0%   { transform: scale(0.3); opacity: 0; }
              60%  { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes splashSubSlide {
              0%   { transform: translateY(20px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            .splash-scale { animation: splashScaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
            .splash-sub   { animation: splashSubSlide 0.4s ease-out 0.3s both; }
          `}</style>
          <div
            className="splash-scale"
            style={{
              fontFamily: "'Bungee', cursive",
              fontSize: 'clamp(5rem, 12vw, 10rem)',
              color: '#AC2228',
              textShadow: '0 0 60px rgba(172,34,40,0.6), 0 6px 0 rgba(100,10,14,0.8)',
              letterSpacing: '0.04em',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            QUESTION {currentIndex + 1}
          </div>
          <div
            className="splash-sub"
            style={{
              fontFamily: "'Rajdhani','Roboto',sans-serif",
              fontSize: '2rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            of {selectedIds.length}
          </div>
        </div>
      )}

      {/* ── QUESTION ──────────────────────────────────────────────────────────── */}
      {status === 'question' && (
        <div className="flex-1 flex flex-col items-center justify-start gap-5 p-8">
          {/* Top bar */}
          <div className="flex items-center justify-between w-full max-w-5xl">
            <div
              className="flex items-center gap-3 px-5 py-2 rounded-full"
              style={{ backgroundColor: '#AC2228' }}
            >
              <span
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: '1.4rem',
                  color: '#fff',
                  letterSpacing: '0.03em',
                }}
              >
                Q{currentIndex + 1}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 600 }}>
                of {selectedIds.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleReset} className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
                Reset
              </button>
              <div
                className={`text-5xl font-black transition-colors ${
                  timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
                }`}
                style={{ fontFamily: "'Bungee', cursive", minWidth: '80px', textAlign: 'right' }}
              >
                {timeRemaining}s
              </div>
            </div>
          </div>

          {/* Timer progress bar */}
          <div className="w-full max-w-5xl" style={{ height: '8px', backgroundColor: '#2d3748', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${timerPercent}%`,
                backgroundColor: timerColor,
                borderRadius: '4px',
                transition: 'width 0.25s linear, background-color 0.5s',
                boxShadow: `0 0 8px ${timerColor}88`,
              }}
            />
          </div>

          {currentQuestion ? (
            <div className="flex items-center justify-center gap-5 w-full max-w-5xl">
              <img
                src="/Confused_Owl.webp"
                alt=""
                className="owl-slide-left hidden lg:block"
                style={{ width: '120px', height: '120px', objectFit: 'contain', flexShrink: 0 }}
              />
              <div className="text-white text-4xl font-bold text-center max-w-4xl leading-tight">
                {currentQuestion.question}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-2xl animate-pulse">Loading question...</div>
          )}

          {displayChoices.length > 0 && (
            <div className="grid grid-cols-2 gap-4 w-full max-w-5xl mt-2">
              {displayChoices.map((choice, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-5 rounded-xl text-white text-xl font-semibold"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '2px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="text-xl font-black w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#AC2228', fontFamily: "'Bungee', cursive" }}
                  >
                    {CHOICE_LABELS[idx]}
                  </span>
                  <span>{choice}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-gray-300 text-xl mt-1">
            <span style={{ color: allAnswered ? '#4ade80' : 'inherit' }}>
              {answerList.length} / {playerList.length} players have answered
            </span>
            {allAnswered && <span className="text-green-400 ml-3 font-bold">— All in!</span>}
          </div>
        </div>
      )}

      {/* ── ANSWER REVEAL ─────────────────────────────────────────────────────── */}
      {status === 'answer_reveal' && (
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
          <div className="flex items-center justify-between w-full max-w-5xl">
            <div className="text-white text-2xl font-semibold uppercase tracking-wide">
              Question {currentIndex + 1} — Answer
            </div>
            <div className="text-gray-400 text-lg">
              Leaderboard in <span className="text-white font-black text-2xl">{phaseCountdown}s</span>
            </div>
          </div>

          {currentQuestion && (
            <>
              <div className="flex items-center justify-center gap-5 w-full max-w-5xl">
                <div className="text-white text-3xl font-bold text-center max-w-4xl leading-tight">
                  {currentQuestion.question}
                </div>
                <img
                  src="/Wise_Owl.webp"
                  alt=""
                  className="owl-nod hidden lg:block"
                  style={{ width: '150px', height: '150px', objectFit: 'contain', flexShrink: 0 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-5xl">
                {displayChoices.map((choice, idx) => {
                  const isCorrect = idx === displayCorrectIndex
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-5 rounded-xl text-white text-xl font-semibold ${
                        isCorrect ? 'ring-4 ring-green-400' : ''
                      }`}
                      style={{ backgroundColor: isCorrect ? '#16a34a' : '#7f1d1d' }}
                    >
                      <span
                        className="text-xl font-black w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-black bg-opacity-20"
                        style={{ fontFamily: "'Bungee', cursive" }}
                      >
                        {CHOICE_LABELS[idx]}
                      </span>
                      <span className="flex-1">{choice}</span>
                      <span className="text-lg font-bold opacity-75">{answerCounts[idx] ?? 0}</span>
                    </div>
                  )
                })}
              </div>

              {currentQuestion.explanation && (
                <div
                  className="w-full max-w-5xl p-5 rounded-xl text-gray-200 text-lg italic"
                  style={{ backgroundColor: '#2d3748' }}
                >
                  {currentQuestion.explanation}
                </div>
              )}
            </>
          )}

          <div className="text-white text-xl font-semibold">
            {correctCount} / {playerList.length} answered correctly
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ───────────────────────────────────────────────────────── */}
      {status === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
          <div className="flex flex-col items-center">
            <div
              style={{
                fontFamily: "'Bungee', cursive",
                fontSize: '2.5rem',
                color: '#AC2228',
                letterSpacing: '0.04em',
                textShadow: '0 0 20px rgba(172,34,40,0.4)',
              }}
            >
              Leaderboard
            </div>
            <div className="text-gray-400 text-lg">
              {isLastQuestion ? 'Winner in' : 'Next question in'}{' '}
              <span className="text-white font-black text-2xl">{phaseCountdown}s</span>
            </div>
          </div>

          {/* Owls flanking the leaderboard */}
          <div className="w-full max-w-4xl flex items-start justify-center gap-6">
            <img
              src="/Wise_Owl.webp"
              alt=""
              className="owl-bob-sm hidden lg:block flex-shrink-0"
              style={{ width: '230px', height: 'auto', objectFit: 'contain', marginTop: '20px', filter: 'drop-shadow(0 0 20px rgba(255,200,50,0.3))' }}
            />

            <div className="flex-1 max-w-2xl flex flex-col gap-3">
              {sortedPlayers.slice(0, 10).map((player, idx) => {
                const medals = ['🥇', '🥈', '🥉']
                const medal = medals[idx] ?? null
                const ringColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'transparent'
                return (
                  <div
                    key={player.id}
                    className="slide-in flex items-center gap-4 px-6 py-4 rounded-xl text-white text-2xl font-bold"
                    style={{
                      backgroundColor: idx === 0 ? '#2d2200' : '#2d3748',
                      border: `2px solid ${ringColor}`,
                      animationDelay: `${idx * 0.06}s`,
                    }}
                  >
                    <span className="w-10 text-center text-xl">{medal ?? `${idx + 1}.`}</span>
                    <span className="flex-1">{player.nickname}</span>
                    <span style={{ color: '#FFD700', fontFamily: "'Bungee', cursive", fontSize: '1.5rem' }}>
                      {player.score ?? 0}
                    </span>
                  </div>
                )
              })}
            </div>

            <img
              src="/Confused_Owl.webp"
              alt=""
              className="owl-wobble-sm hidden lg:block flex-shrink-0"
              style={{ width: '230px', height: 'auto', objectFit: 'contain', marginTop: '20px', filter: 'drop-shadow(0 0 20px rgba(172,34,40,0.3))' }}
            />
          </div>

          <button
            onClick={isLastQuestion ? endGame : handleNextQuestion}
            className="mt-2 text-gray-600 text-sm hover:text-gray-400 transition-colors"
          >
            Skip → {isLastQuestion ? 'Show Winner' : 'Next Question'}
          </button>
        </div>
      )}

      {/* ── REACTION BUBBLES OVERLAY ─────────────────────────────────────────── */}
      {reactionBubbles.length > 0 && (
        <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 50, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {reactionBubbles.map((b, i) => (
            <div
              key={b.id}
              className="reaction-float"
              style={{
                backgroundColor: 'rgba(172,34,40,0.92)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '16px',
                fontSize: '1.2rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              {b.player}: {b.reaction}
            </div>
          ))}
        </div>
      )}

      {/* ── FINAL / WINNER ────────────────────────────────────────────────────── */}
      {status === 'final' && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
          style={{
            background: 'radial-gradient(ellipse at center top, #3d2e00 0%, #1a1f2e 55%, #0f1420 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Confetti />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <img
              src="/Wise_Owl.webp"
              alt=""
              className="owl-celebrate"
              style={{ width: '200px', height: '200px', objectFit: 'contain' }}
            />
            <div style={{ fontSize: '6rem', lineHeight: 1 }}>&#127942;</div>

            <div
              style={{
                fontFamily: "'Bungee', cursive",
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                color: '#FFD700',
                textShadow: '0 0 40px rgba(255,215,0,0.6), 0 4px 0 rgba(150,120,0,0.8)',
                letterSpacing: '0.04em',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              Cap Table<br />Champion!
            </div>

            {sortedPlayers[0] && (
              <>
                <div
                  className="text-white text-center"
                  style={{
                    fontFamily: "'Bungee', cursive",
                    fontSize: 'clamp(3rem, 8vw, 6rem)',
                    textShadow: '0 0 30px rgba(255,255,255,0.3)',
                    lineHeight: 1,
                  }}
                >
                  {sortedPlayers[0].nickname}
                </div>
                <div style={{ color: '#FFD700', fontSize: '2rem', fontWeight: 700 }}>
                  {sortedPlayers[0].score ?? 0} points
                </div>
              </>
            )}

            <div className="w-full max-w-xl flex flex-col gap-2 mt-4">
              {sortedPlayers.slice(0, 5).map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-4 px-5 py-3 rounded-xl text-white text-xl font-bold"
                  style={{ backgroundColor: 'rgba(45,55,72,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="w-8 text-center">{['🥇', '🥈', '🥉'][idx] ?? `${idx + 1}.`}</span>
                  <span className="flex-1">{player.nickname}</span>
                  <span style={{ color: '#FFD700' }}>{player.score ?? 0}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="mt-4 px-12 py-5 rounded-xl text-white text-2xl font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: '#AC2228',
                fontFamily: "'Bungee', cursive",
                fontSize: '1.5rem',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
