import { CONFIGS } from "./configs/index.js";

export const BASE = import.meta.env.BASE_URL;

export const ORIGIN = import.meta.env.VITE_SITE_ORIGIN ?? "https://bardbits.ca";

// The generic "boat" config is the default page, not a tab — exclude it from
// the tab bar but include it in prerendered routes.
const TAB_IDS = ["funny", "nautical", "sailboat", "pontoon", "fishing"];

export const ROUTES = Object.values(CONFIGS).map((config) => ({
  id: config.id,
  slug: config.seo.slug,
  tab: config.seo.tab,
  title: config.seo.title,
  description: config.seo.description,
}));

export const TAB_ROUTES = ROUTES.filter((r) => TAB_IDS.includes(r.id));

export function pathFor(slug) {
  if (slug === "boat") return BASE;
  return `${BASE}${slug}/`;
}

export function urlFor(slug) {
  return `${ORIGIN}${pathFor(slug)}`;
}
