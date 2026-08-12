// Game state and turn sequencing. Knows the rules only through engine.js and
// reaches the AI only through the worker, so the DOM layer in main.js never has
// to reason about legality, passing or when it is safe to accept a click.

import {
  BLACK,
  WHITE,
  applyMove,
  createBoard,
  flipsFor,
  hasLegalMove,
  legalMoves,
  opponent,
  score,
} from "./engine.js";
import { chooseMove } from "./ai.js";
import { clearGame, loadGame, loadRecord, loadSettings, saveGame, saveRecord, saveSettings } from "./storage.js";

/** Delays between moves in the self-play demo, in milliseconds. */
export const SPEEDS = {
  slow: { id: "slow", label: "Slow", delayMs: 1200 },
  normal: { id: "normal", label: "Normal", delayMs: 500 },
  fast: { id: "fast", label: "Fast", delayMs: 120 },
};

/**
 * Shortest time an opposing move may take in a normal game.
 *
 * Easy answers in under a millisecond, and a reply that lands before you have
 * finished letting go of the mouse reads as a glitch rather than as speed. This
 * is a floor, not a delay added to the search: a level that thinks for longer
 * than this waits no extra time.
 */
const MIN_REPLY_MS = 280;

const FILES = "abcdefgh";

/** Square index to the usual notation, e.g. 19 -> "d3". */
export function notation(square) {
  return FILES[square % 8] + (Math.floor(square / 8) + 1);
}

export class Game {
  constructor() {
    this.listeners = new Set();
    this.settings = loadSettings();
    this.record = loadRecord();

    // Bumped whenever the position changes in a way that invalidates a search
    // already in flight — a new game, a restart, leaving the demo. A reply
    // tagged with a stale generation is dropped rather than played onto a board
    // it was never calculated for.
    this.generation = 0;
    this.pendingTimer = null;
    this.worker = this.startWorker();
    this.workerRequests = new Map();
    this.nextRequestId = 1;

    this.mode = "human";
    this.demo = { black: "medium", white: "hard", speed: "normal" };
    this.thinking = false;
    this.lastStats = null;
    this.storageFailed = false;

    const saved = loadGame();
    if (saved) {
      this.board = saved.board;
      this.turn = saved.turn;
      this.playAs = saved.playAs;
      this.moves = saved.moves;
      this.resumed = true;
    } else {
      this.resetBoard();
      this.resumed = false;
    }
  }

  /**
   * Construct the worker, tolerating environments that refuse to give us one.
   * Module workers are widely supported but not universally, and a page that
   * throws on load is worse than one whose AI runs inline and stutters a little.
   */
  startWorker() {
    try {
      const worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
      worker.addEventListener("message", (event) => this.onWorkerMessage(event.data));
      worker.addEventListener("error", () => {
        this.worker = null; // fall back to searching on the main thread
      });
      return worker;
    } catch {
      return null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }

  // --- state ---------------------------------------------------------------

  resetBoard() {
    this.board = createBoard();
    this.turn = BLACK; // black always opens
    this.playAs = this.settings.playAs;
    this.moves = [];
  }

  get isDemo() {
    return this.mode === "demo";
  }

  get isOver() {
    return !hasLegalMove(this.board, BLACK) && !hasLegalMove(this.board, WHITE);
  }

  get score() {
    return score(this.board);
  }

  /** Whose turn it is to be played by a person rather than by the search. */
  get humanToMove() {
    return !this.isDemo && this.turn === this.playAs && !this.isOver;
  }

  get legalSquares() {
    if (this.isOver) return [];
    return legalMoves(this.board, this.turn).map((m) => m.square);
  }

  get lastMove() {
    for (let i = this.moves.length - 1; i >= 0; i--) {
      if (!this.moves[i].pass) return this.moves[i].square;
    }
    return null;
  }

  /** Which level is choosing the current move, in either mode. */
  levelToMove() {
    if (!this.isDemo) return this.settings.difficulty;
    return this.turn === BLACK ? this.demo.black : this.demo.white;
  }

  // --- persistence ---------------------------------------------------------

  /**
   * The demo never persists. Its state is a transient showcase, and writing it
   * would both destroy a real saved game and store fields /privacy does not
   * describe. See the header of storage.js.
   */
  persist() {
    if (this.isDemo) return;
    const ok = saveGame({ board: this.board, turn: this.turn, playAs: this.playAs, moves: this.moves });
    if (!ok) this.storageFailed = true;
  }

  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (!saveSettings(this.settings)) this.storageFailed = true;
    this.emit();
  }

  // --- moves ---------------------------------------------------------------

  /**
   * Play a square for the side to move. Returns false if the move was not
   * legal or it was not a person's turn, so the UI can ignore stray clicks
   * without checking the rules itself.
   */
  playHuman(square) {
    if (!this.humanToMove || this.thinking) return false;
    const flips = flipsFor(this.board, this.turn, square);
    if (flips === null) return false;
    this.commit(square, flips);
    return true;
  }

  commit(square, flips) {
    this.board = applyMove(this.board, this.turn, square, flips);
    this.moves.push({ square, player: this.turn, pass: false });
    this.advance();
  }

