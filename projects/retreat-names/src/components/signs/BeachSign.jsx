import { splitName, fitFontSize, baselines } from "../../nameLayout.js";

export default function BeachSign({ name, welcomeText }) {
  const signW = 360, signH = 190;
  const ropeH = 58;
  const totalW = signW + 44, totalH = ropeH + signH + 8;
  const cx = totalW / 2;
  const signLeft = (totalW - signW) / 2;
  const signTop = ropeH;
  const holeLX = cx - 68, holeRX = cx + 68;
  const holeY = signTop + 12;

  const lines = splitName(name);
  const fontSize = fitFontSize(lines, signW - 56, { max: 40, min: 22, tracking: 2 });
  const ys = baselines(lines, fontSize, signTop + 50, signTop + signH - 40);

  return (
    <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} role="img" style={{ maxWidth: "100%", height: "auto" }}>
      <title>{`Painted beach house sign reading "${name}"`}</title>
      <defs>
        {/* Sun-bleached shingle — pale enough for the painted lettering to hold */}
        <filter id="bch-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.18" numOctaves="5" seed={77} result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gn" />
          <feComponentTransfer in="gn" result="sn">
            <feFuncR type="linear" slope="0.35" intercept="0.65" />
            <feFuncG type="linear" slope="0.35" intercept="0.65" />
            <feFuncB type="linear" slope="0.35" intercept="0.65" />
          </feComponentTransfer>
          <feFlood floodColor="#dcc9a4" result="base" />
          <feBlend in="base" in2="sn" mode="multiply" result="wood" />
          <feComposite in="wood" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Painted lettering with a sun-bleached rim just outside the glyph */}
        <filter id="bch-paint" x="-10%" y="-10%" width="120%" height="120%">
          <feOffset dx="1" dy="1" in="SourceAlpha" result="pso" />
          <feComposite in="pso" in2="SourceAlpha" operator="out" result="prim" />
          <feFlood floodColor="#fdf8ec" floodOpacity="0.55" result="psc" />
          <feComposite in="psc" in2="prim" operator="in" result="ps" />
          <feFlood floodColor="#0d3542" result="pf" />
          <feComposite in="pf" in2="SourceAlpha" operator="in" result="pt" />
          <feMerge><feMergeNode in="ps" /><feMergeNode in="pt" /></feMerge>
        </filter>
        <filter id="bch-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* === ROPE — from hook down through holes === */}
      {/* Wall hook */}
      <circle cx={cx} cy="6" r="5" fill="none" stroke="#8a8a8a" strokeWidth="2.5" />
      <circle cx={cx} cy="6" r="5" fill="none" stroke="#5a5a5a" strokeWidth="1" />

      {/* Left rope: hook -> drape down -> into hole */}
      <path d={`M${cx - 3} 10 Q${cx - 28} 26 ${holeLX} ${holeY}`}
        fill="none" stroke="#c4a46a" strokeWidth="4.5" strokeLinecap="round" />
      <path d={`M${cx - 3} 10 Q${cx - 28} 26 ${holeLX} ${holeY}`}
        fill="none" stroke="#a8874a" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      {/* Right rope */}
      <path d={`M${cx + 3} 10 Q${cx + 28} 26 ${holeRX} ${holeY}`}
        fill="none" stroke="#c4a46a" strokeWidth="4.5" strokeLinecap="round" />
      <path d={`M${cx + 3} 10 Q${cx + 28} 26 ${holeRX} ${holeY}`}
        fill="none" stroke="#a8874a" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

      {/* Rope twist texture — small diagonal marks */}
      {[holeLX, holeRX].map((targetX, side) => {
        const dir = side === 0 ? -1 : 1;
        return Array.from({ length: 5 }, (_, i) => {
          const t = (i + 1) / 6;
          const mx = cx + dir * 3 + (targetX - cx - dir * 3) * t;
          const my = 10 + (holeY - 10) * t;
          return <line key={`${side}-${i}`} x1={mx - 2} y1={my - 1.5} x2={mx + 2} y2={my + 1.5}
            stroke="#8a6d38" strokeWidth="1" opacity="0.45" />;
        });
      })}

      {/* === SIGN BODY === */}
      <g filter="url(#bch-shadow)">
        <rect x={signLeft} y={signTop} width={signW} height={signH} rx="7" filter="url(#bch-grain)" />
        {/* Plank lines */}
        {[0.33, 0.66].map((pct, i) => (
          <line key={i} x1={signLeft + 8} y1={signTop + signH * pct} x2={signLeft + signW - 8} y2={signTop + signH * pct}
            stroke="#9a8a6a" strokeWidth="0.5" opacity="0.35" />
        ))}
      </g>

      {/* Rope holes */}
      <circle cx={holeLX} cy={holeY} r="5" fill="#5a4a30" stroke="#9a8a6a" strokeWidth="1" />
      <circle cx={holeRX} cy={holeY} r="5" fill="#5a4a30" stroke="#9a8a6a" strokeWidth="1" />

      {/* Decorative wave */}
      <path d={`M${cx - 60} ${signTop + signH - 26} Q${cx - 40} ${signTop + signH - 34} ${cx - 20} ${signTop + signH - 26} Q${cx} ${signTop + signH - 18} ${cx + 20} ${signTop + signH - 26} Q${cx + 40} ${signTop + signH - 34} ${cx + 60} ${signTop + signH - 26}`}
        fill="none" stroke="#0d3542" strokeWidth="1.8" opacity="0.35" strokeLinecap="round" />

      {/* Painted text */}
      <text x={cx} y={signTop + 40} textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" letterSpacing="3.5" filter="url(#bch-paint)" opacity="0.85" style={{ textTransform: "uppercase" }}>
        {welcomeText}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={cx} y={ys[i]} textAnchor="middle" fontFamily="Georgia,serif" fontSize={fontSize} fontWeight="bold" letterSpacing="2" filter="url(#bch-paint)">
          {line}
        </text>
      ))}
    </svg>
  );
}
