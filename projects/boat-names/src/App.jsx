import { useState, useCallback, useMemo, useEffect } from "react";
import { CONFIGS } from "./configs/index.js";
import { SignComponents } from "./components/signs/index.js";
import { pageBgs, palettes, cssVars } from "./theme.js";
import { generateName, featuredName } from "./engine.js";
import { TAB_ROUTES, BASE, pathFor } from "./routes.js";
import { loadHistory, saveHistory, HISTORY_LIMIT } from "./history.js";

export default function App({ themeId }) {
  const config = CONFIGS[themeId];
  const c = palettes[themeId];
  const [result, setResult] = useState(() => featuredName(config));
  const [history, setHistory] = useState(null);
  const [tick, setTick] = useState(0);

  const gen = useCallback(() => {
    setHistory((prev) => [result, ...(prev ?? [])].slice(0, HISTORY_LIMIT));
    setResult(generateName(config));
    setTick((t) => t + 1);
  }, [config, result]);

  const supersedeBeforeLeaving = useCallback(
    (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      saveHistory(themeId, [result, ...(history ?? [])].slice(0, HISTORY_LIMIT));
    },
    [themeId, result, history]
  );

  useEffect(() => {
    setResult(generateName(config));
    setTick((t) => t + 1);
  }, [config]);

  useEffect(() => {
    setHistory(loadHistory(themeId));
  }, [themeId]);

  useEffect(() => {
    if (history === null) return;
    saveHistory(themeId, history);
  }, [themeId, history]);

  const combos = useMemo(() => {
    let t = 0;
    for (const p of config.patterns) {
      let n = 1;
      for (const tok of p.template) {
        const m = tok.match(/^\{(.+)\}$/);
        if (m && config.wordLists[m[1]]) {
          const list = config.wordLists[m[1]];
          if (Array.isArray(list)) {
            n *= list.length;
          } else if (list._type === "pairMap") {
            const keys = Object.keys(list).filter(k => k !== "_type");
            const avg = keys.reduce((s, k) => s + list[k].length, 0) / (keys.length || 1);
            n *= Math.round(avg);
          }
        }
      }
      t += n;
    }
    return t.toLocaleString("en-US");
  }, [config]);

  const SignComponent = SignComponents[themeId];
  const isGeneric = themeId === "boat";

  return (
    <div className="app" style={{ ...cssVars(c), background: pageBgs[themeId] }}>
      <div className="shell">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">BardBits</a>
          <span className="crumb-sep" aria-hidden="true">&rsaquo;</span>
          <a href="/name-generators/">Name Generators</a>
          <span className="crumb-sep" aria-hidden="true">&rsaquo;</span>
          {isGeneric ? (
            <span aria-current="page">Boat Names</span>
          ) : (
            <>
              <a href={pathFor("boat")} onClick={supersedeBeforeLeaving}>Boat Names</a>
              <span className="crumb-sep" aria-hidden="true">&rsaquo;</span>
              <span aria-current="page">{config.seo.tab}</span>
            </>
          )}
        </nav>

        <nav className="tabs" aria-label="Boat type">
          {TAB_ROUTES.map((route) => (
            <a
              key={route.id}
              className="tab"
              href={pathFor(route.slug)}
              aria-current={themeId === route.id ? "page" : undefined}
              onClick={supersedeBeforeLeaving}
            >
              {route.tab}
            </a>
          ))}
        </nav>

        <h1 className="title">{config.title}</h1>
        <p className="tagline">{config.tagline}</p>

        <div className="sign-stage">
          <div key={tick} className="sign-pop">
            <SignComponent name={result.name} />
          </div>
        </div>

        <div className="controls">
          <p className="reject">{config.rejectLabel}</p>
          <button className="btn" onClick={gen}>{config.retryLabel}</button>
        </div>

        <p className="description">{config.description}</p>

        <div className="stat">
          <span className="stat-label">Possible Names</span>
          <div className="stat-value">{combos}</div>
        </div>

        {history !== null && history.length > 0 && (
          <div className="history">
            <h2 className="history-title">Previously Generated</h2>
            <div className="chips">
              {history.map((h, i) => (
                <span key={i} className="chip">{h.name}</span>
              ))}
            </div>
          </div>
        )}

        <footer className="footer">
          <a href="/name-generators/">&larr; All name generators</a>
          <span aria-hidden="true"> &middot; </span>
          <a href="/privacy/">Privacy</a>
        </footer>
      </div>
    </div>
  );
}
