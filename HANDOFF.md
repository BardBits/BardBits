# Handoff

For a session starting with no context. Everything here is something you cannot
work out from the code, the commit history, or `CLAUDE.md` — mostly decisions,
their reasons, and state that lives outside the repository.

**This is the technical half.** Commercial positioning — what the site is for,
what it is allowed to say, and why — lives in `NOTES.md`, which is deliberately
untracked because this repository is public. If you are making copy, layout or
product decisions and `NOTES.md` is not in your working directory, ask the
operator for it rather than inferring the strategy from the site.

## State that is not in this repository

These will not show up in a `git status`, and are easy to break by accident:

- **Branch protection on `main`** — configured through the GitHub API, not a
  file. Requires a PR, requires the `build` check, requires the branch to be up
  to date with `main`, applies to admins, blocks force-pushes and deletions.
  A push straight to `main` will be rejected; that is intended.
- **The `AWS_DEPLOY_ROLE` repository variable** — the deploy workflow reads it.
  If it is missing, deploys fail at the credentials step.
- **The `SITE_BUCKET` repository variable** — the bucket name is deliberately
  not in the source. The deploy workflow reads it; if it is missing the sync
  runs against an empty bucket name. `gh variable get SITE_BUCKET` retrieves it,
  and the `portfolio-site` stack outputs it.
- **The SPF record** is *deliberately* not in CloudFormation. The apex `TXT`
  record already existed holding the Search Console verification token, and
  CloudFormation cannot adopt a record it did not create, so `v=spf1 -all` was
  added alongside that value by hand. Consolidating means briefly deleting the
  verification record. Known drift, accepted.
- **Two git worktrees.** `BardBits` owns infrastructure, deploy tooling, CI,
  `site-root` and the generators hub. `BardBits-retreat-names` owns the three
  generators and anything belonging to them. Edit only in the worktree that owns
  what you are changing. They exist because two concurrent sessions kept finding
  each other's uncommitted files in a shared directory.
- **Search Console and Bing** each hold a single *Domain* property for the
  domain. Do not add per-page properties (see dead ends).

## What remains

1. **The affiliate module stays unshipped**, and the reason is commercial rather
   than technical. See `NOTES.md`. The code exists on
   `feat/retreat-names-affiliate` with placeholder hrefs and must not merge as
   it stands: going live needs real deep links, the sub-ID parameter renamed to
   whatever the network uses, and — per `CLAUDE.md` — `/privacy` updated in the
   same pull request, which lives in `site-root` rather than that worktree.
2. **Revisit multi-account / IAM Identity Center** if a project ever holds real
   user data. Not before that.

## Decisions a fresh session would plausibly redo wrong

- **There is no tagline on the landing page, on purpose.** Do not invent a
  replacement; the reasoning is in `NOTES.md`.
- **One privacy policy for the whole domain, not one per project.** Browser
  storage is origin-scoped and there is a single operator, so a per-project
  boundary would not be a real one.
- **The About page is footer-linked only,** not given a card on the landing
  page. That is a positioning decision, not an oversight — see `NOTES.md`.
- **The three generator pages deliberately omit that `About` footer link,** and
  every other page carries it. The inconsistency is the decision, not drift, so
  do not tidy it. About is linked from the pages that are *about the site* — the
  root, the hub, `/privacy/` — and not from inside a project. `/about/` is a
  build log, and it tells a visitor who came to name a cottage that they can
  safely ignore it; the generator pages are the ones search actually lands on,
  and their visitor's attention is worth more elsewhere. Commercial reasoning in
  `NOTES.md`. If the affiliate module ever ships on these pages the case gets
  stronger, not weaker. Revisit only if `/about/` is rewritten to serve visitors
  rather than describe how the site is built, which would make it a different
  page than the one this was decided against.
- **Access logs deliberately omit the visitor IP address** (and cookies). It
  makes some questions unanswerable and that trade was made knowingly. The
  privacy policy states it as a fact, so adding the field would make the
  published policy false.
