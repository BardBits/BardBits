import { splitName, fitFontSize, baselines } from "../../nameLayout.js";

export default function CabinSign({ name, welcomeText }) {
  const signW = 380, signH = 200;
  const postH = 100;
  const totalW = signW + 24, totalH = signH + postH;
  const cx = totalW / 2;
  const signLeft = (totalW - signW) / 2;

  const lines = splitName(name);
  const fontSize = fitFontSize(lines, signW - 90, { max: 42, min: 22, tracking: 3 });
  const ys = baselines(lines, fontSize, 72, signH - 26);

  return (
    <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} role="img" style={{ maxWidth: "100%", height: "auto" }}>
      <title>{`Branded cabin sign reading "${name}"`}</title>
      <defs>
        {/* Planed face — sanded light so the branded lettering reads clearly */}
        <filter id="cab-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.12" numOctaves="8" seed={17} result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gn" />
          <feComponentTransfer in="gn" result="sn">
            <feFuncR type="linear" slope="0.4" intercept="0.6" />
            <feFuncG type="linear" slope="0.4" intercept="0.6" />
            <feFuncB type="linear" slope="0.4" intercept="0.6" />
          </feComponentTransfer>
          <feFlood floodColor="#d2ab77" result="base" />
          <feBlend in="base" in2="sn" mode="multiply" result="wood" />
          <feComposite in="wood" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Bark edge — dark frame, but held back from pure black */}
        <filter id="cab-bark" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.04 0.08" numOctaves="4" seed={99} result="bark" />
          <feColorMatrix type="saturate" values="0" in="bark" result="gb" />
          <feComponentTransfer in="gb" result="sb">
            <feFuncR type="linear" slope="0.6" intercept="0.4" />
            <feFuncG type="linear" slope="0.6" intercept="0.4" />
            <feFuncB type="linear" slope="0.6" intercept="0.4" />
          </feComponentTransfer>
          <feFlood floodColor="#6b4d2e" result="bb" />
          <feBlend in="bb" in2="sb" mode="multiply" result="barkOut" />
          <feComposite in="barkOut" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Branding iron — tight edge, minimal halo */}
        <filter id="cab-burn" x="-5%" y="-5%" width="110%" height="110%">
          <feFlood floodColor="#241205" result="bf" />
          <feComposite in="bf" in2="SourceAlpha" operator="in" result="bt" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="glow" />
          <feFlood floodColor="#241205" floodOpacity="0.45" result="gc" />
          <feComposite in="gc" in2="glow" operator="in" result="bg" />
          <feMerge><feMergeNode in="bg" /><feMergeNode in="bt" /></feMerge>
        </filter>
        <filter id="cab-shadow" x="-10%" y="-5%" width="130%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* === POST — starts behind sign, extends below === */}
      <rect x={cx - 18} y={signH - 20} width="36" height={postH + 20} rx="3" filter="url(#cab-bark)" />
      <rect x={cx - 14} y={signH - 20} width="28" height={postH + 20} rx="2" fill="none" stroke="#2a1c0e" strokeWidth="0.5" opacity="0.35" />

      {/* === SIGN BODY === */}
      <g filter="url(#cab-shadow)">
        {/* Bark edge border */}
        <rect x={signLeft} y="5" width={signW} height={signH - 10} rx="5" filter="url(#cab-bark)" />
        {/* Inner planed surface */}
        <rect x={signLeft + 14} y="19" width={signW - 28} height={signH - 38} rx="2" filter="url(#cab-grain)" />
      </g>

      {/* Horizontal burned rule */}
      <line x1={signLeft + 55} y1="64" x2={signLeft + signW - 55} y2="64" stroke="#241205" strokeWidth="1.5" opacity="0.3" />

      {/* Nail heads — corners + post mount */}
      {[
        [signLeft + 22, 22],
        [signLeft + signW - 22, 22],
        [signLeft + 22, signH - 17],
        [signLeft + signW - 22, signH - 17],
        [cx, signH - 2],
      ].map(([nx, ny], i) => (
        <g key={i}>
          <circle cx={nx} cy={ny} r="4" fill="#2e2e2e" />
          <circle cx={nx} cy={ny} r="3" fill="#4a4a4a" />
          <circle cx={nx - 0.5} cy={ny - 0.5} r="1" fill="#6a6a6a" opacity="0.6" />
        </g>
      ))}

      {/* Burned text */}
      <text x={cx} y="52" textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" letterSpacing="4" filter="url(#cab-burn)" style={{ textTransform: "uppercase" }}>
        {welcomeText}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={cx} y={ys[i]} textAnchor="middle" fontFamily="Georgia,serif" fontSize={fontSize} fontWeight="bold" letterSpacing="3" filter="url(#cab-burn)">
          {line}
        </text>
      ))}
    </svg>
  );
}
