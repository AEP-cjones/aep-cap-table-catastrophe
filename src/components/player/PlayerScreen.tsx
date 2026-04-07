import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { GameState, GameConfig, Player, Answer, Question, Lead } from '../../types'
import {
  subscribeToGameState,
  subscribeToConfig,
  subscribeToPlayers,
  subscribeToAnswers,
  joinGame,
  submitAnswer,
  submitLead,
  getQuestions,
} from '../../firebase/gameService'
import { useTimer } from '../../hooks/useTimer'

const CHOICE_LABELS = ['A', 'B', 'C', 'D']
const CHOICE_COLORS = ['#1d4ed8', '#7c3aed', '#b45309', '#047857']

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function PlayerScreen() {
  const [searchParams] = useSearchParams()
  const roomCode = searchParams.get('room')?.toUpperCase() ?? ''

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)

  const [playerId, setPlayerId] = useState<string>('')
  const [nickname, setNickname] = useState<string>('')
  const [hasJoined, setHasJoined] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState('')

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)

  // Lead form
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [leadSkipped, setLeadSkipped] = useState(false)
  const [leadForm, setLeadForm] = useState({
    firstName: '',
    email: '',
    company: '',
    optIn: false,
  })
  const [leadSubmitting, setLeadSubmitting] = useState(false)

  const prevQuestionIndex = useRef<number>(-1)

  const timeRemaining = useTimer(
    gameState?.status === 'question' ? (gameState.questionStartTime ?? null) : null,
    config?.timeLimit ?? 20
  )

  // Init: load or generate playerId
  useEffect(() => {
    let id = localStorage.getItem('ctc_playerId')
    if (!id) {
      id = generateUUID()
      localStorage.setItem('ctc_playerId', id)
    }
    setPlayerId(id)
  }, [])

  // Check if already in game
  useEffect(() => {
    if (!playerId || Object.keys(players).length === 0) return
    if (players[playerId]) {
      setNickname(players[playerId].nickname)
      setLeadForm((prev) => ({ ...prev, firstName: players[playerId].nickname }))
      setHasJoined(true)
    }
  }, [playerId, players])

  // Subscriptions
  useEffect(() => {
    const unsub = subscribeToGameState(setGameState)
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeToConfig(setConfig)
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeToPlayers(setPlayers)
    return unsub
  }, [])

  useEffect(() => {
    if (!gameState) return
    const unsub = subscribeToAnswers(gameState.currentQuestionIndex, setAnswers)
    return unsub
  }, [gameState?.currentQuestionIndex])

  // Load questions
  useEffect(() => {
    getQuestions().then(setQuestions)
  }, [])

  // Current question
  useEffect(() => {
    if (!gameState || !questions) return
    const ids = gameState.selectedQuestionIds
    if (!ids || ids.length === 0) return
    const qId = ids[gameState.currentQuestionIndex]
    if (qId && questions[qId]) {
      setCurrentQuestion(questions[qId])
    }
  }, [gameState?.currentQuestionIndex, gameState?.selectedQuestionIds, questions])

  // Reset answer state when question changes
  useEffect(() => {
    if (!gameState) return
    if (gameState.currentQuestionIndex !== prevQuestionIndex.current) {
      prevQuestionIndex.current = gameState.currentQuestionIndex
      setSelectedAnswer(null)
      setHasAnswered(false)
    }
  }, [gameState?.currentQuestionIndex])

  // Restore hasAnswered from Firebase
  useEffect(() => {
    if (!playerId || !gameState) return
    if (answers[playerId] !== undefined) {
      setHasAnswered(true)
      setSelectedAnswer(answers[playerId].answerIndex)
    }
  }, [answers, playerId])

  const handleJoin = async () => {
    const name = joinInput.trim()
    if (!name) {
      setJoinError('Please enter your name.')
      return
    }
    if (!config || config.roomCode !== roomCode) {
      setJoinError('Room not found. Check the code and try again.')
      return
    }
    setJoinError('')
    await joinGame(playerId, name)
    setNickname(name)
    setLeadForm((prev) => ({ ...prev, firstName: name }))
    setHasJoined(true)
  }

  const handleAnswerSelect = async (idx: number) => {
    if (hasAnswered || !gameState || !currentQuestion || !playerId) return
    if (timeRemaining <= 0) return

    const startTime = gameState.questionStartTime ?? Date.now()
    const timestamp = Date.now()
    const elapsed = timestamp - startTime
    const tl = (config?.timeLimit ?? 20) * 1000
    const isCorrect = idx === currentQuestion.correctIndex
    const points = isCorrect
      ? 100 + Math.round(50 * Math.max(0, (tl - elapsed) / tl))
      : 0

    const answer: Answer = {
      answerIndex: idx,
      timestamp,
      isCorrect,
      points,
    }

    setSelectedAnswer(idx)
    setHasAnswered(true)
    await submitAnswer(gameState.currentQuestionIndex, playerId, answer)
  }

  const handleLeadSubmit = async () => {
    if (!playerId || !nickname) return
    setLeadSubmitting(true)
    const lead: Lead = {
      playerId,
      nickname,
      firstName: leadForm.firstName,
      email: leadForm.email,
      company: leadForm.company,
      optIn: leadForm.optIn,
      timestamp: Date.now(),
    }
    await submitLead(playerId, lead)
    setLeadSubmitted(true)
    setLeadSubmitting(false)
  }

  const myPlayer = players[playerId]
  const myRank = myPlayer
    ? Object.values(players)
        .sort((a, b) => b.score - a.score)
        .findIndex((p) => p.id === playerId) + 1
    : null
  const myAnswer = answers[playerId]

  // ─── Render states ─────────────────────────────────────────────────────────

  if (!config || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1420' }}>
        <div className="text-white text-xl animate-pulse">Connecting...</div>
      </div>
    )
  }

  // JOIN FORM
  if (!hasJoined) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="text-center mb-2">
          <div className="text-white font-bold uppercase tracking-widest text-sm mb-1">
            Accelerated Equity Plans
          </div>
          <div className="text-5xl font-black" style={{ color: '#AC2228' }}>
            Cap Table<br />Catastrophe
          </div>
        </div>

        <div
          className="w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4"
          style={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="text-white text-center text-lg font-semibold">
            Room: <span className="font-black" style={{ color: '#AC2228' }}>{roomCode || '????'}</span>
          </div>

          <input
            className="w-full px-4 py-4 rounded-xl text-white text-lg outline-none"
            style={{ backgroundColor: '#2d3748', border: '2px solid #4a5568' }}
            placeholder="Your first name"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={20}
          />

          {joinError && (
            <div className="text-red-400 text-sm text-center">{joinError}</div>
          )}

          <button
            onClick={handleJoin}
            className="w-full py-4 rounded-xl text-white text-xl font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#AC2228' }}
          >
            Join Game
          </button>
        </div>
      </div>
    )
  }

  // WAITING LOBBY
  if (gameState.status === 'lobby') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="text-5xl font-black" style={{ color: '#AC2228' }}>
          You're In!
        </div>
        <div className="text-white text-2xl font-bold">{nickname}</div>
        <div className="text-gray-400 text-lg text-center">
          Waiting for the host to start
          <span className="animate-pulse">...</span>
        </div>
        <div className="text-gray-500 text-base">
          {Object.keys(players).length} player{Object.keys(players).length !== 1 ? 's' : ''} in the room
        </div>
      </div>
    )
  }

  // QUESTION (haven't answered)
  if (gameState.status === 'question' && currentQuestion && !hasAnswered) {
    return (
      <div
        className="min-h-screen flex flex-col p-4 gap-4"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="flex items-center justify-between text-gray-400 text-sm">
          <span>
            Q{gameState.currentQuestionIndex + 1}/{(gameState.selectedQuestionIds ?? []).length}
          </span>
          <span
            className={`text-2xl font-black transition-colors ${
              timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
            }`}
          >
            {timeRemaining}s
          </span>
        </div>

        <div className="text-white text-xl font-bold leading-snug flex-shrink-0">
          {currentQuestion.question}
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {currentQuestion.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswerSelect(idx)}
              disabled={timeRemaining <= 0}
              className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-white text-base font-semibold text-left transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: CHOICE_COLORS[idx],
                minHeight: '56px',
              }}
            >
              <span className="w-8 h-8 rounded-full bg-black bg-opacity-30 flex items-center justify-center font-black text-sm flex-shrink-0">
                {CHOICE_LABELS[idx]}
              </span>
              <span>{choice}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ANSWERED — waiting for reveal
  if (gameState.status === 'question' && hasAnswered) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="text-green-400 text-5xl font-black">&#10003;</div>
        <div className="text-white text-2xl font-bold">Answer Submitted!</div>
        {selectedAnswer !== null && currentQuestion && (
          <div
            className="px-6 py-3 rounded-xl text-white text-lg font-semibold"
            style={{ backgroundColor: CHOICE_COLORS[selectedAnswer] }}
          >
            {CHOICE_LABELS[selectedAnswer]}: {currentQuestion.choices[selectedAnswer]}
          </div>
        )}
        <div className="text-gray-400 text-base animate-pulse">
          Waiting for results...
        </div>
      </div>
    )
  }

  // ANSWER REVEAL
  if (gameState.status === 'answer_reveal') {
    const gotIt = myAnswer?.isCorrect ?? false
    const pts = myAnswer?.points ?? 0
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 gap-5"
        style={{ backgroundColor: '#0f1420' }}
      >
        <style>{`
          @keyframes popIn {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pop-in { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        `}</style>

        {gotIt ? (
          <img src="/Right_Owl.png" alt="Correct!" className="pop-in" style={{ width: '128px', height: '128px', objectFit: 'contain' }} />
        ) : (
          <svg className="pop-in" width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="48" fill="#dc2626"/>
            <path d="M32 32L64 64M64 32L32 64" stroke="white" strokeWidth="7" strokeLinecap="round"/>
          </svg>
        )}

        <div className={`text-3xl font-black ${gotIt ? 'text-green-400' : 'text-red-400'}`}>
          {gotIt ? 'Correct!' : 'Wrong'}
        </div>

        {currentQuestion && (
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-1">Correct answer:</div>
            <div
              className="px-6 py-3 rounded-xl text-white text-lg font-semibold"
              style={{ backgroundColor: '#16a34a' }}
            >
              {CHOICE_LABELS[currentQuestion.correctIndex]}: {currentQuestion.choices[currentQuestion.correctIndex]}
            </div>
          </div>
        )}

        {gotIt && (
          <div className="text-yellow-400 text-2xl font-bold">+{pts} points</div>
        )}

        <div
          className="w-full max-w-sm p-4 rounded-xl flex items-center justify-between"
          style={{ backgroundColor: '#1a1f2e' }}
        >
          <span className="text-gray-300">Your score</span>
          <span className="text-white text-2xl font-black">{myPlayer?.score ?? 0}</span>
        </div>
      </div>
    )
  }

  // LEADERBOARD
  if (gameState.status === 'leaderboard') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 gap-5"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="text-3xl font-black" style={{ color: '#AC2228' }}>
          Leaderboard
        </div>
        <div
          className="w-full max-w-sm p-5 rounded-2xl flex flex-col gap-2"
          style={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="text-gray-300 text-sm text-center mb-1">Your Position</div>
          <div className="text-yellow-400 text-5xl font-black text-center">#{myRank}</div>
          <div className="text-white text-2xl font-bold text-center">{nickname}</div>
          <div className="text-gray-300 text-xl text-center">{myPlayer?.score ?? 0} pts</div>
        </div>
        <div className="text-gray-400 text-base animate-pulse text-center">
          Get ready for the next question!
        </div>
      </div>
    )
  }

  // FINAL
  if (gameState.status === 'final') {
    const isWinner = myRank === 1
    if (leadSubmitted || leadSkipped) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 gap-5"
          style={{ backgroundColor: '#0f1420' }}
        >
          {isWinner && <div className="text-6xl">&#127942;</div>}
          <div className={`text-4xl font-black ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
            {isWinner ? 'YOU WIN!' : 'Game Over!'}
          </div>
          <div className="text-white text-2xl font-bold">{nickname}</div>
          <div className="text-gray-300 text-xl">
            Rank #{myRank} &mdash; {myPlayer?.score ?? 0} pts
          </div>
          {leadSubmitted && (
            <div className="text-green-400 text-base">Thanks! We'll be in touch.</div>
          )}
        </div>
      )
    }

    return (
      <div
        className="min-h-screen flex flex-col p-6 gap-5"
        style={{ backgroundColor: '#0f1420' }}
      >
        <div className="text-center">
          {isWinner && <div className="text-5xl mb-2">&#127942;</div>}
          <div className={`text-3xl font-black ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
            {isWinner ? 'YOU WIN!' : 'Game Over!'}
          </div>
          <div className="text-gray-300">Rank #{myRank} &mdash; {myPlayer?.score ?? 0} pts</div>
        </div>

        <div
          className="p-5 rounded-2xl flex flex-col gap-4"
          style={{ backgroundColor: '#1a1f2e' }}
        >
          <div className="text-white font-bold text-lg text-center">
            Stay connected with AEP
          </div>

          <input
            className="w-full px-4 py-3 rounded-xl text-white outline-none"
            style={{ backgroundColor: '#2d3748' }}
            placeholder="First name"
            value={leadForm.firstName}
            onChange={(e) => setLeadForm((p) => ({ ...p, firstName: e.target.value }))}
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-white outline-none"
            style={{ backgroundColor: '#2d3748' }}
            placeholder="Email address"
            type="email"
            value={leadForm.email}
            onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-white outline-none"
            style={{ backgroundColor: '#2d3748' }}
            placeholder="Company"
            value={leadForm.company}
            onChange={(e) => setLeadForm((p) => ({ ...p, company: e.target.value }))}
          />

          <label className="flex items-start gap-3 text-gray-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-5 h-5 flex-shrink-0"
              checked={leadForm.optIn}
              onChange={(e) => setLeadForm((p) => ({ ...p, optIn: e.target.checked }))}
            />
            Yes, I'd like to receive information about Accelerated Equity Plans solutions.
          </label>

          <button
            onClick={handleLeadSubmit}
            disabled={leadSubmitting || !leadForm.email}
            className="w-full py-4 rounded-xl text-white text-lg font-bold uppercase tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#AC2228' }}
          >
            {leadSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          <button
            onClick={() => setLeadSkipped(true)}
            className="text-gray-500 text-sm text-center underline"
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  return null
}
