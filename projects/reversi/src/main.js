// The DOM layer: builds the board once, then reflects game state onto it.
//
// Holds no rules and no game state of its own. Everything it shows comes from
// the Game instance, and every interaction goes back through a Game method, so
// the page cannot get into a state the game does not agree with.

import "./style.css";
import { BLACK, WHITE, EMPTY, SIZE, CELLS } from "./engine.js";
import { Game, SPEEDS, notation } from "./game.js";
import { LEVELS } from "./ai.js";
import { clearAll } from "./storage.js";

const $ = (id) => document.getElementById(id);

const els = {
  board: $("board"),
  status: $("status"),
  thinking: $("thinking"),
  announcer: $("announcer"),
  countBlack: $("count-black"),
  countWhite: $("count-white"),
  tallyBlack: $("tally-black"),
  tallyWhite: $("tally-white"),
  labelBlack: $("label-black"),
  labelWhite: $("label-white"),
  newGame: $("new-game"),
  difficulty: $("difficulty"),
  playAs: $("play-as"),
  showLegal: $("show-legal"),
  animations: $("animations"),
  demoToggle: $("demo-toggle"),
  demoBlack: $("demo-black"),
  demoWhite: $("demo-white"),
  demoSpeed: $("demo-speed"),
  moves: $("moves"),
  recordBody: $("record-body"),
  storageWarning: $("storage-warning"),
  clearData: $("clear-data"),
};

const game = new Game();
const cells = [];

// --- board construction ------------------------------------------------------

/**
 * Cells are buttons inside a grid. Each carries its own label — "d3, empty,
 * legal move" — because a screen reader user moving across the board hears one
 * cell at a time and a bare coordinate would tell them nothing about the
 * position.
 */
function buildBoard() {
  for (let row = 0; row < SIZE; row++) {
    const rowEl = document.createElement("div");
    // setAttribute rather than the .role property: the reflected property is
    // recent enough that older browsers would silently drop the role and leave
    // the grid malformed, which is worse than no grid semantics at all.
    rowEl.setAttribute("role", "row");
    rowEl.style.display = "contents"; // the grid is on .board; rows are semantic only

    for (let col = 0; col < SIZE; col++) {
      const square = row * SIZE + col;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.square = String(square);
      cell.dataset.state = "empty";
      // Roving tabindex: one stop for the whole board, arrows move within it.
      cell.tabIndex = square === 0 ? 0 : -1;

      const disc = document.createElement("span");
      disc.className = "disc";
      for (const face of ["black", "white"]) {
        const faceEl = document.createElement("span");
        faceEl.className = `disc-face ${face}`;
        disc.append(faceEl);
      }
      cell.append(disc);

      rowEl.append(cell);
      cells.push(cell);
    }
    els.board.append(rowEl);
  }
}

// --- rendering ---------------------------------------------------------------

const NAMES = { [BLACK]: "Black", [WHITE]: "White" };

function describeCell(square, state, isLegal) {
  const where = notation(square);
  const occupant = state === EMPTY ? "empty" : NAMES[state].toLowerCase();
  return isLegal ? `${where}, ${occupant}, legal move` : `${where}, ${occupant}`;
}

function render() {
  const legal = new Set(game.legalSquares);
  const showHints = game.settings.showLegalMoves && !game.isDemo && game.humanToMove;
  const last = game.lastMove;

  for (let square = 0; square < CELLS; square++) {
    const cell = cells[square];
    const state = game.board[square];
    const playable = game.humanToMove && legal.has(square) && !game.thinking;

    cell.dataset.state = state === BLACK ? "black" : state === WHITE ? "white" : "empty";
    cell.classList.toggle("legal", showHints && legal.has(square));
    cell.classList.toggle("playable", playable);
    cell.classList.toggle("last", square === last);
    // Squares that cannot be played are still reachable by keyboard — you need
    // to be able to read the board — but they are marked unavailable rather
    // than silently doing nothing when activated.
    cell.disabled = false;
    cell.setAttribute("aria-disabled", playable ? "false" : "true");
    cell.setAttribute("aria-label", describeCell(square, state, showHints && legal.has(square)));
  }

  const { black, white } = game.score;
  els.countBlack.textContent = String(black);
  els.countWhite.textContent = String(white);
  els.tallyBlack.classList.toggle("active", !game.isOver && game.turn === BLACK);
  els.tallyWhite.classList.toggle("active", !game.isOver && game.turn === WHITE);

  // Say which side is yours, so "Black" means something once you have switched.
  els.labelBlack.textContent = game.isDemo ? "Black" : game.playAs === BLACK ? "Black — you" : "Black";
  els.labelWhite.textContent = game.isDemo ? "White" : game.playAs === WHITE ? "White — you" : "White";

  els.status.textContent = statusText();
  els.thinking.hidden = !game.thinking;
  els.thinking.textContent = thinkingText();

  renderMoves();
  renderRecord();

  els.demoToggle.textContent = game.isDemo ? "Stop demo" : "Start demo";
  els.difficulty.disabled = game.isDemo;
  els.playAs.disabled = game.isDemo;
  els.storageWarning.hidden = !game.storageFailed;

  document.body.classList.toggle("no-animation", !game.settings.animations);
}

