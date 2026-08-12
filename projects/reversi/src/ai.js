// The computer opponent: negamax with alpha-beta, iterative deepening, and an
// exact solve once the board is nearly full.
//
// Pure and synchronous — it takes a board and returns a move, with no DOM, no
// storage and no worker plumbing. ai-worker.js is the only thing that knows
// this runs off the main thread, which is what lets this file be exercised
// directly from Node.
//
// Deliberately no transposition table. Reversi transposes enough that Zobrist
// hashing plus a TT would help, but alpha-beta with the move ordering below
// already reaches the depths the three levels ask for inside their time budget,
// and a TT is a large amount of state to get subtly wrong for a gain nobody
// playing this page would notice. It is the first thing to add if the search
// ever needs to go deeper.

import {
  BLACK,
  CELLS,
  EMPTY,
  WHITE,
  applyMoveInPlace,
  countLegalMoves,
  legalMoves,
  opponent,
  undoMoveInPlace,
} from "./engine.js";

/**
 * Static square values, the usual Othello-literature shape: corners are worth
 * taking, the diagonal neighbours of an empty corner (X-squares) are worth
 * avoiding because they hand the corner over, and edges beat the interior.
 *
 * These are a starting point for the evaluation rather than the whole of it —
 * on their own they would make the engine grab edges while its mobility
 * collapsed. CORNER_ADJACENT below cancels the X-square penalty once the corner
 * it guards is no longer available, which a flat table cannot express.
 */
// prettier-ignore
const WEIGHTS = Int16Array.from([
  120, -20,  20,   5,   5,  20, -20, 120,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
   20,  -5,  15,   3,   3,  15,  -5,  20,
    5,  -5,   3,   3,   3,   3,  -5,   5,
    5,  -5,   3,   3,   3,   3,  -5,   5,
   20,  -5,  15,   3,   3,  15,  -5,  20,
  -20, -40,  -5,  -5,  -5,  -5, -40, -20,
  120, -20,  20,   5,   5,  20, -20, 120,
]);

const CORNERS = [0, 7, 56, 63];

/** For each corner, the three squares that leak it: two C-squares and an X. */
const CORNER_ADJACENT = {
  0: [1, 8, 9],
  7: [6, 15, 14],
  56: [57, 48, 49],
  63: [62, 55, 54],
};

/** Neighbour offsets used to decide whether a disc sits on the frontier. */
const NEIGHBOURS = buildNeighbours();

function buildNeighbours() {
  const table = [];
  for (let square = 0; square < CELLS; square++) {
    const row = (square / 8) | 0;
    const col = square % 8;
    const around = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) around.push(r * 8 + c);
      }
    }
    table.push(Int8Array.from(around));
  }
  return table;
}

/**
 * The three levels the page offers.
 *
 * `depth` is a ceiling rather than a promise: iterative deepening stops at
 * whichever depth the time budget allows, so a slow device degrades to a
 * shallower search instead of freezing. `randomness` picks among moves within
 * that many centi-points of the best, which is what keeps Easy from playing the
 * identical game every time and from being unbeatably consistent.
 */
export const LEVELS = {
  easy: { id: "easy", label: "Easy", depth: 1, budgetMs: 60, randomness: 900, endgameEmpties: 0 },
  medium: { id: "medium", label: "Medium", depth: 4, budgetMs: 350, randomness: 120, endgameEmpties: 8 },
  hard: { id: "hard", label: "Hard", depth: 8, budgetMs: 900, randomness: 0, endgameEmpties: 12 },
};

export const DEFAULT_LEVEL = "medium";

/** Thrown to unwind the search when the time budget is spent. */
class OutOfTime extends Error {}

/** A win is worth more than any positional assessment can be. */
const WIN_SCORE = 1_000_000;

function countEmpties(board) {
  let empties = 0;
  for (let square = 0; square < CELLS; square++) {
    if (board[square] === EMPTY) empties++;
  }
  return empties;
}

/** Normalised difference, in [-100, 100]. Zero when neither side has any. */
function ratio(mine, theirs) {
  const total = mine + theirs;
  return total === 0 ? 0 : (100 * (mine - theirs)) / total;
}

/**
 * Static evaluation from `player`'s point of view, in centi-points.
 *
 * The weighting shifts with the game phase, because the terms disagree about
 * what matters and each is right at a different moment. Disc count is close to
 * meaningless early — leading on discs in the opening usually means you have
 * taken every move available and are about to run out — so it is ignored until
 * the board starts filling. Mobility is the reverse: it decides the midgame and
 * stops mattering once there is nowhere left to play.
 */