  /**
   * Hand the turn over, recording a pass when the next player cannot move.
   *
   * Passing is the rule most often got wrong: the turn goes back to the player
   * who just moved, and only when *neither* side can move is the game over.
   * Doing it here rather than at each call site is what keeps the two paths —
   * a person's move and the search's — from drifting apart.
   */
  advance() {
    const next = opponent(this.turn);
    if (hasLegalMove(this.board, next)) {
      this.turn = next;
    } else if (hasLegalMove(this.board, this.turn)) {
      this.moves.push({ square: -1, player: next, pass: true });
      // Turn stays where it is: the opponent has been forced to pass.
    }

    if (this.isOver) {
      this.finish();
    } else {
      this.persist();
      this.emit();
      this.scheduleAiTurn();
    }
  }

  finish() {
    // The record counts games a person played, so the demo is excluded — a
    // showcase inflating your win rate would make the number meaningless.
    if (!this.isDemo) {
      const { black, white } = this.score;
      const mine = this.playAs === BLACK ? black : white;
      const theirs = this.playAs === BLACK ? white : black;
      const outcome = mine > theirs ? "won" : mine < theirs ? "lost" : "drawn";
      const level = this.settings.difficulty;
      this.record = {
        ...this.record,
        [level]: { ...this.record[level], [outcome]: this.record[level][outcome] + 1 },
      };
      if (!saveRecord(this.record)) this.storageFailed = true;

      // reversi:game means "a game in progress", so a finished one is cleared
      // rather than left behind holding a position that is no longer playable.
      clearGame();
    }
    this.thinking = false;
    this.emit();
  }

  // --- the search ----------------------------------------------------------

  scheduleAiTurn() {
    if (this.isOver) return;
    if (!this.isDemo && this.turn === this.playAs) return;

    const generation = this.generation;
    const level = this.levelToMove();
    const startedAt = Date.now();
    // In the demo the pause is the point — it is what makes the game watchable.
    const floor = this.isDemo ? SPEEDS[this.demo.speed].delayMs : MIN_REPLY_MS;

    this.thinking = true;
    this.emit();

    this.requestMove(this.board, this.turn, level, generation, (move, stats) => {
      if (generation !== this.generation) return; // the board moved on without us

      const wait = Math.max(0, floor - (Date.now() - startedAt));
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        if (generation !== this.generation) return;

        this.thinking = false;
        this.lastStats = stats;
        if (move === null) {
          // No legal move: advance() records the pass and hands back.
          this.advance();
        } else {
          this.commit(move.square, move.flips);
        }
      }, wait);
    });
  }

  requestMove(board, player, level, generation, done) {
    if (!this.worker) {
      // No worker available. Searching inline blocks the page for the level's
      // budget, which is why it is the fallback rather than the default.
      const move = chooseMove(board, player, level);
      done(move, move && { depth: move.depth, nodes: move.nodes, exact: move.exact });
      return;
    }

    const id = this.nextRequestId++;
    this.workerRequests.set(id, { done, generation });
    this.worker.postMessage({ id, board: Array.from(board), player, level });
  }

  onWorkerMessage(data) {
    const request = this.workerRequests.get(data.id);
    if (!request) return;
    this.workerRequests.delete(data.id);

    if (data.error) {
      // The worker failed on this position. Retry inline so the game continues,
      // and stop using the worker rather than failing again every move.
      this.worker = null;
      const move = chooseMove(this.board, this.turn, this.levelToMove());
      request.done(move, move && { depth: move.depth, nodes: move.nodes, exact: move.exact });
      return;
    }

    request.done(data.move, data.stats);
  }

  // --- commands ------------------------------------------------------------

  /** Abandon anything in flight. Every state change that invalidates a search
   *  goes through here, so there is one place to get it right. */
  interrupt() {
    this.generation++;
    this.thinking = false;
    this.lastStats = null;
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.workerRequests.clear();
  }

  newGame() {
    this.interrupt();
    this.mode = "human";
    this.resetBoard();
    this.resumed = false;
    this.persist();
    this.emit();
    this.scheduleAiTurn(); // the AI opens when the person plays white
  }

  startDemo(config = {}) {
    this.interrupt();
    this.demo = { ...this.demo, ...config };
    this.mode = "demo";
    // Deliberately does not touch storage: the saved human game survives
    // untouched and is restored when the demo stops.
    this.board = createBoard();
    this.turn = BLACK;
    this.moves = [];
    this.emit();
    this.scheduleAiTurn();
  }

  updateDemo(config) {
    const wasRunning = this.isDemo;
    this.demo = { ...this.demo, ...config };
    if (wasRunning) {
      // Restart so a level change takes effect from a clean position rather
      // than mid-game, where it would look like the engine changed its mind.
      this.startDemo();
    } else {
      this.emit();
    }
  }

  stopDemo() {
    this.interrupt();
    this.mode = "human";
    const saved = loadGame();
    if (saved) {
      this.board = saved.board;
      this.turn = saved.turn;
      this.playAs = saved.playAs;
      this.moves = saved.moves;
    } else {
      this.resetBoard();
    }
    this.emit();
    this.scheduleAiTurn();
  }

  /** Used by the clear control, which /privacy promises this page provides. */
  resetStoredData() {
    this.interrupt();
    this.record = loadRecord();
    this.settings = loadSettings();
    this.mode = "human";
    this.resetBoard();
    this.resumed = false;
    this.storageFailed = false;
    this.emit();
    this.scheduleAiTurn();
  }
}