- **The Content-Security-Policy blocks all third-party content.** This will
  break affiliate widgets, externally hosted product images, tracking pixels and
  embedded iframes — plain `<a>` links are fine. That is the intended behaviour,
  not an oversight. If an exception is genuinely needed, widen to the specific
  merchant domain rather than `*`, and change `scripts/serve-site.mjs` to match
  so local preview keeps catching violations.
- **`style-src` allows `'unsafe-inline'`.** A real weakening, accepted
  knowingly: the static pages use inline `<style>` and the app sets CSS custom
  properties through React `style` attributes. Removing it needs per-build
  hashes and a refactor for little gain on a site with no user input.
- **`form-action 'none'` blocks every form submission, including same-origin.**
  Any future form — email capture, search — needs this loosened first.
- **The privacy contact address is `bardbits.ca+privacy@gmail.com`,** which is
  plus-addressing on the `bardbits.ca@gmail.com` mailbox. Delivery has been
  tested. It is a real inbox rather than a placeholder, so do not "fix" it to
  something tidier — it is published on `/privacy` as the route for exercising
  data rights.
- **The S3 bucket name does not match the domain, and is not in the source.**
  It predates the domain. Bucket names are globally unique and cannot be
  changed, so making it match means a new bucket, an object copy, a CloudFront
  origin change and new resource ARNs in the deploy role — a migration, not an
  edit, and not worth the downtime. Keeping the literal out of the repository
  removes the temptation to tidy it. See `SITE_BUCKET` above.
- **`aws cloudformation deploy` reuses a live stack's stored parameter values**
  for anything not passed in `--parameter-overrides`. Editing a default in a
  template therefore changes nothing on an existing stack, and the command
  cheerfully reports "No changes to deploy" while the old value stays in place.
  Name changed parameters explicitly and verify against the deployed resource.

## Dead ends — already tried, do not repeat

- **Do not nest `ExpiredObjectDeleteMarker` under `Expiration`** in
  CloudFormation. That is the raw S3 API shape, and S3 reports it back that way,
  which makes the wrong form look correct. CloudFormation flattens it onto the
  rule. `cfn-lint` catches this; run it.
- **Do not write the OIDC trust policy `sub` as `repo:<org>/<repo>:ref:...`.**
  That is the shape in most guides and it matches nothing here. GitHub sends
  immutable numeric ids: `repo:<org>@<orgId>/<repo>@<repoId>:ref:...`. If
  deploys ever fail with `AccessDenied` on `sts:AssumeRoleWithWebIdentity`, read
  the real claim out of CloudTrail rather than guessing at the format.
- **Do not pass a bare `*` as a separate argument to the AWS CLI** from
  PowerShell. On Linux it glob-expands against the working directory before the
  CLI sees it, so `--exclude "*"` arrives as a list of repo files. Windows does
  not do this, so it only appears on the CI runner. Use `--option=value`.
- **Do not prune assets in the same pass that uploads them.** Deleting what the
  currently live HTML still references, before the replacement HTML is up, took
  the site down once — pages served with their CSS and JS returning 403. Uploads
  are additive and pruning runs last for that reason.
- **Do not use legacy CloudFront S3 logging.** It requires a bucket with ACLs
  enabled, which contradicts the `BucketOwnerEnforced` setting the log bucket
  uses. Standard logging v2 is already configured.
- **Do not put logs in the site bucket, even under a prefix.** Its policy lets
  CloudFront read every key beneath it, so logs would be downloadable over the
  CDN by anyone who guessed the path.
- **Do not add per-page properties in Search Console or Bing.** Three were
  briefly added for the generator URLs and removed. A property is an ownership
  and reporting construct, not a way to get a page crawled; one per page just
  fragments the data. Use URL Inspection inside the domain property instead.
- **The Bing import from Search Console does work** with a Domain property. It
  was predicted not to, and that prediction was wrong — it simply takes a few
  minutes to populate. Do not skip it and set up manual verification.
- **Do not make a status check required while GitHub Actions is degraded.** A
  required check that cannot run makes every PR unmergeable, including the one
  that would undo it.
- **The smoke test list is meant to be exhaustive,** not a sample of the popular
  pages. `/about/` and `/privacy/` were missing from it once, and a deploy that
  broke either would have gone green.