function statusText() {
  if (game.isOver) {
    const { black, white } = game.score;
    if (black === white) return `Drawn, ${black}–${white}.`;
    const winner = black > white ? BLACK : WHITE;
    const margin = `${Math.max(black, white)}–${Math.min(black, white)}`;
    if (game.isDemo) return `${NAMES[winner]} wins, ${margin}.`;
    return winner === game.playAs ? `You win, ${margin}.` : `${NAMES[winner]} wins, ${margin}.`;
  }

  const justPassed = game.moves.at(-1)?.pass;
  const whose = game.isDemo
    ? `${NAMES[game.turn]} to play`
    : game.turn === game.playAs
      ? "Your move"
      : `${NAMES[game.turn]} to play`;

  return justPassed ? `${whose} — no legal move for the other side.` : `${whose}.`;
}

function thinkingText() {
  const level = LEVELS[game.levelToMove()];
  return game.isDemo ? `${NAMES[game.turn]} (${level.label}) thinking…` : `${level.label} is thinking…`;
}

function renderMoves() {
  els.moves.replaceChildren();

  if (game.moves.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No moves yet.";
    els.moves.append(li);
    return;
  }

  game.moves.forEach((move, index) => {
    const li = document.createElement("li");
    const pip = document.createElement("span");
    pip.className = `pip pip-${move.player === BLACK ? "black" : "white"}`;
    pip.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    // The number is the ply, and passes are numbered too — a move list that
    // silently skipped them would not line up with the board.
    text.textContent = `${index + 1}. ${move.pass ? "pass" : notation(move.square)}`;
    li.append(pip, text);
    li.setAttribute(
      "aria-label",
      `Move ${index + 1}, ${NAMES[move.player]}, ${move.pass ? "passed" : notation(move.square)}`,
    );
    els.moves.append(li);
  });

  els.moves.scrollTop = els.moves.scrollHeight;
}

function renderRecord() {
  els.recordBody.replaceChildren();
  for (const id of ["easy", "medium", "hard"]) {
    const tally = game.record[id];
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = LEVELS[id].label;
    tr.append(th);
    for (const outcome of ["won", "lost", "drawn"]) {
      const td = document.createElement("td");
      td.textContent = String(tally[outcome]);
      tr.append(td);
    }
    els.recordBody.append(tr);
  }
}

// --- announcements -----------------------------------------------------------

// Only the things a sighted player learns by watching: what the opponent did,
// that somebody passed, and how it ended. Announcing the player's own move
// would repeat what they just did.
let announcedPlies = 0;
let announcedOver = false;

function announce() {
  const moves = game.moves;

  if (moves.length > announcedPlies) {
    const move = moves.at(-1);
    const mine = !game.isDemo && move.player === game.playAs;
    if (move.pass) {
      say(`${NAMES[move.player]} has no legal move and passes.`);
    } else if (!mine) {
      say(`${NAMES[move.player]} plays ${notation(move.square)}.`);
    }
  }
  announcedPlies = moves.length;

  if (game.isOver && !announcedOver) {
    announcedOver = true;
    say(statusText());
  } else if (!game.isOver) {
    announcedOver = false;
  }
}

function say(message) {
  els.announcer.textContent = message;
}

// --- keyboard ----------------------------------------------------------------

let focusedSquare = 0;

/**
 * Arrow keys walk the grid, Home and End jump to the ends of a row, and
 * Ctrl+Home / Ctrl+End to the corners of the board. Only one cell is ever a tab
 * stop, so Tab enters and leaves the board rather than walking 64 buttons.
 */
