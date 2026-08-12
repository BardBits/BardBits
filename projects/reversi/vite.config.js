import { defineConfig } from "vite";

// Mount point under the portfolio domain. Override with SITE_BASE at build time.
const BASE = process.env.SITE_BASE || "/reversi/";

export default defineConfig({
  base: BASE,

  // The AI worker must be emitted as a real, separately fingerprinted file.
  //
  // Two reasons, and both are easy to break by reaching for Vite's `?worker&inline`
  // import instead. The site's Content-Security-Policy sets no worker-src, so the
  // browser falls back through child-src to `default-src 'self'` — which allows a
  // same-origin file and rejects the `blob:` URL an inlined worker produces. And
  // the deploy script gives every non-HTML file a one-year immutable cache on the
  // assumption that its name is content-addressed, so an unfingerprinted worker
  // would strand returning players on an old copy of the engine.
  worker: {
    format: "es",
  },

  build: {
    // Fail the build rather than silently inlining a small asset as a data: URI,
    // which would put engine code inside the HTML and defeat the caching split.
    assetsInlineLimit: 0,
  },
});
