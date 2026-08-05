import { CONFIGS } from "./configs/index.js";

/** Base the site is mounted at, e.g. "/name-generators/". Set in vite.config.js. */
export const BASE = import.meta.env.BASE_URL;

/**
 * Absolute origin for canonical and og:url tags. The apex is canonical; www
 * 301s to it at the edge, so it must never appear here. Override at build time
 * with VITE_SITE_ORIGIN when deploying somewhere else.
 */
export const ORIGIN = import.meta.env.VITE_SITE_ORIGIN ?? "https://bardbits.ca";

/** One prerendered page per theme. */
export const ROUTES = Object.values(CONFIGS).map((config) => ({
  id: config.id,
  slug: config.seo.slug,
  tab: config.seo.tab,
  title: config.seo.title,
  description: config.seo.description,
}));

/** Site-root-relative path for a theme, e.g. "/name-generators/cabin/". */
export function pathFor(slug) {
  return `${BASE}${slug}/`;
}

/** Fully qualified URL for a theme, for canonical and sitemap use. */
export function urlFor(slug) {
  return `${ORIGIN}${pathFor(slug)}`;
}
