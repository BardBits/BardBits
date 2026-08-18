import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BASE = process.env.SITE_BASE || "/name-generators/boat/";

const SLUGS = ["funny", "nautical", "sailboat", "pontoon", "fishing"];

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
      order: "post",
      handler(html, ctx) {
        const slug = slugFromUrl(ctx.originalUrl ?? "", base);
        const theme = SLUGS.includes(slug) ? slug : "boat";
        return html
          .replaceAll("{{THEME}}", theme)
          .replaceAll("{{APP_HTML}}", "")
          .replaceAll("{{TITLE}}", "Boat Name Generator (dev)")
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
