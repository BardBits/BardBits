import { offerFor, DISCLOSURE_LABEL, DISCLOSURE_BODY } from "../affiliate.js";

/**
 * The next step after someone lands on a name they like: buy the sign, or
 * build it. Those are the only two things a visitor holding a cottage name
 * plausibly wants next, so the module offers exactly those and nothing else.
 *
 * The disclosure deliberately precedes the links. Rakuten requires it be
 * visible without further action from the reader, so it has to pass through
 * view before the links it covers can be reached, not sit under them as a
 * footnote.
 *
 * rel="sponsored nofollow" is what Google asks for on paid links, and
 * noopener protects the opener from the target window.
 */
export default function AffiliateOffer({ themeId }) {
  const offer = offerFor(themeId);
  if (!offer) return null;

  return (
    <aside className="offer" aria-labelledby="offer-heading">
      <h2 className="offer-heading" id="offer-heading">{offer.heading}</h2>
      <p className="offer-blurb">{offer.blurb}</p>

      <p className="offer-disclosure">
        <b className="offer-disclosure-label">{DISCLOSURE_LABEL}</b>{" "}
        {DISCLOSURE_BODY}
      </p>

      <div className="offer-links">
        <a
          className="offer-link offer-link-primary"
          href={offer.buyHref}
          rel="sponsored nofollow noopener"
          target="_blank"
        >
          {offer.buy}
        </a>
        <a
          className="offer-link"
          href={offer.makeHref}
          rel="sponsored nofollow noopener"
          target="_blank"
        >
          {offer.make}
        </a>
      </div>
    </aside>
  );
}
