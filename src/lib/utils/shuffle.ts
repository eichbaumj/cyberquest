/**
 * Seeded random number generator (mulberry32)
 * Produces deterministic random numbers from a seed
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert string to numeric seed
 */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Fisher-Yates shuffle with deterministic seed
 * Same questions for all players, but shuffled order per player
 *
 * @param array - Array to shuffle
 * @param seedString - String to use as seed (e.g., player ID)
 * @returns New shuffled array (original unchanged)
 */
export function shuffleWithSeed<T>(array: T[], seedString: string): T[] {
  const result = [...array];
  const seed = stringToSeed(seedString);
  const random = mulberry32(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