function onBoardKeyDown(event) {
  const step = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -SIZE,
    ArrowDown: SIZE,
  }[event.key];

  let next = null;
  const row = Math.floor(focusedSquare / SIZE);
  const col = focusedSquare % SIZE;

  if (step !== undefined) {
    // Guard the edges by axis: moving left from column 0 must not wrap onto
    // the end of the row above, which a bare index step would do.
    if (event.key === "ArrowLeft" && col === 0) next = focusedSquare;
    else if (event.key === "ArrowRight" && col === SIZE - 1) next = focusedSquare;
    else next = focusedSquare + step;
  } else if (event.key === "Home") {
    next = event.ctrlKey ? 0 : row * SIZE;
  } else if (event.key === "End") {
    next = event.ctrlKey ? CELLS - 1 : row * SIZE + SIZE - 1;
  }

  if (next === null || next === undefined) return;
  if (next < 0 || next >= CELLS) return;

  event.preventDefault();
  focusSquare(next);
}

function focusSquare(square) {
  cells[focusedSquare].tabIndex = -1;
  focusedSquare = square;
  cells[square].tabIndex = 0;
  cells[square].focus();
}

// --- wiring ------------------------------------------------------------------

function attemptMove(square) {
  if (game.playHuman(square)) return;

  // Explain the refusal rather than doing nothing, which is indistinguishable
  // from the page being broken.
  if (game.isOver) say("The game is over. Start a new game to play again.");
  else if (game.isDemo) say("The demo is running. Stop it to play yourself.");
  else if (game.turn !== game.playAs) say("Not your turn yet.");
  else say(`${notation(square)} is not a legal move.`);
}

function wire() {
  els.board.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell) return;
    const square = Number(cell.dataset.square);
    focusSquare(square);
    attemptMove(square);
  });

  els.board.addEventListener("keydown", onBoardKeyDown);

  // Keep the roving tab stop where the user last was, including after a click.
  els.board.addEventListener("focusin", (event) => {
    const cell = event.target.closest(".cell");
    if (cell) {
      const square = Number(cell.dataset.square);
      if (square !== focusedSquare) {
        cells[focusedSquare].tabIndex = -1;
        focusedSquare = square;
        cell.tabIndex = 0;
      }
    }
  });

  els.newGame.addEventListener("click", () => {
    game.newGame();
    say("New game. Black to play.");
  });

  els.difficulty.addEventListener("change", (event) => {
    game.updateSettings({ difficulty: event.target.value });
  });

  els.playAs.addEventListener("change", (event) => {
    const playAs = Number(event.target.value);
    game.updateSettings({ playAs });
    // Colour only takes effect from a fresh position — switching sides
    // mid-game would hand you the opponent's discs.
    game.newGame();
    say(`You now play ${NAMES[playAs]}. New game started.`);
  });

  els.showLegal.addEventListener("change", (event) => {
    game.updateSettings({ showLegalMoves: event.target.checked });
  });

  els.animations.addEventListener("change", (event) => {
    game.updateSettings({ animations: event.target.checked });
  });

  els.demoToggle.addEventListener("click", () => {
    if (game.isDemo) {
      game.stopDemo();
      say("Demo stopped. Your game is back.");
    } else {
      game.startDemo({
        black: els.demoBlack.value,
        white: els.demoWhite.value,
        speed: els.demoSpeed.value,
      });
      say(`Demo started. ${LEVELS[els.demoBlack.value].label} as Black against ${LEVELS[els.demoWhite.value].label} as White.`);
    }
  });

  for (const [el, key] of [
    [els.demoBlack, "black"],
    [els.demoWhite, "white"],
    [els.demoSpeed, "speed"],
  ]) {
    el.addEventListener("change", (event) => game.updateDemo({ [key]: event.target.value }));
  }

  els.clearData.addEventListener("click", () => {
    clearAll();
    game.resetStoredData();
    syncControls();
    say("Saved game and record cleared.");
  });
}

/** Push game state back onto the controls — needed on load, and after the
 *  clear control resets settings to their defaults. */
function syncControls() {
  els.difficulty.value = game.settings.difficulty;
  els.playAs.value = String(game.settings.playAs);
  els.showLegal.checked = game.settings.showLegalMoves;
  els.animations.checked = game.settings.animations;
  els.demoBlack.value = game.demo.black;
  els.demoWhite.value = game.demo.white;
  els.demoSpeed.value = game.demo.speed;
}

// --- start -------------------------------------------------------------------

buildBoard();
wire();
syncControls();

game.subscribe(() => {
  render();
  announce();
});

render();
announcedPlies = game.moves.length; // do not replay a restored game's history

if (game.resumed) {
  say("Your saved game has been restored.");
}

// If the person plays White, the computer opens.
game.scheduleAiTurn();

// Speed labels are defined in game.js; assert the markup agrees rather than
// letting a renamed option silently fall back to the default speed.
for (const option of els.demoSpeed.options) {
  if (!SPEEDS[option.value]) {
    console.warn(`Unknown demo speed "${option.value}" in the markup.`);
  }
}
