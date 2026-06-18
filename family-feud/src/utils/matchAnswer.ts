/**
 * Fuzzy-matches free-text audience guesses to the canonical board answers in
 * Equity Family Feud. Pure functions, no dependencies (mirrors src/utils/csv.ts).
 *
 * Used by:
 *  - Board:  tally how many audience guesses landed on each answer (count badge).
 *  - Player: tell a player whether their own guess matched a board answer.
 *  - Host:   sanity-check the canonical-match counts before they hit the board.
 *
 * Design goal: favor FALSE NEGATIVES over false positives. A wrong count next to
 * an answer on the big screen is glaring; a slightly-low count is invisible. So
 * the threshold is deliberately conservative and the edit-distance tier is gated
 * behind a minimum length to avoid short-word coincidences ("cash" vs "cars").
 */

export interface CanonicalAnswer {
  text: string
  /** Index of this answer within the round (used as the count slot + tiebreak). */
  index: number
  points?: number
}

export interface MatchOptions {
  /** Score at/above which a guess counts as a match. */
  threshold?: number
}

/** Default match threshold. Single tunable knob — adjust after a live dry-run. */
export const DEFAULT_MATCH_THRESHOLD = 0.72

// Only words that add no signal to a short survey answer. Kept intentionally
// small so we never strip a meaningful token.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'your', 'my', 'our', 'and', 'or', 'for',
])

// Acronyms / fixed terms whose letters happen to look like English suffixes —
// never stem these.
const NO_STEM = new Set([
  'irs', 'hr', 'hsa', 'fsa', 'espp', 'rsus', 'plus',
  'ira', 'roth', 'esop', 'sep', 'ssn',
])

/**
 * Normalize a raw string to a comparable form: lowercase, strip accents, drop
 * apostrophes, expand a few meaningful symbols, glue 401(k)/401-k/401 k → 401k,
 * keep only [a-z0-9 ] (digits stay attached to letters), collapse whitespace.
 */
