import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { GameState, GameConfig, Player, Answer, Question } from '../../types'
import {
  subscribeToGameState,
  subscribeToPlayers,
  subscribeToConfig,
  subscribeToAnswers,
  initializeGame,
  startGame,
  advanceToQuestion,
  revealAnswer,
  showLeaderboard,
  endGame,
  resetGame,
  updatePlayerScore,
  updatePlayerLastAnswer,
  getQuestions,
  initializeQuestionsFromJson,
} from '../../firebase/gameService'
import { useTimer } from '../../hooks/useTimer'
import Header from '../shared/Header'
import questionsData from '../../data/questions.json'
import type { Question as QuestionType } from '../../types'

const CHOICE_LABELS = ['A', 'B', 'C', 'D']

export default function HostScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [scoresUpdated, setScoresUpdated] = useState(false)

  const timeRemaining = useTimer(
    gameState?.status === 'question' ? (gameState.questionStartTime ?? null) : null,
    config?.timeLimit ?? 20
  )

  // Init
  useEffect(() => {
    initializeGame().then(() => {
      initializeQuestionsFromJson(questionsData as QuestionType[]).then(() => {
        getQuestions().then(setQuestions)
      })
    })
  }, [])

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
    if (gameState?.status === 'question' || gameState?.status === 'answer_reveal') {
      const unsub = subscribeToAnswers(gameState.currentQuestionIndex, setAnswers)
      return unsub
    }
    setAnswers({})
  }, [gameState?.status, gameState?.currentQuestionIndex])

  // Current question
  useEffect(() => {
    if (!gameState || !questions) return
    const ids = gameState.selectedQuestionIds
    if (!ids || ids.length === 0) return
    const qId = ids[gameState.currentQuestionIndex]
    if (qId && questions[qId]) {
      setCurrentQuestion(questions[qId])
      setScoresUpdated(false)
    }
  }, [gameState?.currentQuestionIndex, gameState?.selectedQuestionIds, questions])

  // Update scores when answer reveal
  const handleRevealAnswer = useCallback(async () => {
    if (!gameState || !currentQuestion || scoresUpdated) return
    setScoresUpdated(true)
    await revealAnswer()
    // Update scores for all correct answerers
    for (const [playerId, answer] of Object.entries(answers)) {
      if (answer.isCorrect) {
        const current = players[playerId]?.score ?? 0
        await updatePlayerScore(playerId, current + answer.points)
        await updatePlayerLastAnswer(playerId, true, answer.points)
      } else {
        await updatePlayerLastAnswer(playerId, false, 0)
      }
    }
  }, [gameState, currentQuestion, answers, players, scoresUpdated])

  const handleStartGame = async () => {
    const allQuestions = await getQuestions()
    const activeIds = Object.values(allQuestions)
      .filter((q) => q.active)
      .map((q) => q.id)
    const perGame = config?.questionsPerGame ?? 10
    let selected: string[]
    if (config?.randomizeOrder) {
      const shuffled = [...activeIds].sort(() => Math.random() - 0.5)
      selected = shuffled.slice(0, Math.min(perGame, shuffled.length))
    } else {
      selected = activeIds.slice(0, Math.min(perGame, activeIds.length))
    }
    await startGame(selected)
  }

  const handleNextQuestion = async () => {
    if (!gameState) return
    const ids = gameState.selectedQuestionIds ?? []
    const nextIndex = gameState.currentQuestionIndex + 1
    if (nextIndex >= ids.length) {
      await endGame()
    } else {
      await advanceToQuestion(nextIndex, ids)
    }
  }

  const handleReset = async () => {
    if (window.confirm('Reset the game and clear all players?')) {
      await resetGame()
    }
  }

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score)

  const answerCounts = currentQuestion
    ? currentQuestion.choices.map((_, idx) =>
        Object.values(answers).filter((a) => a.answerIndex === idx).length
      )
    : []

  const correctCount = currentQuestion
    ? Object.values(answers).filter((a) => a.isCorrect).length
    : 0

  const isLastQuestion =
    gameState ? gameState.currentQuestionIndex >= (gameState.selectedQuestionIds ?? []).length - 1 : false

  if (!config || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1420' }}>
        <div className="text-white text-2xl animate-pulse">Loading...</div>
      </div>
    )
  }

  // Firebase drops empty arrays — normalize to [] so .length is always safe
  const selectedIds: string[] = gameState.selectedQuestionIds ?? []

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1420' }}>
      <Header />

      {/* LOBBY */}
      {gameState.status === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
          <div className="text-center">
            <div className="text-white text-2xl font-bold uppercase tracking-widest mb-2">Room Code</div>
            <div
              className="font-black tracking-widest"
              style={{ fontSize: '10rem', lineHeight: 1, color: '#AC2228' }}
            >
              {config.roomCode}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={`${config.playUrl}?room=${config.roomCode}`}
              size={200}
            />
          </div>
          <div className="text-gray-400 text-lg">
            Scan to join or go to <span className="text-white font-mono">{config.playUrl}</span>
          </div>

          <div className="text-white text-xl font-semibold">
            {Object.keys(players).length} player{Object.keys(players).length !== 1 ? 's' : ''} joined
          </div>

          {Object.keys(players).length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
              {Object.values(players).map((p) => (
                <span
                  key={p.id}
                  className="px-4 py-2 rounded-full text-white font-semibold text-lg"
                  style={{ backgroundColor: '#2d3748' }}
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleStartGame}
              className="px-12 py-5 rounded-xl text-white text-2xl font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#AC2228' }}
            >
              Start Game
            </button>
            {Object.keys(players).length > 0 && (
              <button
                onClick={handleReset}
                className="px-8 py-5 rounded-xl text-white text-xl font-bold uppercase tracking-wide bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUESTION */}
      {gameState.status === 'question' && currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
          <div className="flex items-center justify-between w-full max-w-5xl">
            <div className="text-gray-400 text-2xl font-semibold uppercase tracking-wide">
              Question {gameState.currentQuestionIndex + 1} of {selectedIds.length}
            </div>
            <div
              className={`text-5xl font-black transition-colors ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}
            >
              {timeRemaining}s
            </div>
          </div>

          <div className="text-white text-4xl font-bold text-center max-w-4xl leading-tight">
            {currentQuestion.question}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-5xl mt-4">
            {currentQuestion.choices.map((choice, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-6 rounded-xl text-white text-2xl font-semibold"
                style={{ backgroundColor: '#2d3748' }}
              >
                <span
                  className="text-3xl font-black w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#AC2228' }}
                >
                  {CHOICE_LABELS[idx]}
                </span>
                <span>{choice}</span>
              </div>
            ))}
          </div>

          <div className="text-gray-300 text-xl mt-2">
            {Object.keys(answers).length} / {Object.keys(players).length} players have answered
          </div>

          <button
            onClick={handleRevealAnswer}
            className="mt-4 px-10 py-4 rounded-xl text-white text-xl font-bold uppercase tracking-wide transition-all hover:opacity-90"
            style={{ backgroundColor: '#AC2228' }}
          >
            Reveal Answer
          </button>
        </div>
      )}

      {/* ANSWER REVEAL */}
      {gameState.status === 'answer_reveal' && currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
          <div className="text-white text-2xl font-semibold uppercase tracking-wide">
            Question {gameState.currentQuestionIndex + 1} — Answer
          </div>

          <div className="text-white text-3xl font-bold text-center max-w-4xl leading-tight">
            {currentQuestion.question}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-5xl">
            {currentQuestion.choices.map((choice, idx) => {
              const isCorrect = idx === currentQuestion.correctIndex
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-6 rounded-xl text-white text-xl font-semibold transition-all ${
                    isCorrect ? 'ring-4 ring-green-400' : ''
                  }`}
                  style={{ backgroundColor: isCorrect ? '#16a34a' : '#7f1d1d' }}
                >
                  <span
                    className="text-2xl font-black w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-black bg-opacity-30"
                  >
                    {CHOICE_LABELS[idx]}
                  </span>
                  <span className="flex-1">{choice}</span>
                  <span className="text-lg font-bold opacity-80">{answerCounts[idx] ?? 0}</span>
                </div>
              )
            })}
          </div>

          <div
            className="w-full max-w-5xl p-5 rounded-xl text-gray-200 text-lg italic"
            style={{ backgroundColor: '#2d3748' }}
          >
            {currentQuestion.explanation}
          </div>

          <div className="text-white text-xl font-semibold">
            {correctCount} / {Object.keys(players).length} answered correctly
          </div>

          <button
            onClick={showLeaderboard}
            className="px-10 py-4 rounded-xl text-white text-xl font-bold uppercase tracking-wide transition-all hover:opacity-90"
            style={{ backgroundColor: '#AC2228' }}
          >
            Show Leaderboard
          </button>
        </div>
      )}

      {/* LEADERBOARD */}
      {gameState.status === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-start gap-6 p-8">
          <div
            className="text-4xl font-black uppercase tracking-widest"
            style={{ color: '#AC2228' }}
          >
            Leaderboard
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-3">
            {sortedPlayers.slice(0, 10).map((player, idx) => {
              const medals = ['🥇', '🥈', '🥉']
              const medal = medals[idx] ?? null
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 px-6 py-4 rounded-xl text-white text-2xl font-bold ${
                    idx === 0
                      ? 'ring-2 ring-yellow-400'
                      : idx === 1
                      ? 'ring-2 ring-gray-400'
                      : idx === 2
                      ? 'ring-2 ring-amber-700'
                      : ''
                  }`}
                  style={{ backgroundColor: '#2d3748' }}
                >
                  <span className="w-10 text-center text-xl">
                    {medal ?? `${idx + 1}.`}
                  </span>
                  <span className="flex-1">{player.nickname}</span>
                  <span className="text-yellow-400 font-black">{player.score}</span>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleNextQuestion}
            className="mt-4 px-12 py-5 rounded-xl text-white text-2xl font-bold uppercase tracking-wide transition-all hover:opacity-90"
            style={{ backgroundColor: '#AC2228' }}
          >
            {isLastQuestion ? 'Finish Game' : 'Next Question'}
          </button>
        </div>
      )}

      {/* FINAL */}
      {gameState.status === 'final' && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
          style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #3d2e00 50%, #1a1f2e 100%)' }}
        >
          <div className="text-8xl">&#127942;</div>
          <div className="text-yellow-400 text-6xl font-black uppercase tracking-widest">
            Winner!
          </div>
          {sortedPlayers[0] && (
            <>
              <div className="text-white text-8xl font-black text-center">
                {sortedPlayers[0].nickname}
              </div>
              <div className="text-yellow-300 text-4xl font-bold">
                {sortedPlayers[0].score} points
              </div>
            </>
          )}

          <div className="w-full max-w-xl flex flex-col gap-2 mt-4">
            {sortedPlayers.slice(0, 5).map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center gap-4 px-5 py-3 rounded-xl text-white text-xl font-bold"
                style={{ backgroundColor: 'rgba(45,55,72,0.8)' }}
              >
                <span className="w-8 text-center">{idx + 1}.</span>
                <span className="flex-1">{player.nickname}</span>
                <span className="text-yellow-400">{player.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="mt-6 px-12 py-5 rounded-xl text-white text-2xl font-bold uppercase tracking-wide transition-all hover:opacity-90"
            style={{ backgroundColor: '#AC2228' }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
