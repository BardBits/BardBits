import { StrictMode } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// The prerenderer stamps the theme onto the root node, so the bundle is
// identical for every page and only the markup differs.
const root = document.getElementById("root");

const tree = (
  <StrictMode>
    <App themeId={root.dataset.theme} />
  </StrictMode>
);

// Built pages arrive with markup to hydrate; the dev server serves an empty
// root, so mount fresh there instead of warning about a hydration mismatch.
if (root.firstChild) {
  hydrateRoot(root, tree);
} else {
  createRoot(root).render(tree);
}