function evaluate(board, player) {
  const foe = opponent(player);
  const empties = countEmpties(board);

  let mine = 0;
  let theirs = 0;
  let positional = 0;
  let myFrontier = 0;
  let theirFrontier = 0;

  for (let square = 0; square < CELLS; square++) {
    const cell = board[square];
    if (cell === EMPTY) continue;

    const isMine = cell === player;
    if (isMine) mine++;
    else theirs++;
    positional += isMine ? WEIGHTS[square] : -WEIGHTS[square];

    // A disc touching an empty square can be attacked; one buried inside a
    // solid block cannot. Fewer frontier discs is better, which is why the
    // term is subtracted below.
    for (const neighbour of NEIGHBOURS[square]) {
      if (board[neighbour] === EMPTY) {
        if (isMine) myFrontier++;
        else theirFrontier++;
        break;
      }
    }
  }

  let corners = 0;
  for (const corner of CORNERS) {
    const cell = board[corner];
    if (cell === player) corners += 100;
    else if (cell === foe) corners -= 100;
    else {
      // The corner is still live, so the squares that give it away are
      // genuinely bad. Once it has been taken these squares are ordinary and
      // the flat table's standing penalty would be wrong.
      for (const adjacent of CORNER_ADJACENT[corner]) {
        if (board[adjacent] === player) corners -= 30;
        else if (board[adjacent] === foe) corners += 30;
      }
    }
  }

  const mobility = ratio(countLegalMoves(board, player), countLegalMoves(board, foe));
  const frontier = -ratio(myFrontier, theirFrontier);
  const discs = ratio(mine, theirs);

  const phase =
    empties > 40
      ? { positional: 1.0, mobility: 1.3, frontier: 0.9, discs: 0.0, corners: 4.0 }
      : empties > 16
        ? { positional: 1.0, mobility: 1.0, frontier: 0.6, discs: 0.2, corners: 5.0 }
        : { positional: 0.6, mobility: 0.5, frontier: 0.2, discs: 1.4, corners: 6.0 };

  return (
    phase.positional * positional +
    phase.mobility * mobility +
    phase.frontier * frontier +
    phase.discs * discs +
    phase.corners * corners
  );
}

/** Final disc difference, scaled so that any win outranks any evaluation. */
function terminalScore(board, player) {
  let mine = 0;
  let theirs = 0;
  for (let square = 0; square < CELLS; square++) {
    if (board[square] === player) mine++;
    else if (board[square] !== EMPTY) theirs++;
  }
  const difference = mine - theirs;
  if (difference === 0) return 0;
  return difference > 0 ? WIN_SCORE + difference : -WIN_SCORE + difference;
}

/**
 * Order moves so alpha-beta prunes early. The gain is large and the cost is a
 * sort of at most a couple of dozen entries, so this is close to free.
 *
 * `preferred` is the best move from the previous, shallower iteration. Trying
 * it first is what makes iterative deepening pay for itself rather than being
 * pure repeated work: the shallow search is a guess at the ordering that makes
 * the deep search cheap.
 */
function orderMoves(moves, preferred) {
  return moves.sort((a, b) => {
    if (a.square === preferred) return -1;
    if (b.square === preferred) return 1;
    return WEIGHTS[b.square] - WEIGHTS[a.square];
  });
}

