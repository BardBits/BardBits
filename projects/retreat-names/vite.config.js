import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mount point under the portfolio domain. Override with SITE_BASE at build time.
// The three themes are peers under the generators hub: /name-generators/cottage/
// etc. The hub page itself at /name-generators/ belongs to name-generators-hub,
// not to this app — see scripts/deploy-project.ps1 and its -ExcludeRoot flag.
const BASE = process.env.SITE_BASE || "/name-generators/";

const SLUGS = ["cottage", "cabin", "beach"];

/**
 * index.html carries {{TOKENS}} that the build-time prerenderer fills in
 * (see scripts/prerender.mjs). The dev server never runs that step, so this
 * plugin fills them with sensible defaults and routes /<base>/<slug>/ to the
 * template — keeping `npm run dev` behaving like the built site.
 */
function devHtmlTokens() {
  let base = BASE;
  return {
    name: "dev-html-tokens",
    apply: "serve",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const slug = slugFromUrl(req.url ?? "", base);
        if (SLUGS.includes(slug)) req.url = base;
        next();
      });
    },
    transformIndexHtml: {
      // Must run AFTER Vite's own rewriting. Vite prefixes any root-relative
      // href/src in index.html with the base, so substituting {{BASE}} first
      // yields a doubled path like /name-generators/name-generators/.
      order: "post",
      handler(html, ctx) {
        const slug = slugFromUrl(ctx.originalUrl ?? "", base);
        const theme = SLUGS.includes(slug) ? slug : "cottage";
        return html
          .replaceAll("{{THEME}}", theme)
          .replaceAll("{{APP_HTML}}", "")
          .replaceAll("{{TITLE}}", "Cottage Name Generator (dev)")
          .replaceAll("{{DESCRIPTION}}", "")
          .replaceAll("{{CANONICAL}}", "")
          .replaceAll("{{ORIGIN}}", "")
          .replaceAll("{{JSONLD}}", "{}")
          .replaceAll("{{BASE}}", base);
      },
    },
  };
}

function slugFromUrl(url, base) {
  const pathname = url.split("?")[0];
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
  return rest.split("/")[0];
}

export default defineConfig({
  plugins: [react(), devHtmlTokens()],
  base: BASE,
});
