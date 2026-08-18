export const pageBgs = {
  boat: "linear-gradient(170deg, #f0f4f8 0%, #dce6ee 45%, #f0f4f8 100%)",
  funny: "linear-gradient(170deg, #f5f8f0 0%, #e6edda 45%, #f5f8f0 100%)",
  nautical: "linear-gradient(170deg, #edf2f7 0%, #d6e2ed 45%, #edf2f7 100%)",
  sailboat: "linear-gradient(170deg, #f0f5fa 0%, #d9e6f2 45%, #f0f5fa 100%)",
  pontoon: "linear-gradient(170deg, #f7f5f0 0%, #ede7d8 45%, #f7f5f0 100%)",
  fishing: "linear-gradient(170deg, #f0f6f4 0%, #d8ebe4 45%, #f0f6f4 100%)",
};

export const palettes = {
  boat:     { text: "#1a2a35", accent: "#1a5276", onAccent: "#f5f9fc", sub: "#2c4a5e", muted: "#4a6a7a", border: "#a3bfcc", chipBg: "#f5f9fc" },
  funny:    { text: "#2a3318", accent: "#5a7a2e", onAccent: "#f8faf3", sub: "#3d4e28", muted: "#5a6e48", border: "#b0c498", chipBg: "#f8faf3" },
  nautical: { text: "#162638", accent: "#1a4a6e", onAccent: "#f2f7fb", sub: "#253d52", muted: "#3e5e78", border: "#94b4cc", chipBg: "#f2f7fb" },
  sailboat: { text: "#162030", accent: "#1e5a8a", onAccent: "#f4f8fc", sub: "#283e55", muted: "#3d5e7e", border: "#8eb4d4", chipBg: "#f4f8fc" },
  pontoon:  { text: "#2e2818", accent: "#8a6e2e", onAccent: "#fdf9f0", sub: "#4a3e22", muted: "#6e5e3e", border: "#c4b48a", chipBg: "#fdf9f0" },
  fishing:  { text: "#1a3028", accent: "#2a6e52", onAccent: "#f2faf6", sub: "#2a4a3e", muted: "#3e6858", border: "#8ec4aa", chipBg: "#f2faf6" },
};

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
