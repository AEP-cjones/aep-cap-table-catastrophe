import { useEffect, useState } from 'react'
import { dbRef, onValue, set, update, get, remove } from '../firebase'
import type {
  GameState, GameConfig, Rounds, Round, PublicRounds,
  AudiencePlayers, AudienceAnswersByRound, AudiencePlayer,
  AudienceAnswer, Lead, Leads,
} from '../types'
import { sortedRoundKeys, roundSortValue } from '../utils/rounds'

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null)

  useEffect(() => {
    const unsub = onValue(dbRef('gameState'), (snap) => {
      setGameState(snap.val())
    })
    return unsub
  }, [])

  return gameState
}

export function useConfig() {
  const [config, setConfig] = useState<GameConfig | null>(null)

  useEffect(() => {
    const unsub = onValue(dbRef('config'), (snap) => {
      setConfig(snap.val())
    })
    return unsub
  }, [])

  return config
}

export function useRounds() {
  const [rounds, setRounds] = useState<Rounds | null>(null)

  useEffect(() => {
    const unsub = onValue(dbRef('rounds'), (snap) => {
      setRounds(snap.val())
    })
    return unsub
  }, [])

  return rounds
}

/**
 * Anon-readable round projection (Part B). Board + Player read THIS instead of
 * the gated `rounds` key — it only ever contains revealed answer text.
 */
export function usePublicRounds() {
  const [rounds, setRounds] = useState<PublicRounds | null>(null)

  useEffect(() => {
    const unsub = onValue(dbRef('publicRounds'), (snap) => {
      setRounds(snap.val())
    })
    return unsub
  }, [])

  return rounds
}

export async function initializeGame(defaults: { gameState: GameState; config: GameConfig }) {
  const snap = await get(dbRef('gameState'))
  if (!snap.exists()) {
    await set(dbRef('gameState'), defaults.gameState)
  }
  const configSnap = await get(dbRef('config'))
  if (!configSnap.exists()) {
    await set(dbRef('config'), defaults.config)
  }
}

export async function updateGameState(updates: Partial<GameState>) {
  await update(dbRef('gameState'), updates)
}

export async function updateConfig(updates: Partial<GameConfig>) {
  await update(dbRef('config'), updates)
}

/**
 * Refresh the anon-readable projection of a round. Answer `text` is withheld
 * ('') until that answer is revealed; `points` and `revealed` are always
 * mirrored. Keep ALL projection writes funnelled through this + the reveal/
 * hide helpers so the projection can never drift from the private `rounds`.
 */
async function writePublicProjection(roundId: string, round: Round) {
  const answers = round.answers.map((a) => ({
    text: a.revealed ? a.text : '',
    points: a.points,
    revealed: !!a.revealed,
  }))
  await set(dbRef(`publicRounds/${roundId}`), {
    question: round.question,
    answers,
    ...(round.order !== undefined ? { order: round.order } : {}),
  })
}

export async function revealAnswer(roundId: string, answerIndex: number, text: string) {
  await set(dbRef(`rounds/${roundId}/answers/${answerIndex}/revealed`), true)
  // Expose this answer in the public projection (text + flag).
  await update(dbRef(`publicRounds/${roundId}/answers/${answerIndex}`), { revealed: true, text })
}

export async function hideAnswer(roundId: string, answerIndex: number) {
  await set(dbRef(`rounds/${roundId}/answers/${answerIndex}/revealed`), false)
  await update(dbRef(`publicRounds/${roundId}/answers/${answerIndex}`), { revealed: false, text: '' })
}

export async function resetRoundAnswers(roundId: string, round: Round) {
  const resetAnswers = round.answers.map((a) => ({ ...a, revealed: false }))
  await set(dbRef(`rounds/${roundId}/answers`), resetAnswers)
  await writePublicProjection(roundId, { question: round.question, answers: resetAnswers, order: round.order })
}

export async function saveRound(roundId: string, round: Round) {
  await set(dbRef(`rounds/${roundId}`), round)
  await writePublicProjection(roundId, round)
}

export async function deleteRound(roundId: string) {
  await remove(dbRef(`rounds/${roundId}`))
  await remove(dbRef(`publicRounds/${roundId}`))
}

