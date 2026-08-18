import { isBlocked } from "./safety.js";

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

export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveToken(token, config, rand, used) {
  const m = token.match(/^\{(.+)\}$/);
  if (!m) return token;

  const key = m[1];
  const list = config.wordLists[key];
  if (!list) return token;

  if (Array.isArray(list)) {
    let word, tries = 0;
    do { word = pickRandom(list, rand); tries++; } while (used[key] === word && tries < 10);
    used[key] = word;
    return word;
  }

  // pairMap: the previous token (a homophone) selects the suffix set
  if (list._type === "pairMap") {
    const prev = used._lastHomophone;
    const suffixes = list[prev];
    if (suffixes) return pickRandom(suffixes, rand);
    const allKeys = Object.keys(list).filter(k => k !== "_type");
    const fallbackKey = pickRandom(allKeys, rand);
    return pickRandom(list[fallbackKey], rand);
  }

  return token;
}

function generateOnce(config, rand) {
  const pattern = pickWeightedPattern(config.patterns, rand);
  const used = {};
  const words = pattern.template.map((token) => {
    const result = resolveToken(token, config, rand, used);
    // Track homophones so the pairMap suffix can reference them
    const m = token.match(/^\{(.+)\}$/);
    if (m && m[1] === "homophone") used._lastHomophone = result;
    return result;
  });
  return { name: words.join(" "), patternUsed: pattern.template.join(" ") };
}

const MAX_SAFETY_RETRIES = 20;

export function generateName(config, rand = Math.random) {
  for (let i = 0; i < MAX_SAFETY_RETRIES; i++) {
    const result = generateOnce(config, rand);
    if (!isBlocked(result.name)) return result;
  }
  return generateOnce(config, rand);
}

export function featuredName(config) {
  const seed = [...config.id].reduce((h, ch) => h + ch.charCodeAt(0), 7);
  return generateName(config, makeRng(seed));
}