- **A project shipping its own `.js` or `.css` must fingerprint the filenames.**
  The asset pass in `scripts/deploy-project.ps1` gives every file that is not
  `*.html`, `*.xml` or `robots.txt` a one-year `immutable` cache. That is
  correct for Vite output, whose names change with the bytes, and the comment
  there says so — but nothing enforces it. Ship an unfingerprinted `game.js` and
  returning visitors hold it for a year; a CloudFront invalidation clears the
  edge, not their browsers, so a fix reaches only people who never visited.
  `workspace: null` is therefore safe only for a project whose CSS is inline and
  which has no scripts at all, which is why `site-root` and
  `name-generators-hub` get away with it. Anything with real assets needs a
  build. The failure is delayed and easy to misattribute: the page works, and
  only the fix fails to arrive.
- **Memory does not follow a directory rename or a new worktree.** It is keyed
  by path. Moving or adding a working directory means copying the memory
  directory across, or the next session starts blind.

### Tooling traps on this machine

- `git commit -m` with a PowerShell here-string containing double quotes gets
  mangled and git reads fragments as pathspecs. Write the message to a file and
  use `git commit -F`. Note that `git merge -F` needs a real file — unlike
  `commit`, it will not read `-` from stdin, and fails with
  `could not read file '-'`.
- `Get-Content` defaults to ANSI, so UTF-8 files read back as mojibake and
  produce false diffs. Use `[System.IO.File]::ReadAllText` with UTF-8 when
  comparing.
- **Normalise line endings before comparing repository content to anything.**
  Working-tree files here are CRLF and git's stored blobs are LF, so `diff -u`
  between a worktree file and the output of `git show` reports every line as
  changed and buries the real hunks. Use `diff -u --strip-trailing-cr`, which is
  a **GNU diff** flag — `git diff` rejects it and spells it `--ignore-cr-at-eol`.
  `git diff --no-index` also hides the mismatch, but only because
  `core.autocrlf` is `true` here: set it to `false` and the same comparison
  reports 375 changed lines on identical content. Prefer GNU diff, which depends
  on no git config. The same mismatch makes fixed-string matching against a
  checked-out tree find nothing while reporting success — the more dangerous
  shape, because it is indistinguishable from a clean no-op.
- **`git` cannot read process substitution on this machine; GNU tools can.**
  `git diff --no-index file <(git show rev:path)` fails with
  `error: Could not access '/proc/<pid>/fd/63'` and produces no diff at all,
  because Git for Windows cannot open the `/proc` path Git Bash hands it. Plain
  `diff -u <(...)` works fine. Write the blob to a real temp file before handing
  it to any `git` subcommand.
- **An untracked `HANDOFF.md` in a worktree is not automatically stale.** A
  branch cut before this file was tracked leaves an untracked copy behind, and
  updating from `main` then aborts with *"untracked working tree file would be
  overwritten by merge"*. Deleting it clears the block, so that is the tempting
  instruction — but diff it first and confirm it is strictly older before
  removing it. The expensive case is a copy holding notes that were never
  committed, and it looks identical to the harmless one until you check. The
  untracked copy is CRLF and `git show` emits LF, so an unnormalised comparison
  calls every line changed — 351 lines of noise on byte-identical content. Two
  steps, depending on nothing but GNU diff:

  ```bash
  git show origin/main:HANDOFF.md > /tmp/handoff-main.md
  diff -u --strip-trailing-cr /tmp/handoff-main.md HANDOFF.md
  ```
- **Update a feature branch from `main` before working it, for `HANDOFF.md`'s
  sake rather than the code's.** Checking out a branch cut before a decision was
  recorded restores the older file, so the branch hands whoever picks it up a
  map that still lists settled questions as open — and invites exactly the
  rework the entry was written to prevent. Being behind on this file is not
  cosmetic the way being behind on source is.
- `Resolve-DnsName` and `nslookup` cannot query `CAA` records and will report
  them as absent. Use Google's DNS-over-HTTPS endpoint instead.
- A message pasted into another Claude Code session must not begin with `/` —
  it is parsed as a slash command.