export async function createRound(round: Round): Promise<string> {
  const roundsSnap = await get(dbRef('rounds'))
  const existing: Record<string, Round> = roundsSnap.val() || {}
  const keys = Object.keys(existing)
  // Unique id = highest existing numeric suffix + 1. The old count-based id
  // (`round${count + 1}`) collided after any delete and silently overwrote an
  // existing round — the "adding a round always lands on round 2" bug.
  const maxSuffix = keys.reduce((m, k) => {
    const n = parseInt(/(\d+)/.exec(k)?.[1] ?? '0', 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  const id = `round${maxSuffix + 1}`
  // Append at the end of play order.
  const maxOrder = keys.reduce((m, k) => Math.max(m, roundSortValue(k, existing[k])), -1)
  const withOrder: Round = { ...round, order: maxOrder + 1 }
  await set(dbRef(`rounds/${id}`), withOrder)
  await writePublicProjection(id, withOrder)
  return id
}

/**
 * Move a round one slot earlier ('up') or later ('down') in play order.
 * Re-normalizes every round's `order` to its new sorted index (private +
 * projection) so ordering can never drift — cheap for a handful of rounds.
 */
export async function reorderRound(
  roundId: string,
  direction: 'up' | 'down',
  rounds: Rounds,
): Promise<void> {
  const ordered = sortedRoundKeys(rounds)
  const i = ordered.indexOf(roundId)
  if (i < 0) return
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= ordered.length) return
  ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
  const privateUpdates: Record<string, number> = {}
  const publicUpdates: Record<string, number> = {}
  ordered.forEach((key, idx) => {
    privateUpdates[`${key}/order`] = idx
    publicUpdates[`${key}/order`] = idx
  })
  await update(dbRef('rounds'), privateUpdates)
  await update(dbRef('publicRounds'), publicUpdates)
}

// ─── Audience (QR-code mobile players) ────────────────────────────────

export function useAudiencePlayers() {
  const [players, setPlayers] = useState<AudiencePlayers | null>(null)
  useEffect(() => {
    const unsub = onValue(dbRef('players'), (snap) => setPlayers(snap.val()))
    return unsub
  }, [])
  return players
}

export function useAudiencePlayer(playerId: string | null) {
  const [player, setPlayer] = useState<AudiencePlayer | null>(null)
  useEffect(() => {
    if (!playerId) {
      setPlayer(null)
      return
    }
    const unsub = onValue(dbRef(`players/${playerId}`), (snap) => setPlayer(snap.val()))
    return unsub
  }, [playerId])
  return player
}

export function useAudienceAnswersForRound(roundId: string | null | undefined) {
  const [answers, setAnswers] = useState<Record<string, AudienceAnswer> | null>(null)
  useEffect(() => {
    if (!roundId) {
      setAnswers(null)
      return
    }
    const unsub = onValue(dbRef(`audienceAnswers/${roundId}`), (snap) => setAnswers(snap.val()))
    return unsub
  }, [roundId])
  return answers
}

export function useAllAudienceAnswers() {
  const [all, setAll] = useState<AudienceAnswersByRound | null>(null)
  useEffect(() => {
    const unsub = onValue(dbRef('audienceAnswers'), (snap) => setAll(snap.val()))
    return unsub
  }, [])
  return all
}

export function useLeads() {
  const [leads, setLeads] = useState<Leads | null>(null)
  useEffect(() => {
    const unsub = onValue(dbRef('leads'), (snap) => setLeads(snap.val()))
    return unsub
  }, [])
  return leads
}

export async function joinAudience(playerId: string, team: 1 | 2) {
  await set(dbRef(`players/${playerId}`), {
    team,
    joinedAt: new Date().toISOString(),
  } satisfies AudiencePlayer)
}

export async function submitAudienceAnswer(
  playerId: string,
  roundId: string,
  team: 1 | 2,
  text: string,
) {
  await set(dbRef(`audienceAnswers/${roundId}/${playerId}`), {
    text: text.trim(),
    team,
    submittedAt: new Date().toISOString(),
  } satisfies AudienceAnswer)
}

export async function submitLead(playerId: string, lead: Omit<Lead, 'submittedAt'>) {
  await set(dbRef(`leads/${playerId}`), {
    ...lead,
    submittedAt: new Date().toISOString(),
  } satisfies Lead)
}

/** Write Zoho sync markers back to the lead record after a successful sync. */
export async function markLeadSynced(playerId: string, zohoLeadId: string) {
  await update(dbRef(`leads/${playerId}`), {
    zohoLeadId,
    zohoSyncedAt: new Date().toISOString(),
  })
}

/**
 * Reset the audience between games: clears joined players + their per-round
 * answers. Deliberately does NOT touch `leads` — captured leads are preserved
 * and only ever cleared by the explicit "Clear all leads" action in Admin
 * (after CSV export). Keeping these split stops a routine between-games reset
 * from destroying marketing leads.
 */
export async function resetAudience() {
  await remove(dbRef('players'))
  await remove(dbRef('audienceAnswers'))
}
