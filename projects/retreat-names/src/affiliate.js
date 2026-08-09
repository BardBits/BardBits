// Affiliate offer shown once a visitor has a name they like.
//
// MOCKUP: every href below is a placeholder. No affiliate programme has been
// joined yet, so nothing here is a live tracking link.
//
// Deliberately plain <a> links, no images, scripts, iframes or pixels. The
// site's CSP is `default-src 'self'` with `img-src 'self' data:`, so every
// standard affiliate unit would be blocked outright — but CSP does not
// restrict where a link navigates. That constraint happens to point at the
// version that suits an intent-driven page anyway: nothing to load, nothing
// to consent to, nothing that reads as an ad.
//
// If we keep this, the per-theme noun belongs in the theme JSON configs
// alongside the rest of the per-theme data. It lives here for now so the
// mockup is one file to review or delete.

const PLACEHOLDER = "#placeholder-not-a-live-affiliate-link";

/**
 * Each destination carries its own tag so the network's own dashboard reports
 * which placement earned the click. That is the whole measurement story: no
 * analytics, no cookies, nothing for the CSP to block.
 */
function tagged(href, subId) {
  if (href === PLACEHOLDER) return `${href}&subid=${subId}`.replace("#", "#?");
  const url = new URL(href);
  url.searchParams.set("subid", subId);
  return url.toString();
}

/**
 * Only the noun changes per theme, and only because the visitor just generated
 * a name of that kind — it is what they would type into a search box.
 *
 * An earlier draft also varied the medium (cottage carved, cabin branded,
 * beach painted). That was circular: it came from the sign artwork drawn for
 * this app, not from anything about what buyers want. Marketplaces mix carved,
 * painted, engraved and burned under one search, so narrowing by medium only
 * loses the visitors who wanted a different one. The media now sit in the
 * blurb, where listing them signals choice rather than restricting it.
 */
const NOUNS = {
  cottage: "cottage",
  cabin: "cabin",
  beach: "beach house",
};

const HEADING = "Now put it on a real sign";

const BLURB =
  "Independent makers work in carved oak, burned cedar, engraved slate and " +
  "hand-painted board — one-off signs made to order.";

export function offerFor(themeId) {
  const noun = NOUNS[themeId];
  if (!noun) return null;
  return {
    heading: HEADING,
    blurb: BLURB,
    buy: `Browse custom ${noun} signs`,
    make: "Or make one yourself",
    buyHref: tagged(PLACEHOLDER, `${themeId}-buy`),
    makeHref: tagged(PLACEHOLDER, `${themeId}-make`),
  };
}

/**
 * Rakuten Advertising's network policy is prescriptive here, well beyond the
 * general FTC and Competition Bureau duty to disclose a material connection.
 * It must literally begin with the word "Disclosure:", and be frequent, clear,
 * conspicuous, and visible without any further action from the reader.
 *
 * That is why the label is split out to be styled, why the text sits ABOVE the
 * links rather than beneath them, and why it is larger and coloured rather than
 * the quiet grey footnote a designer would otherwise reach for. Reading it
 * strictly, someone must not be able to reach the links without the disclosure
 * having passed through view first.
 *
 * https://rakutenadvertising.com/legal-notices/affiliate-network-policies/
 */
export const DISCLOSURE_LABEL = "Disclosure:";

export const DISCLOSURE_BODY =
  "These are affiliate links. If you buy something through them, BardBits may earn a commission at no extra cost to you.";
