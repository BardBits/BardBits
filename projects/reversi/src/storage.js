// Everything this page keeps in the visitor's browser, in one file.
//
// The published privacy policy at /privacy describes these three keys and what
// each holds, and CLAUDE.md requires practice and policy to move together. That
// is only enforceable if there is one place to look, so all localStorage access
// lives here — nothing else in the project touches it directly. If you add a
// key, or widen what an existing one stores, /privacy changes in the same pull
// request.
//
// What the policy currently commits to, verbatim in substance:
//
//   reversi:game      the position on the board, whose turn it is, the moves so
//                     far, and which colour you are playing
//   reversi:settings  difficulty, preferred colour, and whether legal moves and
//                     animations are shown
//   reversi:record    how many games you have won, lost and drawn at each
//                     difficulty
//
// Two things deliberately absent. Self-play keeps no state here at all: its two
// level choices and its speed are held in memory and reset on reload, because
// persisting them would add fields the policy does not list. And the saved game
// does not record the difficulty it began at — difficulty is a setting, and the
// policy files it under settings, so keeping a second copy inside the game would
// put something in that key the page does not claim.
//
// localStorage rather than sessionStorage is the deliberate choice the policy
// explains: a saved game that vanished when the tab closed would not be worth
// offering.

import { CELLS, BLACK, WHITE, EMPTY } from "./engine.js";

const GAME_KEY = "reversi:game";
const SETTINGS_KEY = "reversi:settings";
const RECORD_KEY = "reversi:record";

/** Every key this project writes. The clear control below depends on it. */
export const STORAGE_KEYS = [GAME_KEY, SETTINGS_KEY, RECORD_KEY];

export const DEFAULT_SETTINGS = {
  difficulty: "medium",
  playAs: BLACK,
  showLegalMoves: false,
  animations: true,
};

const EMPTY_TALLY = { won: 0, lost: 0, drawn: 0 };

export const DEFAULT_RECORD = {
  easy: { ...EMPTY_TALLY },
  medium: { ...EMPTY_TALLY },
  hard: { ...EMPTY_TALLY },
};

/**
 * Read and parse a key, returning null for anything unusable.
 *
 * Storage can be unavailable outright — private browsing, site data blocked,
 * an embedded webview — and the value can be malformed by an older version of
 * this page or by hand. Neither is exceptional enough to break the game over,
 * so every read degrades to "no saved value" and the caller falls back.
 */
function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Over quota, or storage blocked. The game is still fully playable without
    // persistence, so losing the write is better than throwing mid-move.
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do — see write() */
  }
}

const isColour = (value) => value === BLACK || value === WHITE;
const isDifficulty = (value) => value === "easy" || value === "medium" || value === "hard";

export function loadSettings() {
  const stored = read(SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    difficulty: isDifficulty(stored.difficulty) ? stored.difficulty : DEFAULT_SETTINGS.difficulty,
    playAs: isColour(stored.playAs) ? stored.playAs : DEFAULT_SETTINGS.playAs,
    showLegalMoves:
      typeof stored.showLegalMoves === "boolean" ? stored.showLegalMoves : DEFAULT_SETTINGS.showLegalMoves,
    animations: typeof stored.animations === "boolean" ? stored.animations : DEFAULT_SETTINGS.animations,
  };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, {
    difficulty: settings.difficulty,
    playAs: settings.playAs,
    showLegalMoves: settings.showLegalMoves,
    animations: settings.animations,
  });
}

/**
 * The saved game, or null if there is none worth restoring.
 *
 * Validation is strict about the board because a corrupted one would be
 * unplayable in ways that look like engine bugs: wrong length, or a cell
 * holding something that is not empty, black or white, and the position is
 * discarded rather than loaded.
 */
export function loadGame() {
  const stored = read(GAME_KEY);
  if (!stored) return null;

  const { board, turn, playAs, moves } = stored;
  if (!Array.isArray(board) || board.length !== CELLS) return null;
  if (!board.every((cell) => cell === EMPTY || cell === BLACK || cell === WHITE)) return null;
  if (!isColour(turn) || !isColour(playAs)) return null;

  const history = Array.isArray(moves)
    ? moves.filter((m) => Number.isInteger(m?.square) && m.square >= 0 && m.square < CELLS && isColour(m.player))
    : [];

  return { board: Uint8Array.from(board), turn, playAs, moves: history };
}

export function saveGame({ board, turn, playAs, moves }) {
  return write(GAME_KEY, {
    board: Array.from(board),
    turn,
    playAs,
    // Only what the move list is read for: which square, by whom, and whether
    // it was a pass. Not the flips — those are recomputed from the position.
    moves: moves.map((m) => ({ square: m.square, player: m.player, pass: m.pass === true })),
  });
}

export function clearGame() {
  remove(GAME_KEY);
}

export function loadRecord() {
  const stored = read(RECORD_KEY);
  if (!stored) return structuredClone(DEFAULT_RECORD);

  const record = structuredClone(DEFAULT_RECORD);
  for (const level of Object.keys(DEFAULT_RECORD)) {
    const tally = stored[level];
    if (!tally || typeof tally !== "object") continue;
    for (const outcome of ["won", "lost", "drawn"]) {
      const value = tally[outcome];
      if (Number.isInteger(value) && value >= 0) record[level][outcome] = value;
    }
  }
  return record;
}

export function saveRecord(record) {
  return write(RECORD_KEY, record);
}

/**
 * Erase everything this page has stored. /privacy tells visitors the game page
 * offers this, so it is a published commitment rather than a convenience: it
 * must remove every key in STORAGE_KEYS, not just the ones the UI happens to
 * have loaded this session.
 */
export function clearAll() {
  for (const key of STORAGE_KEYS) remove(key);
}

// Note there is deliberately no availability probe here. The obvious one writes
// a scratch key and deletes it, which would put a fourth `reversi:` key in
// storage — briefly, but /privacy tells visitors there are three, and "it was
// only there for a moment" is not a claim worth having to defend. Every save
// function returns whether it succeeded, which is the same information without
// writing anything the policy does not describe.
