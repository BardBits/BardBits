// The rules of Reversi, as pure functions over a 64-cell board.
//
// Nothing here touches the DOM, storage or the clock, so both the UI and the
// search in ai.js run against the same rules rather than each keeping its own
// idea of what is legal. A disagreement between those two is the bug class this
// file exists to make impossible.
//
// The board is a Uint8Array of 64 cells rather than a bitboard. Bitboards
// generate moves in a handful of shifts and are what a serious engine uses, but
// in JavaScript they cost either BigInt — immutable, so every operation
// allocates, which is the wrong shape for a hot search loop — or a hand-split
// pair of 32-bit halves that is easy to get subtly and silently wrong. The
// precomputed rays below get enough of the speed for a fraction of the risk:
// the search reaches the depths the difficulty levels ask for, and every
// function here stays short enough to check by eye. Revisit only if search
// depth becomes the limiting factor, which it is not today.

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

/** The eight directions a line of discs can run in, as [rowStep, colStep]. */
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/**
 * For every square, the squares lying along each direction from it, in order,
 * stopping at the edge. Walking a precomputed ray means move generation never
 * does bounds arithmetic, which is where off-board wraparound bugs live.
 *
 * Rays shorter than two squares are dropped: a capture needs at least one
 * opponent disc followed by one of your own, so a one-square ray can never
 * produce a flip and checking it is wasted work in the inner loop.
 */
const RAYS = buildRays();

function buildRays() {
  const rays = [];
  for (let square = 0; square < CELLS; square++) {
    const row = Math.floor(square / SIZE);
    const col = square % SIZE;
    const fromSquare = [];
    for (const [rowStep, colStep] of DIRECTIONS) {
      const ray = [];
      let r = row + rowStep;
      let c = col + colStep;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
        ray.push(r * SIZE + c);
        r += rowStep;
        c += colStep;
      }
      if (ray.length >= 2) fromSquare.push(Int8Array.from(ray));
    }
    rays.push(fromSquare);
  }
  return rays;
}

export function opponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

/**
 * The standard opening position: four discs in the centre, arranged so the two
 * colours sit diagonally opposite. Black moves first.
 */
export function createBoard() {
  const board = new Uint8Array(CELLS);
  board[27] = WHITE; // d4
  board[28] = BLACK; // e4
  board[35] = BLACK; // d5
  board[36] = WHITE; // e5
  return board;
}

/**
 * The squares `player` would flip by playing `square`, or null if the move is
 * illegal. An empty array is never returned: a move that flips nothing is not
 * legal in Reversi, so null and "no flips" are the same answer and collapsing
 * them keeps callers from having to test both.
 */
export function flipsFor(board, player, square) {
  if (board[square] !== EMPTY) return null;
  const foe = opponent(player);
  let flips = null;

  for (const ray of RAYS[square]) {
    let i = 0;
    while (i < ray.length && board[ray[i]] === foe) i++;
    // A run of opponent discs only counts once it is closed by one of ours.
    // i === 0 means the line did not start with an opponent disc; running off
    // the end of the ray, or ending on an empty square, means it is unclosed.
    if (i === 0 || i >= ray.length || board[ray[i]] !== player) continue;
    if (flips === null) flips = [];
    for (let j = 0; j < i; j++) flips.push(ray[j]);
  }

  return flips;
}

/** Every legal move for `player`, each carrying the flips it would make. */
export function legalMoves(board, player) {
  const moves = [];
  for (let square = 0; square < CELLS; square++) {
    const flips = flipsFor(board, player, square);
    if (flips !== null) moves.push({ square, flips });
  }
  return moves;
}

/**
 * Whether playing `square` is legal, without building the list of flips.
 *
 * Separate from flipsFor because the evaluator counts moves for both colours at
 * every node of the search, and it only needs the answer, not the flips.
 * Allocating an array per legal move there was the difference between a search
 * that pauses to collect garbage and one that does not.
 */
export function isLegalMove(board, player, square) {
  if (board[square] !== EMPTY) return false;
  const foe = opponent(player);

  for (const ray of RAYS[square]) {
    let i = 0;
    while (i < ray.length && board[ray[i]] === foe) i++;
    if (i > 0 && i < ray.length && board[ray[i]] === player) return true;
  }

  return false;
}

/**
 * Whether `player` has any legal move. Stops at the first one, and the pass
 * rule asks this question far more often than it asks for the list.
 */
export function hasLegalMove(board, player) {
  for (let square = 0; square < CELLS; square++) {
    if (isLegalMove(board, player, square)) return true;
  }
  return false;
}

/** How many legal moves `player` has — the raw material of the mobility term. */
export function countLegalMoves(board, player) {
  let count = 0;
  for (let square = 0; square < CELLS; square++) {
    if (isLegalMove(board, player, square)) count++;
  }
  return count;
}

/** A copy of `board` with the move played. The original is left untouched. */
export function applyMove(board, player, square, flips) {
  const next = Uint8Array.from(board);
  next[square] = player;
  for (const flipped of flips) next[flipped] = player;
  return next;
}

/**
 * Play a move directly into `board`, for the search, which makes and unmakes
 * millions of moves and cannot afford a copy each time. The UI uses applyMove
 * instead: it keeps previous positions for undo, so sharing one mutable board
 * would quietly rewrite the history behind it.
 */
export function applyMoveInPlace(board, player, square, flips) {
  board[square] = player;
  for (const flipped of flips) board[flipped] = player;
}

/** Reverse applyMoveInPlace. `flips` must be the array that was played. */
export function undoMoveInPlace(board, player, square, flips) {
  board[square] = EMPTY;
  const foe = opponent(player);
  for (const flipped of flips) board[flipped] = foe;
}

export function score(board) {
  let black = 0;
  let white = 0;
  for (let square = 0; square < CELLS; square++) {
    if (board[square] === BLACK) black++;
    else if (board[square] === WHITE) white++;
  }
  return { black, white, empty: CELLS - black - white };
}

/**
 * A game ends when neither player can move — which is usually a full board, but
 * also covers the case where one colour has been wiped out or both sides are
 * blocked with empty squares left. Checking both sides rather than counting
 * empty cells is what makes those endings terminate correctly.
 */
export function isGameOver(board) {
  return !hasLegalMove(board, BLACK) && !hasLegalMove(board, WHITE);
}
