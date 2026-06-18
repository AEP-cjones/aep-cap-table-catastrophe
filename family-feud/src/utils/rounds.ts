// Round ordering helpers. Rounds live as a keyed map (`rounds/{id}`) with an
// explicit `order` field; legacy rounds written before `order` existed fall
// back to the numeric suffix of their key (round1, round2, …). Used by Admin
// (editor list + reorder), Host (round select), and Board (intro splash number)
// so play-order numbering is consistent everywhere and survives reordering.

/** Sort value for a round: explicit `order` if present, else the numeric suffix
 *  of its key, else 0. */
export function roundSortValue(key: string, round: { order?: number } | undefined): number {
  if (round && typeof round.order === 'number') return round.order
  const m = /(\d+)/.exec(key)
  return m ? parseInt(m[1], 10) : 0
}

/** Round keys in play order (by `order`, fallback to key suffix, tie-break by
 *  key). Accepts both Rounds and PublicRounds (both carry optional `order`). */
export function sortedRoundKeys(
  rounds: Record<string, { order?: number }> | null | undefined,
): string[] {
  if (!rounds) return []
  return Object.keys(rounds).sort((a, b) => {
    const diff = roundSortValue(a, rounds[a]) - roundSortValue(b, rounds[b])
    return diff !== 0 ? diff : a.localeCompare(b)
  })
}

/** 1-based play position of a round id, or 0 if not found. */
export function roundPosition(
  roundId: string | null | undefined,
  rounds: Record<string, { order?: number }> | null | undefined,
): number {
  if (!roundId) return 0
  return sortedRoundKeys(rounds).indexOf(roundId) + 1
}
