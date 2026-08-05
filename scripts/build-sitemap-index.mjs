// Writes the two sitemap files that live at the origin root.
//
// Crawlers only read /robots.txt and the sitemap it names from the origin root,
// so the root has to describe the whole site. But each project builds and
// deploys on its own schedule, so the root cannot hold one flat list of every
// URL without being regenerated whenever any project changes.
//
// A sitemap index solves that: the root points at each project's own sitemap,
// and a project updating its URLs never touches a file it does not own.
//
//   /sitemap.xml   index -> /pages.xml and each project's sitemap
//   /pages.xml     the standalone pages that have no build step of their own
//
// Both are generated into projects/site-root/ and are gitignored; the deploy
// script picks up any .xml sitting at a project's source root.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "projects.json"), "utf8"));
const { origin, projects } = manifest;

const out = projects.find((p) => p.prefix === "");
if (!out) throw new Error("No project mounted at the bucket root to hold the sitemap.");
const outDir = path.join(root, out.source);

const escapeXml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const doc = (tag, entries) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</${tag}>`,
    "",
  ].join("\n");

// Pages with no build of their own — the landing page and each project hub.
const pages = projects.flatMap((p) => p.pages ?? []);
await fs.writeFile(
  path.join(outDir, "pages.xml"),
  doc(
    "urlset",
    pages.map((p) => `  <url><loc>${escapeXml(origin + p)}</loc></url>`),
  ),
);
console.log(`  wrote pages.xml (${pages.length} url${pages.length === 1 ? "" : "s"})`);

// Only list a project's sitemap once it actually exists, so a fresh clone that
// has not built everything yet does not publish an index pointing at a 404.
const sitemaps = [`${origin}/pages.xml`];
for (const p of projects.filter((p) => p.sitemap)) {
  const built = path.join(root, p.source, "sitemap.xml");
  try {
    await fs.access(built);
    sitemaps.push(`${origin}${p.prefix ? "/" + p.prefix : ""}/sitemap.xml`);
  } catch {
    console.log(`  SKIPPED ${p.name} — no sitemap.xml built yet`);
  }
}

await fs.writeFile(
  path.join(outDir, "sitemap.xml"),
  doc(
    "sitemapindex",
    sitemaps.map((s) => `  <sitemap><loc>${escapeXml(s)}</loc></sitemap>`),
  ),
);
console.log(`  wrote sitemap.xml (index of ${sitemaps.length})`);
