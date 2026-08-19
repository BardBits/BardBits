export function splitName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function fitFontSize(lines, maxWidth, { max = 42, min = 22, tracking = 2, ratio = 0.63 } = {}) {
  const limit = maxWidth - 3;
  for (let fs = max; fs > min; fs--) {
    let widest = 0;
    for (const line of lines) {
      const w = line.length * (ratio * fs + tracking);
      if (w > widest) widest = w;
    }
    if (widest <= limit) return fs;
  }
  return min;
}

export function baselines(lines, fontSize, top, bottom) {
  const lineH = fontSize * 1.06;
  const start = (top + bottom - lines.length * lineH) / 2 + fontSize * 0.76;
  return lines.map((_, i) => start + i * lineH);
}
