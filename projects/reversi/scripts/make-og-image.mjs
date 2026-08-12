// Renders public/og-preview.png, the 1200x630 card shown when a link to this
// page is pasted into Slack, iMessage, Discord, X and so on.
//
// Run with `npm run og`. The output is committed to public/ rather than built
// every time, because it only changes when the artwork does — and a build step
// that shells out to sharp on every CI run would cost far more than it saves.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;

// The page's own palette: warm site chrome, green board. See src/style.css.
const BG_TOP = "#faf3e2";
const BG_BOT = "#f0e4c5";
const INK = "#3a2e14";
const SUB = "#5a4a2a";
const FELT = "#2f6b46";
const FELT_LINE = "#1d4a2e";

// A position rather than the opening four discs: the card has to read as a
// game already under way, and four discs in the middle of an empty board reads
// as an empty board. Both colours hold a corner-ish cluster so neither looks
// like it is winning, which would be an odd thing for the card to imply.
const POSITION = [
  "........",
  "..w.....",
  "..bbbw..",
  ".wbwbb..",
  ".bwbwb..",
  "..wbb...",
  "....w...",
  "........",
];

const BOARD = 366; // outer size of the board, including its frame
const PAD = 12; // frame thickness
const GAP = 3; // grid line width
const CELL = (BOARD - PAD * 2 - GAP * 7) / 8;
const BOARD_X = 726;
const BOARD_Y = 132;

function board() {
  const parts = [
    `<rect x="${BOARD_X}" y="${BOARD_Y}" width="${BOARD}" height="${BOARD}" rx="14" fill="${FELT_LINE}" filter="url(#shadow)"/>`,
  ];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = BOARD_X + PAD + col * (CELL + GAP);
      const y = BOARD_Y + PAD + row * (CELL + GAP);
      parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${CELL.toFixed(2)}" height="${CELL.toFixed(2)}" rx="2" fill="${FELT}"/>`);

      const cell = POSITION[row][col];
      if (cell === "." ) continue;

      const cx = x + CELL / 2;
      const cy = y + CELL / 2;
      const r = CELL * 0.37;
      const fill = cell === "b" ? "url(#discBlack)" : "url(#discWhite)";
      parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${fill}"/>`);
    }
  }

  return parts.join("\n  ");
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOT}"/>
    </linearGradient>
    <radialGradient id="discBlack" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#4a453c"/>
      <stop offset="70%" stop-color="#23201a"/>
    </radialGradient>
    <radialGradient id="discWhite" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="75%" stop-color="#e7e0d0"/>
    </radialGradient>
    <filter id="shadow" x="-15%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  ${board()}

  <text x="80" y="288" font-family="Georgia, serif" font-size="86" fill="${INK}">Reversi</text>
  <text x="80" y="352" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    Play the classic disc-flipping game
  </text>
  <text x="80" y="390" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    against the computer.
  </text>
  <text x="80" y="470" font-family="Georgia, serif" font-size="23" letter-spacing="2" fill="${SUB}" opacity="0.85">
    bardbits.ca
  </text>
</svg>
`;

const out = path.resolve("public", "og-preview.png");
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);

const { size } = await fs.stat(out);
console.log(`  wrote public/og-preview.png (${W}x${H}, ${(size / 1024).toFixed(1)} kB)`);
