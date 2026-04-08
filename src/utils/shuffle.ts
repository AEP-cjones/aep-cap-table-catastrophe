/**
 * Deterministically shuffles answer choices using the question ID as a seed.
 * Both host and player call this with the same question ID and get identical ordering,
 * so the correct answer is displayed consistently but not always at position A.
 */
export function shuffleChoices(
  choices: string[],
  questionId: string
): { shuffledChoices: string[]; newCorrectIndex: (originalIndex: number) => number } {
  // Hash the question ID into a numeric seed
  let h = 0
  for (let i = 0; i < questionId.length; i++) {
    h = (Math.imul(31, h) + questionId.charCodeAt(i)) >>> 0
  }

  // LCG pseudo-random number generator
  const rand = () => {
    h = (Math.imul(1664525, h) + 1013904223) >>> 0
    return h / 0x100000000
  }

  // Track original indices through the Fisher-Yates shuffle
  const perm = choices.map((_, i) => i) // perm[newIdx] = originalIdx
  const items = [...choices]

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }

  // Given an original index, find where it ended up after the shuffle
  const newCorrectIndex = (originalIdx: number) => perm.indexOf(originalIdx)

  return { shuffledChoices: items, newCorrectIndex }
}
