// Stages every project into one directory the way S3 holds them, then serves it.
//
// Each project builds in isolation and deploys to its own key prefix, so nothing
// in a single project's `dist/` can prove that the links *between* projects
// resolve. This assembles the same layout the bucket ends up with and serves it
// locally, which is where a broken /name-generators/ -> / link shows up.
//
// The staged directory is disposable build output, not source. See .gitignore.

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stage = path.join(root, ".site-preview");
// Honours PORT so several checkouts can preview at once; 4180 by default.
const PORT = Number(process.env.PORT) || 4180;

// projects.json is the same list the deploy script reads, in the same order, so
// what gets staged here is what ends up in the bucket. It is declared root-first
// because a project mounted deeper must never overwrite its parent's index.html.
const manifest = JSON.parse(await fs.readFile(path.join(root, "projects.json"), "utf8"));
const MOUNTS = manifest.projects.map((p) => ({ from: p.source, to: p.prefix }));

// Mirrors SecurityHeadersPolicy in infra/site.yaml. Kept in step deliberately:
// a Content-Security-Policy that breaks the site should break it here, where
// the console shows the violation, rather than after a CloudFront deploy.
// HSTS is omitted - sending it over plain http://localhost would pin the
// browser to https for localhost and break every other local project.
const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
    "base-uri 'self'; frame-ancestors 'none'; form-action 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

await fs.rm(stage, { recursive: true, force: true });

for (const mount of MOUNTS) {
  const from = path.join(root, mount.from);
  const to = path.join(stage, mount.to);
  try {
    await fs.cp(from, to, { recursive: true });
    console.log(`  staged ${mount.from} -> /${mount.to}`);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.log(`  SKIPPED ${mount.from} (not built yet — run npm run build)`);
  }
}

// CloudFront serves index.html for a directory request; replicate that so a
// link to /name-generators/cottage/ behaves here exactly as it does in prod.
async function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const target = path.join(stage, clean);
  if (!target.startsWith(stage)) return null; // reject ../ traversal
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const index = path.join(target, "index.html");
      await fs.access(index);
      return index;
    }
    return target;
  } catch {
    return null;
  }
}

http
  .createServer(async (req, res) => {
    const file = await resolve(req.url ?? "/");
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end(`404 ${req.url}`);
      console.log(`  404 ${req.url}`);
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      ...SECURITY_HEADERS,
    });
    res.end(await fs.readFile(file));
  })
  .listen(PORT, () => console.log(`\nComposed site on http://localhost:${PORT}/`));
