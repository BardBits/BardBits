import { splitName, fitFontSize, baselines } from "../../nameLayout.js";

export default function QuarterboardSign({ name }) {
  const boardW = 400, boardH = 100;
  const scrollW = 28;
  const totalW = boardW + scrollW * 2 + 20;
  const totalH = boardH + 40;
  const cx = totalW / 2;
  const boardLeft = (totalW - boardW) / 2;
  const boardTop = 20;

  const lines = splitName(name);
  const fontSize = fitFontSize(lines, boardW - 40, { max: 38, min: 18, tracking: 3 });
  const ys = baselines(lines, fontSize, boardTop + 8, boardTop + boardH - 8);

  return (
    <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} role="img" style={{ maxWidth: "100%", height: "auto" }}>
      <title>{`Carved quarterboard reading "${name}"`}</title>
      <defs>
        {/* Varnished mahogany — rich, warm, dark enough for gold lettering */}
        <filter id="qb-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.2" numOctaves="6" seed={31} result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gn" />
          <feComponentTransfer in="gn" result="sn">
            <feFuncR type="linear" slope="0.3" intercept="0.7" />
            <feFuncG type="linear" slope="0.3" intercept="0.7" />
            <feFuncB type="linear" slope="0.3" intercept="0.7" />
          </feComponentTransfer>
          <feFlood floodColor="#5a3420" result="base" />
          <feBlend in="base" in2="sn" mode="multiply" result="wood" />
          <feComposite in="wood" in2="SourceAlpha" operator="in" />
        </filter>
        {/* Gold leaf lettering — bright face with a subtle bevel */}
        <filter id="qb-gold" x="-5%" y="-10%" width="110%" height="120%">
          <feFlood floodColor="#c8a23c" result="gf" />
          <feComposite in="gf" in2="SourceAlpha" operator="in" result="gt" />
          <feOffset dx="0.8" dy="0.8" in="SourceAlpha" result="loff" />
          <feComposite in="loff" in2="SourceAlpha" operator="out" result="lrim" />
          <feFlood floodColor="#f0dca0" floodOpacity="0.6" result="lc" />
          <feComposite in="lc" in2="lrim" operator="in" result="light" />
          <feOffset dx="-0.5" dy="-0.5" in="SourceAlpha" result="doff" />
          <feComposite in="doff" in2="SourceAlpha" operator="out" result="drim" />
          <feFlood floodColor="#6a4a10" floodOpacity="0.5" result="dc" />
          <feComposite in="dc" in2="drim" operator="in" result="dark" />
          <feMerge><feMergeNode in="light" /><feMergeNode in="dark" /><feMergeNode in="gt" /></feMerge>
        </filter>
        <filter id="qb-shadow" x="-5%" y="-5%" width="115%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000" floodOpacity="0.3" />
        </filter>
        {/* Varnish sheen — a thin bright highlight along the top edge */}
        <linearGradient id="qb-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="30%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* === BOARD BODY with scrolled ends === */}
      <g filter="url(#qb-shadow)">
        {/* Main board */}
        <rect x={boardLeft} y={boardTop} width={boardW} height={boardH} rx="4" filter="url(#qb-grain)" />

        {/* Left scroll — a curved wing tapering to a spiral */}
        <path d={`
          M${boardLeft} ${boardTop + 10}
          Q${boardLeft - 12} ${boardTop + 6} ${boardLeft - scrollW + 4} ${boardTop + 14}
          Q${boardLeft - scrollW - 4} ${boardTop + 20} ${boardLeft - scrollW + 2} ${boardTop + 28}
          Q${boardLeft - scrollW + 8} ${boardTop + 34} ${boardLeft - scrollW + 14} ${boardTop + 30}
          L${boardLeft - 2} ${boardTop + boardH * 0.45}
          L${boardLeft} ${boardTop + 10}
          Z
        `} filter="url(#qb-grain)" />
        <path d={`
          M${boardLeft} ${boardTop + boardH - 10}
          Q${boardLeft - 12} ${boardTop + boardH - 6} ${boardLeft - scrollW + 4} ${boardTop + boardH - 14}
          Q${boardLeft - scrollW - 4} ${boardTop + boardH - 20} ${boardLeft - scrollW + 2} ${boardTop + boardH - 28}
          Q${boardLeft - scrollW + 8} ${boardTop + boardH - 34} ${boardLeft - scrollW + 14} ${boardTop + boardH - 30}
          L${boardLeft - 2} ${boardTop + boardH * 0.55}
          L${boardLeft} ${boardTop + boardH - 10}
          Z
        `} filter="url(#qb-grain)" />

        {/* Right scroll */}
        <path d={`
          M${boardLeft + boardW} ${boardTop + 10}
          Q${boardLeft + boardW + 12} ${boardTop + 6} ${boardLeft + boardW + scrollW - 4} ${boardTop + 14}
          Q${boardLeft + boardW + scrollW + 4} ${boardTop + 20} ${boardLeft + boardW + scrollW - 2} ${boardTop + 28}
          Q${boardLeft + boardW + scrollW - 8} ${boardTop + 34} ${boardLeft + boardW + scrollW - 14} ${boardTop + 30}
          L${boardLeft + boardW + 2} ${boardTop + boardH * 0.45}
          L${boardLeft + boardW} ${boardTop + 10}
          Z
        `} filter="url(#qb-grain)" />
        <path d={`
          M${boardLeft + boardW} ${boardTop + boardH - 10}
          Q${boardLeft + boardW + 12} ${boardTop + boardH - 6} ${boardLeft + boardW + scrollW - 4} ${boardTop + boardH - 14}
          Q${boardLeft + boardW + scrollW + 4} ${boardTop + boardH - 20} ${boardLeft + boardW + scrollW - 2} ${boardTop + boardH - 28}
          Q${boardLeft + boardW + scrollW - 8} ${boardTop + boardH - 34} ${boardLeft + boardW + scrollW - 14} ${boardTop + boardH - 30}
          L${boardLeft + boardW + 2} ${boardTop + boardH * 0.55}
          L${boardLeft + boardW} ${boardTop + boardH - 10}
          Z
        `} filter="url(#qb-grain)" />

        {/* Varnish overlay */}
        <rect x={boardLeft} y={boardTop} width={boardW} height={boardH} rx="4" fill="url(#qb-sheen)" />
      </g>

      {/* Thin gold pinstripe border */}
      <rect x={boardLeft + 6} y={boardTop + 6} width={boardW - 12} height={boardH - 12} rx="2"
        fill="none" stroke="#c8a23c" strokeWidth="0.8" opacity="0.5" />

      {/* Gold leaf name */}
      {lines.map((line, i) => (
        <text key={i} x={cx} y={ys[i]} textAnchor="middle"
          fontFamily="Georgia,serif" fontSize={fontSize} fontWeight="bold"
          letterSpacing="3" filter="url(#qb-gold)">
          {line}
        </text>
      ))}
    </svg>
  );
}
