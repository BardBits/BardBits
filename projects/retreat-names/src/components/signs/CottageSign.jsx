import { splitName, fitFontSize, baselines } from "../../nameLayout.js";

export default function CottageSign({ name, welcomeText }) {
  // All measurements in one coordinate system
  const signW = 340, signH = 176;
  const bracketH = 70, chainH = 45;
  const totalW = signW + 44, totalH = bracketH + chainH + signH + 12;
  const cx = totalW / 2;
  const signTop = bracketH + chainH;
  const signLeft = (totalW - signW) / 2;
  const ringLX = cx - 62, ringRX = cx + 62;
  const ringY = signTop + 8;

  const lines = splitName(name);
  const fontSize = fitFontSize(lines, signW - 60, { max: 42, min: 22, tracking: 2 });
  const ys = baselines(lines, fontSize, signTop + 58, signTop + signH - 22);

  return (
    <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} role="img" style={{ maxWidth: "100%", height: "auto" }}>
      <title>{`Carved cottage sign reading "${name}"`}</title>
      <defs>
        <linearGradient id="cot-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="50%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        {/* Light oak face — kept bright so the carved lettering stays legible */}
        <filter id="cot-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.15" numOctaves="6" seed={42} result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gn" />
          <feComponentTransfer in="gn" result="sn">
            <feFuncR type="linear" slope="0.4" intercept="0.6" />
            <feFuncG type="linear" slope="0.4" intercept="0.6" />
            <feFuncB type="linear" slope="0.4" intercept="0.6" />
          </feComponentTransfer>
          <feFlood floodColor="#c9a06a" result="base" />
          <feBlend in="base" in2="sn" mode="multiply" result="wood" />
          <feComposite in="wood" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Incised lettering: dark groove with rims that fall OUTSIDE the glyph,
            so the highlight never washes over the letter face. */}
        <filter id="cot-carve" x="-10%" y="-10%" width="120%" height="120%">
          <feOffset dx="1.2" dy="1.2" in="SourceAlpha" result="loff" />
          <feComposite in="loff" in2="SourceAlpha" operator="out" result="lrim" />
          <feFlood floodColor="#fff3d8" floodOpacity="0.7" result="lc" />
          <feComposite in="lc" in2="lrim" operator="in" result="light" />
          <feOffset dx="-1" dy="-1" in="SourceAlpha" result="doff" />
          <feComposite in="doff" in2="SourceAlpha" operator="out" result="drim" />
          <feFlood floodColor="#1a0f04" floodOpacity="0.4" result="dc" />
          <feComposite in="dc" in2="drim" operator="in" result="dark" />
          <feFlood floodColor="#2a1a08" result="tf" />
          <feComposite in="tf" in2="SourceAlpha" operator="in" result="body" />
          <feMerge><feMergeNode in="light" /><feMergeNode in="dark" /><feMergeNode in="body" /></feMerge>
        </filter>
        <filter id="cot-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* === BRACKET === */}
      {/* Wall plate */}
      <rect x={cx - 16} y="0" width="32" height="9" rx="2" fill="url(#cot-iron)" stroke="#222" strokeWidth="0.5" />
      <circle cx={cx - 8} cy="4.5" r="1.5" fill="#222" />
      <circle cx={cx + 8} cy="4.5" r="1.5" fill="#222" />
      {/* Arms curving out to chain points */}
      <path d={`M${cx} 9 Q${cx} 30 ${cx - 34} 45 Q${cx - 54} 55 ${ringLX} ${bracketH}`}
        fill="none" stroke="url(#cot-iron)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${cx} 9 Q${cx} 30 ${cx + 34} 45 Q${cx + 54} 55 ${ringRX} ${bracketH}`}
        fill="none" stroke="url(#cot-iron)" strokeWidth="5" strokeLinecap="round" />
      {/* Decorative curls at arm ends */}
      <path d={`M${ringLX} ${bracketH} Q${ringLX - 6} ${bracketH + 3} ${ringLX - 3} ${bracketH + 7}`}
        fill="none" stroke="url(#cot-iron)" strokeWidth="3" strokeLinecap="round" />
      <path d={`M${ringRX} ${bracketH} Q${ringRX + 6} ${bracketH + 3} ${ringRX + 3} ${bracketH + 7}`}
        fill="none" stroke="url(#cot-iron)" strokeWidth="3" strokeLinecap="round" />

      {/* === CHAINS — link by link from bracket tips down to sign rings === */}
      {[ringLX, ringRX].map((x, side) => {
        const startY = bracketH + 4;
        const linkCount = 4;
        const linkH = (ringY - startY) / linkCount;
        return Array.from({ length: linkCount }, (_, i) => (
          <ellipse key={`${side}-${i}`}
            cx={x + (i % 2 === 0 ? 0 : 1.5)}
            cy={startY + i * linkH + linkH / 2}
            rx="3" ry={linkH / 2 - 0.5}
            fill="none" stroke="#4a4a4a" strokeWidth="1.8" />
        ));
      })}

      {/* === SIGN BODY === */}
      <g filter="url(#cot-shadow)">
        <rect x={signLeft} y={signTop} width={signW} height={signH} rx="14" ry="14" filter="url(#cot-grain)" />
        {/* Inner bevel */}
        <rect x={signLeft + 11} y={signTop + 11} width={signW - 22} height={signH - 22} rx="8" fill="none" stroke="#4a3018" strokeWidth="1.8" opacity="0.45" />
        <rect x={signLeft + 13.5} y={signTop + 13.5} width={signW - 27} height={signH - 27} rx="7" fill="none" stroke="#f0dcb8" strokeWidth="0.8" opacity="0.35" />
      </g>

      {/* Ring holes where chains attach */}
      <circle cx={ringLX} cy={ringY} r="5" fill="none" stroke="#4a4a4a" strokeWidth="2" />
      <circle cx={ringRX} cy={ringY} r="5" fill="none" stroke="#4a4a4a" strokeWidth="2" />

      {/* Rule under the welcome line */}
      <line x1={cx - 46} y1={signTop + 51} x2={cx + 46} y2={signTop + 51} stroke="#3a2510" strokeWidth="1" opacity="0.35" />

      {/* Corner accents */}
      {[
        [signLeft + 23, signTop + 23],
        [signLeft + signW - 23, signTop + 23],
        [signLeft + 23, signTop + signH - 23],
        [signLeft + signW - 23, signTop + signH - 23],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="none" stroke="#3a2510" strokeWidth="1" opacity="0.4" />
      ))}

      {/* Welcome text */}
      <text x={cx} y={signTop + 39} textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" letterSpacing="3.5" filter="url(#cot-carve)" style={{ textTransform: "uppercase" }}>
        {welcomeText}
      </text>
      {/* Name — one word (or phrase) per line, stacked and centred */}
      {lines.map((line, i) => (
        <text key={i} x={cx} y={ys[i]} textAnchor="middle" fontFamily="Georgia,serif" fontSize={fontSize} fontWeight="bold" letterSpacing="2" filter="url(#cot-carve)">
          {line}
        </text>
      ))}
    </svg>
  );
}