function search(board, player, depth, alpha, beta, exact, ctx, passed) {
  // Checking the clock costs more than a node does, so only sample it. The
  // budget is a soft ceiling; overshooting by a thousand nodes is invisible.
  if ((ctx.nodes++ & 1023) === 0 && Date.now() > ctx.deadline) throw new OutOfTime();

  if (depth <= 0 && !exact) return evaluate(board, player);

  const moves = legalMoves(board, player);

  if (moves.length === 0) {
    // Two passes in a row is the end of the game — the one place both the
    // midgame search and the exact solve agree to score the real result.
    if (passed) return terminalScore(board, player);
    // A pass does not consume depth. Termination is still guaranteed, because
    // the only way to pass twice is for the game to be over.
    return -search(board, opponent(player), depth, -beta, -alpha, exact, ctx, true);
  }

  orderMoves(moves, ctx.preferred[depth]);

  let best = -Infinity;
  for (const move of moves) {
    applyMoveInPlace(board, player, move.square, move.flips);
    const value = -search(board, opponent(player), depth - 1, -beta, -alpha, exact, ctx, false);
    undoMoveInPlace(board, player, move.square, move.flips);

    if (value > best) {
      best = value;
      ctx.preferred[depth] = move.square;
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // this line is refuted; the parent will not allow it
  }

  return best;
}

/**
 * Pick a move for `player`.
 *
 * Returns null when there is nothing to play, which the caller must treat as a
 * pass rather than as a failure.
 */
export function chooseMove(board, player, levelId = DEFAULT_LEVEL, now = Date.now()) {
  const level = LEVELS[levelId] ?? LEVELS[DEFAULT_LEVEL];
  const moves = legalMoves(board, player);
  if (moves.length === 0) return null;
  if (moves.length === 1) {
    return { ...moves[0], depth: 0, nodes: 0, exact: false, elapsedMs: 0 };
  }

  const empties = countEmpties(board);
  // Once few enough squares remain, stop guessing and play the position out.
  // The result is the true final disc difference, so from here the engine
  // cannot be outplayed — only out-positioned earlier.
  const exact = empties > 0 && empties <= level.endgameEmpties;

  const working = Uint8Array.from(board);
  const ctx = {
    nodes: 0,
    deadline: now + level.budgetMs,
    // Indexed by remaining depth, so each ply keeps its own best-move hint.
    preferred: new Array(CELLS + 2).fill(-1),
  };

  const maxDepth = exact ? empties : level.depth;

  // Deepening towards an exact solve is pure waste. search() ignores `depth`
  // once `exact` is set — it recurses until neither side can move — so every
  // iteration would repeat the identical full solve, and a 12-empty ending was
  // being searched twelve times over. It cost the entire time budget and left
  // the last iteration to be killed by the clock. Go straight to the one
  // search that answers the question.
  const firstDepth = exact ? maxDepth : 1;

  let bestMoves = [moves[0]];
  let completedDepth = 0;
  let bestScore = 0;

  // Iterative deepening: every depth completes before the next begins, so
  // running out of time loses the unfinished iteration rather than the answer.
  for (let depth = firstDepth; depth <= maxDepth; depth++) {
    const scored = [];
    let alpha = -Infinity;
    let aborted = false;

    try {
      for (const move of orderMoves([...moves], ctx.preferred[depth + 1])) {
        applyMoveInPlace(working, player, move.square, move.flips);
        const value = -search(working, opponent(player), depth - 1, -Infinity, -alpha, exact, ctx, false);
        undoMoveInPlace(working, player, move.square, move.flips);

        scored.push({ move, value });
        if (value > alpha) {
          alpha = value;
          ctx.preferred[depth + 1] = move.square;
        }
      }
    } catch (error) {
      if (!(error instanceof OutOfTime)) throw error;
      aborted = true;
    }

    if (aborted) {
      // With a completed depth behind us its answer stands. With none — a slow
      // device, or an ending too big for the budget — the moves this iteration
      // did score are still real evaluations, and the best of them beats
      // falling back to whichever move happened to be generated first.
      if (completedDepth === 0 && scored.length > 0) {
        scored.sort((a, b) => b.value - a.value);
        bestScore = scored[0].value;
        bestMoves = [scored[0].move];
      }
      break;
    }

    scored.sort((a, b) => b.value - a.value);
    bestScore = scored[0].value;
    // Within the level's tolerance, every move counts as best. Easy has a wide
    // tolerance and so varies its play; Hard has none and always plays the top
    // move, which is what makes it reproducible.
    bestMoves = scored.filter((s) => s.value >= bestScore - level.randomness).map((s) => s.move);
    completedDepth = depth;

    if (Date.now() > ctx.deadline) break;
  }

  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return {
    ...chosen,
    depth: completedDepth,
    nodes: ctx.nodes,
    // Only claim an exact result when the solve actually finished; a timed-out
    // one is a guess and must not report itself as perfect play.
    exact: exact && completedDepth > 0,
    score: bestScore,
    elapsedMs: Date.now() - now,
  };
}

/** Which colour won, or null for a draw. Shared by the UI and the record. */
export function winnerOf(board) {
  let black = 0;
  let white = 0;
  for (let square = 0; square < CELLS; square++) {
    if (board[square] === BLACK) black++;
    else if (board[square] === WHITE) white++;
  }
  if (black === white) return null;
  return black > white ? BLACK : WHITE;
}
