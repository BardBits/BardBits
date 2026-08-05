import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

export { ROUTES, BASE, ORIGIN, pathFor, urlFor } from "./routes.js";

/** Render one theme to static HTML for the build-time prerender. */
export function render(themeId) {
  return renderToString(
    <StrictMode>
      <App themeId={themeId} />
    </StrictMode>
  );
}
