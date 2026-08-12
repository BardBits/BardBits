// Tests for the rules and the search. Run with `npm test --workspace projects/reversi`.
//
// Node-only on purpose: engine.js and ai.js touch no DOM, no storage and no
// worker, so the parts of this project that are hard to eyeball — pass
// handling, the exact endgame solve, whether Hard is actually stronger than
// Easy — can be checked without a browser. The UI layer is verified in the
// composed preview instead, where the real Content-Security-Policy applies.
//
// No test framework: this project has no runtime dependencies and adding a
// dev one to assert a few dozen facts is not a trade worth making.

import {
  BLACK,
  WHITE,
  applyMove,
  createBoard,
  countLegalMoves,
  flipsFor,
  hasLegalMove,
  isGameOver,
  isLegalMove,
  legalMoves,
  opponent,
  score,
} from "../src/engine.js";
import { LEVELS, chooseMove, winnerOf } from "../src/ai.js";

let failures = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    console.log(`  ok    ${name}`);
  } else {
    console.log(`  FAIL  ${name}\n          expected ${b}\n          actual   ${a}`);
    failures++;
  }
}

function ok(name, condition, detail = "") {
  if (condition) console.log(`  ok    ${name}${detail ? `  (${detail})` : ""}`);
  else {
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ""}`);
    failures++;
  }
}

// --- rules -------------------------------------------------------------------

console.log("\nrules");

const opening = createBoard();
check("opening position is 2-2", score(opening), { black: 2, white: 2, empty: 60 });
check(
  "black's four opening moves",
  legalMoves(opening, BLACK).map((m) => m.square),
  [19, 26, 37, 44],
);
check(
  "white's four opening moves",
  legalMoves(opening, WHITE).map((m) => m.square),
  [20, 29, 34, 43],
);
check("d3 flips exactly d4", flipsFor(opening, BLACK, 19), [27]);
check("an occupied square is illegal", flipsFor(opening, BLACK, 27), null);
check("an empty square that flips nothing is illegal", flipsFor(opening, BLACK, 0), null);
check("the opening is not a finished game", isGameOver(opening), false);
check("countLegalMoves agrees with legalMoves", countLegalMoves(opening, BLACK), 4);
check("isLegalMove agrees with flipsFor", isLegalMove(opening, BLACK, 19), true);

const afterD3 = applyMove(opening, BLACK, 19, flipsFor(opening, BLACK, 19));
check("playing d3 flips one disc", score(afterD3), { black: 4, white: 1, empty: 59 });
check("applyMove leaves the original board alone", score(opening), { black: 2, white: 2, empty: 60 });

// A disc on the left edge must not capture across the board to the right edge.
// Ray tables make this structurally impossible; the test pins that down.
const edge = new Uint8Array(64);
edge[24] = WHITE; // a4
edge[25] = BLACK; // b4
check("no wraparound off the left edge", flipsFor(edge, BLACK, 31), null);

// One colour wiped out ends the game even with the board half empty.
const wipedOut = new Uint8Array(64);
wipedOut[27] = BLACK;
wipedOut[28] = BLACK;
check("a board with one colour left is over", isGameOver(wipedOut), true);

// A position where black must pass but white can still move, which is the case
// turn sequencing gets wrong if it only ever alternates.
//
// a1 white, b1 black, c1 empty. White plays c1 and captures b1 against a1.
// Black has nothing: the only disc it could bracket is the white one on a1,
// and every line through it runs off the board instead of reaching a second
// black disc. Getting this fixture wrong is easy — two white discs and no
// black one leaves *neither* side a move, which is a finished game rather than
// a pass, and quietly tests nothing.
const mustPass = new Uint8Array(64);
mustPass[0] = WHITE; // a1
mustPass[1] = BLACK; // b1
// c1 is left empty, and is white's move.
ok("black has no move here", !hasLegalMove(mustPass, BLACK));
ok("white does have a move here", hasLegalMove(mustPass, WHITE), "so the game is not over");
check("a one-sided position is not a finished game", isGameOver(mustPass), false);

// --- search ------------------------------------------------------------------

console.log("\nsearch");

// Every move the search returns must be legal on the board it was handed.
function playOut(blackLevel, whiteLevel) {
  let board = createBoard();
  let player = BLACK;
  let passes = 0;
  let plies = 0;

  while (passes < 2 && plies < 80) {
    const move = chooseMove(board, player, player === BLACK ? blackLevel : whiteLevel);
    if (move === null) {
      passes++;
    } else {
      if (flipsFor(board, player, move.square) === null) {
        throw new Error(`search returned illegal move ${move.square}`);
      }
      passes = 0;
      board = applyMove(board, player, move.square, move.flips);
      plies++;
    }
    player = opponent(player);
  }
  return board;
}

// Colours alternate so neither level keeps the first-move advantage.
let hardWins = 0;
const GAMES = 8;
for (let i = 0; i < GAMES; i++) {
  const hardIsBlack = i % 2 === 0;
  const board = playOut(hardIsBlack ? "hard" : "easy", hardIsBlack ? "easy" : "hard");
  if (winnerOf(board) === (hardIsBlack ? BLACK : WHITE)) hardWins++;
}
ok("hard beats easy", hardWins >= GAMES - 1, `${hardWins}/${GAMES}`);

let mediumWins = 0;
for (let i = 0; i < 6; i++) {
  const mediumIsBlack = i % 2 === 0;
  const board = playOut(mediumIsBlack ? "medium" : "easy", mediumIsBlack ? "easy" : "medium");
  if (winnerOf(board) === (mediumIsBlack ? BLACK : WHITE)) mediumWins++;
}
ok("medium beats easy", mediumWins >= 4, `${mediumWins}/6`);

// A free corner with a line to close is the move; anything else is a blunder.
{
  const board = new Uint8Array(64);
  board[9] = WHITE;
  board[18] = WHITE;
  board[27] = WHITE;
  board[36] = BLACK;
  const move = chooseMove(board, BLACK, "hard");
  check("hard takes an available corner", move?.square, 0);
}

// Played down to a handful of empties, hard must stop evaluating and solve.
{
  let board = createBoard();
  let player = BLACK;
  let passes = 0;
  while (passes < 2 && score(board).empty > 10) {
    const moves = legalMoves(board, player);
    if (moves.length === 0) {
      passes++;
    } else {
      passes = 0;
      const move = moves[Math.floor(Math.random() * moves.length)];
      board = applyMove(board, player, move.square, move.flips);
    }
    player = opponent(player);
  }
  const empties = score(board).empty;
  const move = chooseMove(board, player, "hard");
  if (move === null) {
    ok("the endgame position had a move to make", false);
  } else {
    ok("hard switches to an exact solve near the end", move.exact === true, `${empties} empties`);
    ok("the exact solve searches every remaining ply", move.depth >= empties - 1, `depth ${move.depth}`);
  }
}

// An exact solve at the threshold must actually finish.
//
// This exists because asserting the reported depth did not catch the bug it
// guards: an exact search ignores `depth` and recurses until the board is
// full, so deepening towards it repeated the identical solve once per level,
// burning the whole budget and leaving the last iteration to be killed by the
// clock — while the loop counter still reached the end and the assertion still
// passed. Timing is what exposed it.
{
  const threshold = LEVELS.hard.endgameEmpties;
  let solved = 0;
  let trials = 0;
  let slowest = 0;

  for (let trial = 0; trial < 8; trial++) {
    let board = createBoard();
    let player = BLACK;
    let passes = 0;
    while (passes < 2 && score(board).empty > threshold) {
      const moves = legalMoves(board, player);
      if (moves.length === 0) {
        passes++;
      } else {
        passes = 0;
        const move = moves[Math.floor(Math.random() * moves.length)];
        board = applyMove(board, player, move.square, move.flips);
      }
      player = opponent(player);
    }
    if (score(board).empty !== threshold) continue;

    const started = Date.now();
    const move = chooseMove(board, player, "hard");
    const elapsed = Date.now() - started;
    if (move === null) continue;

    trials++;
    slowest = Math.max(slowest, elapsed);
    if (move.exact) solved++;
  }

  ok("the endgame threshold is reachable to test", trials > 0, `${trials} positions`);
  ok("every solve at the threshold completes", solved === trials, `${solved}/${trials} exact`);
  // Comfortably inside the budget rather than merely under it — the margin is
  // what a slower device gets to spend.
  ok(
    "the solve leaves headroom on a slower device",
    slowest < LEVELS.hard.budgetMs / 2,
    `slowest ${slowest}ms of ${LEVELS.hard.budgetMs}ms`,
  );
}

// The budget is a soft ceiling — the clock is sampled every 1024 nodes — so
// this asserts the search returns promptly, not that it is millisecond-exact.
{
  const board = createBoard();
  for (const id of Object.keys(LEVELS)) {
    const started = Date.now();
    chooseMove(board, BLACK, id);
    const elapsed = Date.now() - started;
    ok(`${id} stays inside its time budget`, elapsed < LEVELS[id].budgetMs + 400, `${elapsed}ms`);
  }
}

// Passing and termination, exercised through a whole game rather than asserted.
{
  const board = playOut("medium", "medium");
  const final = score(board);
  ok("a full game terminates", isGameOver(board), JSON.stringify(final));
  check("discs are conserved", final.black + final.white + final.empty, 64);
}

// --- result ------------------------------------------------------------------

console.log(failures ? `\n${failures} check(s) FAILED\n` : "\nall checks passed\n");
process.exit(failures ? 1 : 0);
