export interface Answer {
  text: string
  points: number
  revealed: boolean
}

export interface Round {
  question: string
  answers: Answer[]
  /** Play-order position (ascending). Optional for back-compat: rounds written
   *  before this field fall back to the numeric suffix of their key (round1,
   *  round2, …) when sorted. See utils/rounds.ts. */
  order?: number
}

export interface Rounds {
  [key: string]: Round
}

/**
 * Anon-readable projection of a round (Part B answer-secrecy). Same shape as
 * Round, but each answer's `text` is '' until that answer is revealed — so a
 * phone can read the question + revealed answers without ever seeing the key.
 * The private `rounds` node (full text) is gated to gameAdmin.
 */
export interface PublicRound {
  question: string
  answers: Answer[]
  /** Mirror of Round.order so anon screens (Board) can show play-order
   *  position without reading the gated `rounds` key. */
  order?: number
}

export interface PublicRounds {
  [key: string]: PublicRound
}

export interface GameConfig {
  adminPassword: string
  team1Name: string
  team2Name: string
}

export interface GameState {
  status: 'title' | 'playing' | 'steal' | 'final'
  currentRound: string
  strikes: number
  team1Score: number
  team2Score: number
  roundPoints: number
  activeTeam: 1 | 2
  /** Set to Date.now() by the host when a steal fails. Clients show a
   *  "STEAL FAILED" overlay while (Date.now() - stealFailedAt) < 3000ms. */
  stealFailedAt?: number | null
}

export const DEFAULT_CONFIG: GameConfig = {
  adminPassword: 'aep2026',
  team1Name: 'Team 1',
  team2Name: 'Team 2',
}

export const DEFAULT_GAME_STATE: GameState = {
  status: 'title',
  currentRound: '',
  strikes: 0,
  team1Score: 0,
  team2Score: 0,
  roundPoints: 0,
  activeTeam: 1,
}

// ─── Audience (QR-code mobile players) ────────────────────────────────
export interface AudiencePlayer {
  team: 1 | 2
  joinedAt: string
}

export interface AudienceAnswer {
  text: string
  team: 1 | 2
  submittedAt: string
}

export interface Lead {
  firstName: string
  lastName: string
  email: string
  company?: string
  phone?: string
  team?: 1 | 2
  /** Marketing-consent flag captured at form submit. Required true for Zoho sync.
   *  Existing pre-2026-04-16 leads lack this field — treated as false. */
  optIn?: boolean
  submittedAt: string
  /** Set when the lead has been synced to Zoho CRM. Enables dedup on repeat
   *  admin button clicks. */
  zohoLeadId?: string
  zohoSyncedAt?: string
}

export interface AudiencePlayers {
  [playerId: string]: AudiencePlayer
}

export interface AudienceAnswersByRound {
  [roundId: string]: {
    [playerId: string]: AudienceAnswer
  }
}

export interface Leads {
  [playerId: string]: Lead
}
