import fs from "node:fs/promises";
import path from "node:path";
import { render, ROUTES, BASE, ORIGIN, pathFor, urlFor } from "../dist-ssr/entry-server.js";

const dist = path.resolve("dist");

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function jsonLd(route) {
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "BardBits", item: `${ORIGIN}/` },
    { "@type": "ListItem", position: 2, name: "Name Generators", item: `${ORIGIN}/name-generators/` },
  ];

  if (route.id === "boat") {
    breadcrumbItems.push({
      "@type": "ListItem", position: 3, name: "Boat Names", item: urlFor(route.slug),
    });
  } else {
    breadcrumbItems.push(
      { "@type": "ListItem", position: 3, name: "Boat Names", item: urlFor("boat") },
      { "@type": "ListItem", position: 4, name: route.tab, item: urlFor(route.slug) },
    );
  }

  return JSON.stringify({
    "@context": "https://schema.org",
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
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems,
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
  if (route.id === "boat") {
    // The generic page IS the index at the base — overwrite the template in place
    await fs.writeFile(path.join(dist, "index.html"), fill(template, route, urlFor(route.slug)));
    console.log(`  prerendered ${BASE} (generic)`);
  } else {
    const dir = path.join(dist, route.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), fill(template, route, urlFor(route.slug)));
    console.log(`  prerendered ${pathFor(route.slug)}`);
  }
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ROUTES.map((r) => `  <url><loc>${escapeHtml(urlFor(r.slug))}</loc></url>`),
  "</urlset>",
  "",
].join("\n");
await fs.writeFile(path.join(dist, "sitemap.xml"), sitemap);
console.log("  wrote sitemap.xml");
