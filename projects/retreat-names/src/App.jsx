import { useState, useCallback, useMemo, useEffect } from "react";
import { CONFIGS } from "./configs/index.js";
import { SignComponents } from "./components/signs/index.js";
import { pageBgs, palettes, cssVars } from "./theme.js";
import { generateName, featuredName } from "./engine.js";
import { ROUTES, BASE, pathFor } from "./routes.js";
import { loadHistory, saveHistory, HISTORY_LIMIT } from "./history.js";

export default function App({ themeId }) {
  const config = CONFIGS[themeId];
  const c = palettes[themeId];
  // Seeded on first paint so the prerendered HTML and the hydrating client
  // agree; randomised in the effect below once hydration is complete.
  const [result, setResult] = useState(() => featuredName(config));
  // null means "not read from storage yet". Both the prerender and the first
  // client render see null, so hydration matches; the effect below fills it in.
  const [history, setHistory] = useState(null);
  // Bumped on every draw so the sign replays its entrance animation.
  const [tick, setTick] = useState(0);

  // A name joins the history only once it has been superseded, so the list
  // holds names you've moved past rather than the one currently on the sign.
  const gen = useCallback(() => {
    setHistory((prev) => [result, ...(prev ?? [])].slice(0, HISTORY_LIMIT));
    setResult(generateName(config));
    setTick((t) => t + 1);
  }, [config, result]);

  /**
   * Clicking through to another generator also supersedes the current name.
   * These tabs are real links, so the document unloads before React could
   * flush state — write straight to storage instead, which is synchronous.
   */
  const supersedeBeforeLeaving = useCallback(
    (targetId, event) => {
      if (targetId === themeId) return;
      // Modified clicks open a new tab; this document isn't going anywhere,
      // so recording now would put the visible name back in its own list.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      saveHistory(themeId, [result, ...(history ?? [])].slice(0, HISTORY_LIMIT));
    },
    [themeId, result, history]
  );

  // Give each visitor a fresh name, but only after hydration — doing it during
  // render would make the client disagree with the prerendered markup.
  useEffect(() => {
    setResult(generateName(config));
    setTick((t) => t + 1);
  }, [config]);

  useEffect(() => {
    setHistory(loadHistory(themeId));
  }, [themeId]);

  useEffect(() => {
    // Skip the pre-load render so an empty list can't overwrite what's stored.
    if (history === null) return;
    saveHistory(themeId, history);
  }, [themeId, history]);

  const combos = useMemo(() => {
    let t = 0;
    for (const p of config.patterns) {
      let n = 1;
      for (const tok of p.template) {
        const m = tok.match(/^\{(.+)\}$/);
        if (m && config.wordLists[m[1]]) n *= config.wordLists[m[1]].length;
      }
      t += n;
    }
    return t.toLocaleString("en-US");
  }, [config]);

  const SignComponent = SignComponents[themeId];

  return (
    <div className="app" style={{ ...cssVars(c), background: pageBgs[themeId] }}>
      <div className="shell">
        {/* These pages are where search traffic lands, so they carry the only
            route back up to the hub and the site root. Matched by BreadcrumbList
            JSON-LD in scripts/prerender.mjs. */}
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">BardBits</a>
          <span className="crumb-sep" aria-hidden="true">›</span>
          <a href={BASE}>Name Generators</a>
          <span className="crumb-sep" aria-hidden="true">›</span>
          <span aria-current="page">{config.seo.tab}</span>
        </nav>

        {/* Real links, not buttons: each theme is its own indexable page. */}
        <nav className="tabs" aria-label="Sign type">
          {ROUTES.map((route) => (
            <a
              key={route.id}
              className="tab"
              href={pathFor(route.slug)}
              aria-current={themeId === route.id ? "page" : undefined}
              onClick={(event) => supersedeBeforeLeaving(route.id, event)}
            >
              {route.tab}
            </a>
          ))}
        </nav>

        <h1 className="title">{config.title}</h1>
        <p className="tagline">{config.tagline}</p>

        <div className="sign-stage">
          <div key={tick} className="sign-pop">
            <SignComponent name={result.name} welcomeText={config.sign.welcomeText} />
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
      </div>
    </div>
  );
}
