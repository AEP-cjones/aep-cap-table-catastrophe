import {
  ref,
  set,
  update,
  push,
  onValue,
  off,
  get,
  remove,
} from 'firebase/database'
import { db } from './config'
import type { GameState, GameConfig, Player, Answer, Question, Lead } from '../types'

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToGameState(cb: (state: GameState | null) => void): () => void {
  const r = ref(db, '/gameState')
  onValue(r, (snap) => cb(snap.val() as GameState | null))
  return () => off(r)
}

export function subscribeToPlayers(cb: (players: Record<string, Player>) => void): () => void {
  const r = ref(db, '/players')
  onValue(r, (snap) => cb((snap.val() as Record<string, Player>) ?? {}))
  return () => off(r)
}

export function subscribeToConfig(cb: (config: GameConfig | null) => void): () => void {
  const r = ref(db, '/config')
  onValue(r, (snap) => cb(snap.val() as GameConfig | null))
  return () => off(r)
}

export function subscribeToAnswers(
  questionIndex: number,
  cb: (answers: Record<string, Answer>) => void
): () => void {
  const r = ref(db, `/answers/${questionIndex}`)
  onValue(r, (snap) => cb((snap.val() as Record<string, Answer>) ?? {}))
  return () => off(r)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── Game Lifecycle ───────────────────────────────────────────────────────────

export async function initializeGame(): Promise<void> {
  const configSnap = await get(ref(db, '/config'))
  if (!configSnap.exists()) {
    const defaultConfig: GameConfig = {
      roomCode: generateRoomCode(),
      questionsPerGame: 10,
      timeLimit: 20,
      randomizeOrder: true,
      adminPassword: 'aep2026',
      playUrl: 'https://localhost:5173/play',
    }
    await set(ref(db, '/config'), defaultConfig)
  }

  const stateSnap = await get(ref(db, '/gameState'))
  if (!stateSnap.exists()) {
    const defaultState: GameState = {
      status: 'lobby',
      currentQuestionIndex: 0,
      questionStartTime: null,
      selectedQuestionIds: [],
    }
    await set(ref(db, '/gameState'), defaultState)
  }
}

export async function startGame(questionIds: string[]): Promise<void> {
  const state: GameState = {
    status: 'question_intro',
    currentQuestionIndex: 0,
    questionStartTime: null,
    selectedQuestionIds: questionIds,
  }
  await set(ref(db, '/gameState'), state)
}

export async function advanceToQuestion(
  index: number,
  questionIds: string[]
): Promise<void> {
  await update(ref(db, '/gameState'), {
    status: 'question_intro',
    currentQuestionIndex: index,
    questionStartTime: null,
    selectedQuestionIds: questionIds,
  })
}

export async function showQuestionIntro(): Promise<void> {
  await update(ref(db, '/gameState'), { status: 'question_intro' })
}

export async function startQuestion(): Promise<void> {
  await update(ref(db, '/gameState'), {
    status: 'question',
    questionStartTime: Date.now(),
  })
}

export async function revealAnswer(): Promise<void> {
  await update(ref(db, '/gameState'), { status: 'answer_reveal' })
}

export async function showLeaderboard(): Promise<void> {
  await update(ref(db, '/gameState'), { status: 'leaderboard' })
}

export async function endGame(): Promise<void> {
  await update(ref(db, '/gameState'), { status: 'final' })
}

export async function resetGame(): Promise<void> {
  await update(ref(db, '/gameState'), {
    status: 'lobby',
    currentQuestionIndex: 0,
    questionStartTime: null,
    selectedQuestionIds: [],
  })
  await remove(ref(db, '/players'))
  await remove(ref(db, '/answers'))
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function joinGame(playerId: string, nickname: string): Promise<void> {
  const player: Player = {
    id: playerId,
    nickname,
    score: 0,
    joinedAt: Date.now(),
    lastAnswerCorrect: null,
    lastAnswerPoints: 0,
  }
  await set(ref(db, `/players/${playerId}`), player)
}

export async function updatePlayerScore(playerId: string, score: number): Promise<void> {
  await update(ref(db, `/players/${playerId}`), { score })
}

export async function updatePlayerLastAnswer(
  playerId: string,
  isCorrect: boolean,
  points: number
): Promise<void> {
  await update(ref(db, `/players/${playerId}`), {
    lastAnswerCorrect: isCorrect,
    lastAnswerPoints: points,
  })
}

// ─── Answers ──────────────────────────────────────────────────────────────────

export async function submitAnswer(
  questionIndex: number,
  playerId: string,
  answer: Answer
): Promise<void> {
  await set(ref(db, `/answers/${questionIndex}/${playerId}`), answer)
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function updateConfig(updates: Partial<GameConfig>): Promise<void> {
  await update(ref(db, '/config'), updates)
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getQuestions(): Promise<Record<string, Question>> {
  const snap = await get(ref(db, '/questions'))
  return (snap.val() as Record<string, Question>) ?? {}
}

export async function saveQuestion(question: Question): Promise<void> {
  await set(ref(db, `/questions/${question.id}`), question)
}

export async function deleteQuestion(id: string): Promise<void> {
  await remove(ref(db, `/questions/${id}`))
}

export async function initializeQuestionsFromJson(
  questions: Question[]
): Promise<void> {
  const snap = await get(ref(db, '/questions'))
  if (!snap.exists()) {
    const batch: Record<string, Question> = {}
    for (const q of questions) {
      batch[q.id] = q
    }
    await set(ref(db, '/questions'), batch)
  }
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function submitLead(playerId: string, lead: Lead): Promise<void> {
  await set(ref(db, `/leads/${playerId}`), lead)
}

export async function getLeads(): Promise<Record<string, Lead>> {
  const snap = await get(ref(db, '/leads'))
  return (snap.val() as Record<string, Lead>) ?? {}
}

/** Write Zoho sync markers back to the lead record after a successful sync. */
export async function markLeadSynced(playerId: string, zohoLeadId: string): Promise<void> {
  await update(ref(db, `/leads/${playerId}`), {
    zohoLeadId,
    zohoSyncedAt: Date.now(),
  })
}

export async function clearLeads(): Promise<void> {
  await remove(ref(db, '/leads'))
}

// ─── Reactions ───────────────────────────────────────────────────────────────

export interface Reaction {
  player: string
  reaction: string
  timestamp: number
}

export async function sendReaction(player: string, reaction: string): Promise<void> {
  await push(ref(db, '/gameState/reactions'), {
    player,
    reaction,
    timestamp: Date.now(),
  })
}

export function subscribeToReactions(
  cb: (reactions: Record<string, Reaction>) => void
): () => void {
  const r = ref(db, '/gameState/reactions')
  onValue(r, (snap) => cb((snap.val() as Record<string, Reaction>) ?? {}))
  return () => off(r)
}

export async function clearReactions(): Promise<void> {
  await remove(ref(db, '/gameState/reactions'))
}
