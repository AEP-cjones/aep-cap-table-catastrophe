export type GameStatus = 'lobby' | 'question' | 'answer_reveal' | 'leaderboard' | 'final'

export interface Question {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  active: boolean
}

export interface Player {
  id: string
  nickname: string
  score: number
  joinedAt: number
  lastAnswerCorrect: boolean | null
  lastAnswerPoints: number
}

export interface Answer {
  answerIndex: number
  timestamp: number
  isCorrect: boolean
  points: number
}

export interface GameState {
  status: GameStatus
  currentQuestionIndex: number
  questionStartTime: number | null
  selectedQuestionIds: string[]
}

export interface GameConfig {
  roomCode: string
  questionsPerGame: number
  timeLimit: number
  randomizeOrder: boolean
  adminPassword: string
  playUrl: string
}

export interface Lead {
  playerId: string
  nickname: string
  firstName: string
  email: string
  company: string
  optIn: boolean
  timestamp: number
}
