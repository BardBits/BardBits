// Renders public/og-preview.png, the 1200x630 card shown when a link to the
// site is pasted into Slack, iMessage, Discord, X and so on.
//
// Run with `npm run og`. The output is committed to public/ rather than built
// every time, because it only changes when the artwork does.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;

// Same palette as the cottage theme so the card and the page look related.
const BG_TOP = "#faf3e2";
const BG_BOT = "#f0e4c5";
const WOOD = "#c9a06a";
const CARVE = "#2a1a08";
const INK = "#3a2e14";
const SUB = "#5a4a2a";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOT}"/>
    </linearGradient>
    <linearGradient id="iron" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5a5a5a"/>
      <stop offset="100%" stop-color="#2a2a2a"/>
    </linearGradient>
    <filter id="shadow" x="-15%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- hanging sign, centred in the right two-thirds -->
  <g transform="translate(745, 96)">
    <rect x="-18" y="0" width="36" height="10" rx="3" fill="url(#iron)"/>
    <path d="M0 10 Q0 44 -74 70" fill="none" stroke="url(#iron)" stroke-width="6" stroke-linecap="round"/>
    <path d="M0 10 Q0 44 74 70" fill="none" stroke="url(#iron)" stroke-width="6" stroke-linecap="round"/>
    <g filter="url(#shadow)">
      <rect x="-190" y="78" width="380" height="230" rx="18" fill="${WOOD}"/>
      <rect x="-176" y="92" width="352" height="202" rx="12" fill="none" stroke="#4a3018" stroke-width="2" opacity="0.4"/>
    </g>
    <circle cx="-74" cy="86" r="6" fill="none" stroke="#4a4a4a" stroke-width="3"/>
    <circle cx="74" cy="86" r="6" fill="none" stroke="#4a4a4a" stroke-width="3"/>
    <text x="0" y="140" text-anchor="middle" font-family="Georgia, serif" font-size="19"
          letter-spacing="5" fill="${CARVE}" opacity="0.75">WELCOME TO</text>
    <text x="0" y="212" text-anchor="middle" font-family="Georgia, serif" font-size="60"
          font-weight="bold" letter-spacing="2" fill="${CARVE}">Mossy</text>
    <text x="0" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="60"
          font-weight="bold" letter-spacing="2" fill="${CARVE}">Hollow</text>
  </g>

  <!-- wordmark -->
  <text x="80" y="270" font-family="Georgia, serif" font-size="62" fill="${INK}">Cottage Name</text>
  <text x="80" y="344" font-family="Georgia, serif" font-size="62" fill="${INK}">Generator</text>
  <text x="80" y="404" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    Rustic names for cottages, cabins
  </text>
  <text x="80" y="442" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    and beach houses.
  </text>
  <text x="80" y="516" font-family="Georgia, serif" font-size="23" letter-spacing="2" fill="${SUB}" opacity="0.85">
    bardbits.ca
  </text>
</svg>
`;

const out = path.resolve("public", "og-preview.png");
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);

const { size } = await fs.stat(out);
console.log(`  wrote public/og-preview.png (${W}x${H}, ${(size / 1024).toFixed(1)} kB)`);
