export const pageBgs = {
  cottage: "linear-gradient(170deg, #fbf5e7 0%, #f2e7cb 45%, #f8efdc 100%)",
  cabin: "linear-gradient(170deg, #f6f1e9 0%, #eadfcd 45%, #f6f1e9 100%)",
  beach: "linear-gradient(170deg, #f0f9fb 0%, #ddf1f4 45%, #f0f9fb 100%)",
};

export const palettes = {
  cottage: { text: "#3a2e14", accent: "#8b6914", onAccent: "#fffaf0", sub: "#5a4a2a", muted: "#7a6540", border: "#c9b98c", chipBg: "#fffaf0" },
  cabin: { text: "#2e2414", accent: "#8b5e3c", onAccent: "#fffaf2", sub: "#4a3a26", muted: "#6b5940", border: "#c4b39c", chipBg: "#fffaf2" },
  beach: { text: "#123138", accent: "#1f7186", onAccent: "#f2fbfb", sub: "#254951", muted: "#4a6b72", border: "#a8ccd2", chipBg: "#f7fcfd" },
};

/** Palette -> CSS custom properties consumed by index.css. */
export function cssVars(c) {
  return {
    "--text": c.text,
    "--accent": c.accent,
    "--accent-soft": c.accent + "22",
    "--on-accent": c.onAccent,
    "--sub": c.sub,
    "--muted": c.muted,
    "--border": c.border,
    "--chip-bg": c.chipBg,
  };
}
