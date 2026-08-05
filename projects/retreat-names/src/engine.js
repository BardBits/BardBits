function pickRandom(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function pickWeightedPattern(patterns, rand) {
  const total = patterns.reduce((s, p) => s + p.weight, 0);
  let roll = rand() * total;
  for (const p of patterns) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return patterns[patterns.length - 1];
}

/**
 * mulberry32 — a small seeded PRNG. Used so the prerender and the first
 * client render produce the same name; without it hydration would mismatch.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateName(config, rand = Math.random) {
  const pattern = pickWeightedPattern(config.patterns, rand);
  const used = {};
  const words = pattern.template.map((token) => {
    const m = token.match(/^\{(.+)\}$/);
    if (!m) return token;
    const list = config.wordLists[m[1]];
    if (!list) return token;
    let word, tries = 0;
    do { word = pickRandom(list, rand); tries++; } while (used[m[1]] === word && tries < 10);
    used[m[1]] = word;
    return word;
  });
  return { name: words.join(" "), patternUsed: pattern.template.join(" ") };
}

/**
 * The name baked into the prerendered HTML. Stable per theme, so the server
 * and the browser agree on first paint; the app swaps in a random one once
 * hydration is done.
 */
export function featuredName(config) {
  const seed = [...config.id].reduce((h, ch) => h + ch.charCodeAt(0), 7);
  return generateName(config, makeRng(seed));
}
