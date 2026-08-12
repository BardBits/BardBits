// Runs the search off the main thread.
//
// The only file that knows the AI is not on the main thread; ai.js stays a
// plain synchronous function so it can be tested from Node. Hard can spend most
// of a second in a single call, and on the main thread that would freeze the
// board mid-flip and block the disc animation — the classic symptom of a game
// that "feels broken" while being entirely correct.
//
// Loaded by game.js as `new Worker(new URL("./ai-worker.js", import.meta.url),
// { type: "module" })`, which makes it a same-origin file the site's
// Content-Security-Policy already allows. See the note in vite.config.js before
// changing how it is imported.

import { chooseMove } from "./ai.js";

self.addEventListener("message", (event) => {
  const { id, board, player, level } = event.data;

  try {
    // The board arrives as a plain array through structured cloning.
    const move = chooseMove(Uint8Array.from(board), player, level);
    self.postMessage({
      id,
      move: move === null ? null : { square: move.square, flips: move.flips },
      // Carried back for the "thinking" readout beside the board. Nothing
      // depends on these, so a future change to the search cannot break the UI.
      stats: move === null ? null : { depth: move.depth, nodes: move.nodes, exact: move.exact },
    });
  } catch (error) {
    // The main thread falls back to searching inline rather than hanging.
    self.postMessage({ id, error: String(error?.message ?? error) });
  }
});