export function normalize(input: string): string {
  if (!input) return ''
  let s = input.toLowerCase()
  // Strip diacritics (combining marks U+0300–U+036F): café → cafe
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
  // Drop apostrophes so possessives/contractions collapse: boss's → bosss, don't → dont
  s = s.replace(/['’]/g, '')
  // Expand symbols that carry meaning in answers
  s = s.replace(/&/g, ' and ').replace(/%/g, ' percent ').replace(/\$/g, ' dollar ')
  // Collapse 401(k) / 401-k / 401 k → 401k BEFORE stripping punctuation, so the
  // digit stays glued to the letter and survives the alnum filter.
  s = s.replace(/(\d)\s*[-(]?\s*k\)?/g, '$1k')
  // Keep letters, digits, spaces only
  s = s.replace(/[^a-z0-9 ]+/g, ' ')
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** Split a normalized string into meaningful tokens (stop-words dropped, then stemmed). */
export function tokenize(input: string): string[] {
  const norm = normalize(input)
  if (!norm) return []
  return norm
    .split(' ')
    .filter((t) => t && !STOP_WORDS.has(t))
    .map(stem)
}

// ─── Conservative stemmer ──────────────────────────────────────────────────
// Reduces inflected/derived word-forms to a shared root so variants collapse onto
// one token for the containment tier (taxes/taxation/taxed → "tax";
// accounting/accountant → "account"). Deliberately conservative: a missed match is
// invisible, but a wrong count on the big screen is glaring — so when a strip would
// leave too short / vowelless a stem, keep the longer form.

/** Suffixes stripped longest-first. [suffix, replacement]. Derivational then inflectional. */
const STEM_SUFFIXES: ReadonlyArray<readonly [string, string]> = [
  // derivational (long residue → low collision risk)
  ['ization', ''], ['ational', ''],
  ['ation', ''], ['ition', ''], ['sion', ''], ['tion', ''],
  ['ment', ''], ['ness', ''], ['ance', ''], ['ence', ''],
  ['able', ''], ['ible', ''],
  ['ant', ''], ['ent', ''], ['ize', ''], ['ise', ''], ['ify', ''],
  ['ity', ''], ['ism', ''], ['ist', ''],
  // inflectional (no-vowel guard applies to -ing / -ed)
  ['ies', 'y'], ['ied', 'y'],
  ['ing', ''], ['ed', ''], ['es', ''], ['s', ''],
]

/** Residue after a strip must be at least this long, else don't strip (keeps "tax"). */
const MIN_STEM = 3
const VOWEL = /[aeiouy]/

/** Collapse a doubled final consonant left by an -ing/-ed strip (planning→plann→plan),
 *  but preserve real geminates (ss/ll/ff/zz). */
function collapseDoubled(s: string): string {
  if (s.length >= 4) {
    const a = s[s.length - 1]
    const b = s[s.length - 2]
    if (a === b && !'aeiouy'.includes(a) && a !== 's' && a !== 'l' && a !== 'f' && a !== 'z') {
      return s.slice(0, -1)
    }
  }
  return s
}

/** Strip at most one suffix (longest-match-first). Returns null if nothing applies. */
function stemOnce(token: string): string | null {
  for (const [suffix, replacement] of STEM_SUFFIXES) {
    if (token.length > suffix.length && token.endsWith(suffix)) {
      let candidate = token.slice(0, token.length - suffix.length) + replacement
      if (suffix === 'ing' || suffix === 'ed') {
        candidate = collapseDoubled(candidate)
        // No-vowel guard: never strip -ing/-ed down to a bare consonant cluster
        // (string→str, bring→br). This is what keeps MIN_STEM=3 safe.
        if (!VOWEL.test(candidate)) continue
      }
      if (candidate.length >= MIN_STEM) return candidate
    }
  }
  return null
}

/** Reduce a token to a conservative shared root. Replaces the old singularize(). */
function stem(token: string): string {
  if (NO_STEM.has(token)) return token
  if (/[0-9]/.test(token)) return token        // 401k and any digit-bearing token
  if (token.length <= MIN_STEM) return token   // car, cash, plan, tax stay put
  let current = token
  for (let pass = 0; pass < 4; pass++) {       // peel layered forms (investments→invest)
    const next = stemOnce(current)
    if (next === null || next === current) break
    current = next
  }
  return current
}

/**
 * Levenshtein edit distance with an early-exit cap. Returns `cap + 1` as soon as
 * the best achievable distance exceeds `cap`. O(len²) on the short strings we
 * deal with here — negligible.
 */
function boundedLevenshtein(a: string, b: string, cap: number): number {
  if (a === b) return 0
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  if (Math.abs(al - bl) > cap) return cap + 1

  let prev: number[] = new Array(bl + 1)
  let curr: number[] = new Array(bl + 1)
  for (let j = 0; j <= bl; j++) prev[j] = j

  for (let i = 1; i <= al; i++) {
    curr[0] = i
    let rowMin = curr[0]
    const ai = a.charCodeAt(i - 1)
    for (let j = 1; j <= bl; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      curr[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > cap) return cap + 1
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[bl]
}

/** Whole-string edit-distance similarity in [0,1], gated to len ≥ 4. */
function levRatio(ng: string, nc: string): number {
  const maxLen = Math.max(ng.length, nc.length)
  if (maxLen < 4) return 0
  const cap = Math.ceil(0.4 * maxLen)
  const d = boundedLevenshtein(ng, nc, cap)
  return d > cap ? 0 : 1 - d / maxLen
}

function isSubset(small: string[], big: string[]): boolean {
  if (small.length === 0) return false
  const set = new Set(big)
  return small.every((t) => set.has(t))
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

/**
 * Similarity score in [0,1] between a free-text guess and one canonical answer.
 * Tiers (high to low): exact-normalized (1.0) → token containment (0.92) →
 * max(token-set Jaccard, whole-string edit-distance ratio).
 */
export function score(guess: string, canon: string): number {
  const ng = normalize(guess)
  const nc = normalize(canon)
  if (!ng || !nc) return 0
  if (ng === nc) return 1

  const tg = tokenize(guess)
  const tc = tokenize(canon)
  if (tg.length === 0 || tc.length === 0) return 0

  // Token containment: one side's tokens fully appear in the other.
  if (isSubset(tc, tg) || isSubset(tg, tc)) return 0.92

  return Math.max(jaccard(tg, tc), levRatio(ng, nc))
}

/**
 * Best canonical match for a single guess, or null if nothing clears the
 * threshold. Each guess matches AT MOST one answer (argmax score; ties break to
 * the lowest answer index — the higher-ranked Feud answer).
 */
export function matchGuess(
  guess: string,
  canon: CanonicalAnswer[],
  opts?: MatchOptions,
): { index: number; score: number } | null {
  const threshold = opts?.threshold ?? DEFAULT_MATCH_THRESHOLD
  let bestScore = -1
  let bestIndex = Infinity
  for (const c of canon) {
    const s = score(guess, c.text)
    if (s > bestScore || (s === bestScore && c.index < bestIndex)) {
      bestScore = s
      bestIndex = c.index
    }
  }
  if (bestIndex === Infinity || bestScore < threshold) return null
  return { index: bestIndex, score: bestScore }
}

/**
 * Tally a batch of guesses against the canonical answers. `counts[k]` is the
 * number of guesses matched to `canon[k]`; `unmatched` is everything that
 * cleared no answer. Each guess is counted at most once.
 */
export function tallyGuesses(
  guesses: string[],
  canon: CanonicalAnswer[],
  opts?: MatchOptions,
): { counts: number[]; unmatched: number } {
  const counts = new Array<number>(canon.length).fill(0)
  const indexToSlot = new Map<number, number>()
  canon.forEach((c, slot) => indexToSlot.set(c.index, slot))

  let unmatched = 0
  for (const g of guesses) {
    const m = matchGuess(g, canon, opts)
    const slot = m ? indexToSlot.get(m.index) : undefined
    if (slot === undefined) {
      unmatched++
    } else {
      counts[slot] += 1
    }
  }
  return { counts, unmatched }
}

/**
 * Like tallyGuesses, but split per team. `team1[k]` / `team2[k]` are the number
 * of team-1 / team-2 guesses matched to `canon[k]`. Each guess counts once.
 */
export function tallyGuessesByTeam(
  guesses: { text: string; team: 1 | 2 }[],
  canon: CanonicalAnswer[],
  opts?: MatchOptions,
): { team1: number[]; team2: number[]; unmatched: number } {
  const team1 = new Array<number>(canon.length).fill(0)
  const team2 = new Array<number>(canon.length).fill(0)
  const indexToSlot = new Map<number, number>()
  canon.forEach((c, slot) => indexToSlot.set(c.index, slot))

  let unmatched = 0
  for (const g of guesses) {
    const m = matchGuess(g.text, canon, opts)
    const slot = m ? indexToSlot.get(m.index) : undefined
    if (slot === undefined) {
      unmatched++
    } else if (g.team === 1) {
      team1[slot] += 1
    } else {
      team2[slot] += 1
    }
  }
  return { team1, team2, unmatched }
}
