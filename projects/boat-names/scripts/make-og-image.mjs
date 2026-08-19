import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1200;
const H = 630;

const BG_TOP = "#edf2f7";
const BG_BOT = "#d6e2ed";
const WOOD = "#5a3420";
const GOLD = "#c8a23c";
const INK = "#1a2a35";
const SUB = "#2c4a5e";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${BG_TOP}"/>
      <stop offset="100%" stop-color="${BG_BOT}"/>
    </linearGradient>
    <filter id="shadow" x="-15%" y="-15%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- quarterboard, centred in the right two-thirds -->
  <g transform="translate(745, 190)" filter="url(#shadow)">
    <!-- board -->
    <rect x="-210" y="0" width="420" height="110" rx="4" fill="${WOOD}"/>
    <!-- gold pinstripe -->
    <rect x="-202" y="8" width="404" height="94" rx="2" fill="none" stroke="${GOLD}" stroke-width="1"/>
    <!-- left scroll -->
    <path d="M-210 12 Q-226 8 -232 20 Q-236 30 -230 36 Q-224 40 -218 36 L-212 25 Z" fill="${WOOD}"/>
    <path d="M-210 98 Q-226 102 -232 90 Q-236 80 -230 74 Q-224 70 -218 74 L-212 85 Z" fill="${WOOD}"/>
    <!-- right scroll -->
    <path d="M210 12 Q226 8 232 20 Q236 30 230 36 Q224 40 218 36 L212 25 Z" fill="${WOOD}"/>
    <path d="M210 98 Q226 102 232 90 Q236 80 230 74 Q224 70 218 74 L212 85 Z" fill="${WOOD}"/>
    <!-- gold name -->
    <text x="0" y="68" text-anchor="middle" font-family="Georgia, serif" font-size="48"
          font-weight="bold" letter-spacing="3" fill="${GOLD}">Silver Wind</text>
  </g>

  <!-- wordmark -->
  <text x="80" y="260" font-family="Georgia, serif" font-size="62" fill="${INK}">Boat Name</text>
  <text x="80" y="334" font-family="Georgia, serif" font-size="62" fill="${INK}">Generator</text>
  <text x="80" y="394" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    Funny, nautical and classic names
  </text>
  <text x="80" y="432" font-family="Georgia, serif" font-size="27" font-style="italic" fill="${SUB}">
    on a carved quarterboard.
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
