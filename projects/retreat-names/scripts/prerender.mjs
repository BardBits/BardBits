// Turns the SSR bundle into one static HTML file per theme.
//
// Runs after `vite build` (client) and `vite build --ssr` (server). Reads the
// built dist/index.html as a template, renders each route into it, and writes
// dist/<slug>/index.html. The result is plain files for S3 — no server.

import fs from "node:fs/promises";
import path from "node:path";
import { render, ROUTES, BASE, ORIGIN, pathFor, urlFor } from "../dist-ssr/entry-server.js";

const dist = path.resolve("dist");

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function jsonLd(route) {
  return JSON.stringify({
    "@context": "https://schema.org",
    // Two entities on one page, so @graph rather than two script tags.
    "@graph": [
      {
        "@type": "WebApplication",
        name: route.title,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Any",
        url: urlFor(route.slug),
        description: route.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        // Mirrors the visible breadcrumb in App.jsx — the two must agree, since
        // markup contradicting the page is a structured-data violation. Tells
        // crawlers these pages sit beneath the hub rather than loose at the
        // site root, and lets results render the hierarchy instead of a URL.
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "BardBits", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Name Generators", item: ORIGIN + BASE },
          { "@type": "ListItem", position: 3, name: route.tab, item: urlFor(route.slug) },
        ],
      },
    ],
  });
}

function fill(template, route, canonical) {
  return template
    .replaceAll("{{TITLE}}", escapeHtml(route.title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(route.description))
    .replaceAll("{{CANONICAL}}", escapeHtml(canonical))
    .replaceAll("{{ORIGIN}}", escapeHtml(ORIGIN))
    .replaceAll("{{BASE}}", escapeHtml(BASE))
    .replaceAll("{{JSONLD}}", jsonLd(route))
    .replaceAll("{{THEME}}", route.id)
    .replaceAll("{{APP_HTML}}", render(route.id));
}

const template = await fs.readFile(path.join(dist, "index.html"), "utf8");

for (const route of ROUTES) {
  const dir = path.join(dist, route.slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), fill(template, route, urlFor(route.slug)));
  console.log(`  prerendered ${pathFor(route.slug)}`);
}

// The mount root belongs to the generators hub, not to this app, so drop the
// built index.html rather than filling it. Leaving it would ship a template
// with unsubstituted {{TOKENS}}, and serving a fourth copy of a theme here
// would compete with that theme's own URL as duplicate content.
await fs.rm(path.join(dist, "index.html"));
console.log(`  removed ${BASE}index.html (owned by name-generators-hub)`);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ROUTES.map((r) => `  <url><loc>${escapeHtml(urlFor(r.slug))}</loc></url>`),
  "</urlset>",
  "",
].join("\n");
await fs.writeFile(path.join(dist, "sitemap.xml"), sitemap);
console.log("  wrote sitemap.xml");
