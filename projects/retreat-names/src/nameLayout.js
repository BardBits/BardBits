// Shared text-layout helpers for the sign SVGs.
//
// Everything here must be deterministic: these run during the build-time
// prerender (in Node, where there is no canvas to measure glyphs with) and
// again in the browser during hydration. If the two disagree, React reports a
// hydration mismatch — so sizing uses a fixed estimate rather than measuring.

/** Split a generated name into two centred lines ("The Fern Haven" -> ["The Fern", "Haven"]). */
export function splitName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/**
 * Largest font size at which every line still fits `maxWidth`.
 *
 * `ratio` is the estimated glyph width per em for Georgia bold. It is set
 * deliberately high: the widest names ("Honeysuckle") measure near 0.60, so
 * 0.63 plus the pad below keeps every combination inside the sign. Verified by
 * measuring every possible word pairing in a real browser — redo that check if
 * the font, tracking, or word lists change.
 */
export function fitFontSize(lines, maxWidth, { max = 42, min = 22, tracking = 2, ratio = 0.63 } = {}) {
  const limit = maxWidth - 3;
  for (let fs = max; fs > min; fs--) {
    let widest = 0;
    for (const line of lines) {
      // SVG letter-spacing adds `tracking` after every glyph.
      const w = line.length * (ratio * fs + tracking);
      if (w > widest) widest = w;
    }
    if (widest <= limit) return fs;
  }
  return min;
}

/** Baseline y for each line, vertically centred between `top` and `bottom`. */
export function baselines(lines, fontSize, top, bottom) {
  const lineH = fontSize * 1.06;
  const start = (top + bottom - lines.length * lineH) / 2 + fontSize * 0.76;
  return lines.map((_, i) => start + i * lineH);
}
