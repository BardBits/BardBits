// Renders projects/site-root/og-preview.png, the 1200x630 card shown when
// https://bardbits.ca/ itself is pasted into Slack, iMessage, Discord, X and so
// on. The per-project cards live in their own projects; this is the domain's.
//
// Run by hand with `npm run og:root`. The output is committed rather than built
// on every deploy, because it only changes when the artwork does — and because
// site-root has no build step at all (workspace: null in projects.json), so
// there is nowhere for a build-time step to live.
//
// Deliberately a wordmark and nothing else. The landing page carries no tagline
// on purpose, and a card is not a loophole for inventing one — see NOTES.md.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;

// The landing page's own gradient and ink, so the card and the page it
// previews are recognisably the same site.
const BG_TOP = "#faf3e2";
const BG_MID = "#f0e4c5";
const BG_BOT = "#f6ecd6";
const INK = "#3a2e14";
const SUB = "#7a6540";
const RULE = "#c9b98c";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="45%" stop-color="${BG_MID}"/>
      <stop offset="100%" stop-color="${BG_BOT}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- A thin inset frame, echoing the bordered cards on the site itself. -->
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" rx="20"
        fill="none" stroke="${RULE}" stroke-width="2" opacity="0.85"/>

  <!-- Wordmark only. No tagline, by design. -->
  <text x="${W / 2}" y="330" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="128" letter-spacing="3" fill="${INK}">BardBits</text>

  <line x1="${W / 2 - 90}" y1="386" x2="${W / 2 + 90}" y2="386"
        stroke="${RULE}" stroke-width="2"/>

  <text x="${W / 2}" y="446" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="30" letter-spacing="4" fill="${SUB}">bardbits.ca</text>
</svg>
`;

const out = path.resolve("projects", "site-root", "og-preview.png");
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);

const { size } = await fs.stat(out);
console.log(`  wrote projects/site-root/og-preview.png (${W}x${H}, ${(size / 1024).toFixed(1)} kB)`);
