const BLOCKED_SUBSTRINGS = [
  "master bait",
  "masterbait",
  "wet dream",
  "blow me",
  "blow boat",
  "blow job",
  "poop deck",
  "seamen",
  "semen",
  "hooker",
  "happy hooker",
  "morning wood",
  "going down",
  "come aboard",
  "rear admiral",
  "head job",
  "giving head",
  "in the head",
  "dirty oar",
  "bass ackward",
  "jack off",
  "jerking",
  "booty",
  "big rod",
  "nice rack",
  "motor boat",
  "motorboat",
  "lick",
  "stroke it",
  "spread eagle",
  "easy rider",
  "swallow",
  "hard on",
  "barely legal",
  "slippery when wet",
  "dock tease",
  "loose cannon",
];

const blocked = BLOCKED_SUBSTRINGS.map((s) => s.toLowerCase());

export function isBlocked(name) {
  const lower = name.toLowerCase();
  return blocked.some((b) => lower.includes(b));
}
