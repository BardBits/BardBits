import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

export { ROUTES, TAB_ROUTES, BASE, ORIGIN, pathFor, urlFor } from "./routes.js";

export function render(themeId) {
  return renderToString(
    <StrictMode>
      <App themeId={themeId} />
    </StrictMode>
  );
}
