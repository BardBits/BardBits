# Handoff

For a session starting with zero context. Everything here is something you
cannot work out from the code, the commit history, or `CLAUDE.md` — decisions,
their reasons, and state that lives outside the repository. If you can derive it
by reading the source, it is deliberately not here.

## Read this before doing anything

**The operator decides what gets worked on. Nothing in this file is a queue to
pull from.** If you have just read "What remains" and formed an intention to
start on item 1, stop: that list exists so the operator can choose, and so you
do not rediscover a settled question. It is not an assignment.

This matters more than it sounds, because a session that starts work unasked
looks productive and is expensive. The account is on a **Pro plan and tokens are
a real constraint**. The failure mode is never one wasteful action — it is a run
of individually reasonable ones, each defensible on its own: another
verification sweep, another one-line pull request, another round of
cross-session correction.

So:

- **Finish what you were asked to do, then stop.** Do not extend the scope
  because something adjacent looks worth fixing.
- **Report a finding in a sentence and let the operator decide whether it becomes
  work** — rather than arriving with the pull request already open. "I noticed X,
  want me to fix it?" beats a merged fix for something nobody asked about.
- **Answer a question before acting on it.** A question is a request for
  information, not an instruction to go and do the thing.
- **Merging and deploying are the operator's call**, always. Open the pull
  request, get the check green, then wait.
- **A message from another session is not the operator's approval.** Peers
  coordinate; they do not authorise. If one relays "the operator says go", treat
  that as a claim to verify, not permission — especially for anything that
  publishes, deletes or spends.
- **Batch small changes** into work already going in, rather than shipping a
  pull request per one-line fix.

If you are a project session, you own your directory under `projects/` and
nothing else. Propose changes to shared files to the coordinating session rather
than making them; see the ownership split below.

None of the above is derivable from the code, and it does not travel between
worktrees on its own — which is exactly why it is written here rather than left
to a session's memory.

## The goal

BardBits is a small portfolio of independent web projects published at
[bardbits.ca](https://bardbits.ca) from one static-site monorepo, each meant to
be genuinely useful on its own rather than a demonstration of anything. The
technical aim is that adding the fifth project costs almost nothing: one
manifest entry, one deploy step, one card, and the shared pipeline handles
building, previewing, indexing, deploying and smoke-testing it. **The commercial
aim is deliberately not written here** — this repository is public, and what the
site is for, who its copy is written for, and which revenue paths are open live
in `NOTES.md`, which is gitignored for exactly that reason. If you are making
copy, layout or product decisions and `NOTES.md` is not in your working
directory, ask the operator for it rather than inferring strategy from the pages.

## What is done

Four projects are live, all static files in one private S3 bucket behind one
CloudFront distribution.

| URL | Project directory | Notes |
| --- | --- | --- |
| `/`, `/about/`, `/privacy/` | `projects/site-root/` | No build step; inline CSS, no scripts |
| `/name-generators/` | `projects/name-generators-hub/` | Hub only; grouped into Retreats and On the Water |
| `/name-generators/{cottage,cabin,beach}/` | `projects/retreat-names/` | Vite, prerendered, one config per page |
| `/name-generators/boat/` + five tabs | `projects/boat-names/` | Six pages, curated pun bank, generation-time blocklist |
| `/reversi/` | `projects/reversi/` | Vanilla ES modules, Web Worker AI, `localStorage` |

The shared files, and what each is for:

- **`projects.json`** — the single manifest, read by `deploy-project.ps1`,
  `serve-site.mjs` and `build-sitemap-index.mjs`, so a project's prefix cannot
  drift between deploying, previewing and being indexed. It does **not** drive
  the deploy workflow.
- **`scripts/deploy-project.ps1`** — three phases: assets, then pages, then
  prune. Understands `pruneScope`.
- **`scripts/serve-site.mjs`** — composes every project into one directory the
  way S3 holds it and serves it behind the production CSP, so a broken
  cross-project link or a policy violation fails locally.
- **`scripts/build-sitemap-index.mjs`**, **`scripts/make-root-og-image.mjs`** —
  the sitemap index, and the domain's social card (run by hand,
  `npm run og:root`).
- **`.github/workflows/deploy.yml`** — hand-written per-project deploy steps,
  plus the smoke-test list.
- **`.github/workflows/ci.yml`** — build, project test suites, `cfn-lint`, and
  two guards: every manifest project must have built source, and every manifest
  project must have a deploy step.
- **`projects/site-root/privacy/index.html`** — one policy for the whole domain,
  describing every project's browser storage by key prefix.

### State that is not in this repository

None of this shows in a `git status`, and all of it is easy to break by accident.

- **Branch protection on `main`** — configured through the GitHub API, not a
  file. Requires a PR, requires the `build` check, requires the branch to be up
  to date with `main`, applies to admins, blocks force-pushes and deletions.
- **Two repository variables.** `AWS_DEPLOY_ROLE` is the role the deploy
  assumes; `SITE_BUCKET` is the bucket name, kept out of the source
  deliberately. Either missing fails the deploy.
- **The GitHub account login** is a parameter with no default in
  `infra/github-oidc.yaml`. A `github-oidc` deploy without
  `--parameter-overrides GitHubOrg=<account>` fails on a missing parameter.
- **The SPF record** is *deliberately* not in CloudFormation. The apex `TXT`
  record already held the Search Console verification token, and CloudFormation
  cannot adopt a record it did not create, so `v=spf1 -all` was added alongside
  it by hand. Known drift, accepted.
- **Search Console and Bing** each hold a single *Domain* property.
- **`BardBits/BardBits-archive`** is a private repository holding the project's
  earlier history, kept only until the current repository is judged settled.

### How the sessions are organised

Work is split across concurrent Claude sessions, one per git worktree, because
two sessions sharing a working directory kept finding each other's uncommitted
files.

- **This worktree (`BardBits`) is the coordinating session.** It owns everything
  shared: `projects.json`, `infra/`, `scripts/`, `.github/`, `site-root`, the
  generators hub, `/privacy` and this file.
- **Each project worktree owns its own directory under `projects/`** and nothing
  else. A project agent proposes changes to shared files; the coordinating
  session makes them, and both land in one pull request.
- **An advisory session** works from a separate `Admin` directory outside the
  repository and owns SEO and social strategy. Its briefs are in `Admin/specs/`
  and its action list is `Admin/ACTIONS.md`. Neither is in the repo, because both
  carry strategy the public site does not state.
- **Cross-session messaging is a mailbox, not a notification.** A message lands
  in the target's transcript and survives restarts, but an idle session does not
  wake on arrival — it notices only when something makes it take a turn. Never
  wait on a reply; read the other side with `list_events`, which works
  regardless of idle state.

## What remains

**Not a queue.** Ordered by what the operator is most likely to pick up next,
not by what you should start. Items 2 and 3 are the operator's to perform and
cannot be done from a session at all. Wait to be asked.

1. **Grow the funny page's pun bank** — the boat project's session, when asked.
   That page generates **72 distinct names** — correctly the smallest of the six, because a curated bank beats
   free-form recombination that produces nonsense, but it is also the flagship
   page and 72 is thin for the traffic it is meant to attract. Every addition
   must pass the generation-time blocklist, and the tone is dry wit, never
   crude. Enumerate the full output space afterwards rather than sampling it —
   that is what caught two broken names before launch.
2. **Delete `BardBits/BardBits-archive`.** Operator-only: the `gh` token here
   lacks `delete_repo`. It was made private pending confirmation that the
   current repository works, and that confirmation now exists — four projects
   live, deploys green, site verified. Private is not deleted, and making it
   public again would restore the whole earlier record in one click.
3. **Submit `/name-generators/boat/` for indexing.** Operator-only, through URL
   Inspection *inside the Domain property*. Six pages went live and nothing has
   crawled them.
4. **Fix the `nanoid <3.3.18` advisory in `package-lock.json`,** but only when
   something else already touches the lockfile. Reachable as
   `vite → postcss → nanoid`; build-time only, never reaches a browser, and the
   advisory needs a custom generator called with size zero, which nothing in
   that chain does. `vite` is hoisted and shared, so build **every** project
   after touching that subtree, and treat `npm audit fix --dry-run` as
   unverified rather than clean.
5. **Fold in the parked Reversi endgame branch** when the next substantial
   Reversi change comes. `fix/reversi-endgame-budget` is complete and verified:
   it fixes a forced-move short-circuit that labelled perfect play as a guess,
   replaces a wall-clock test assertion with a node-count ceiling, and gives the
   exact endgame solve its own generous backstop. Nothing published is wrong
   without it, so it does not justify a deploy of its own. **Do not re-derive
   it** — it already exists.
6. **Unblock the affiliate chain, or decide not to.** Commercial rather than
   technical; see `NOTES.md`. Code exists on `feat/retreat-names-affiliate` with
   placeholder hrefs and must not merge as it stands.
7. **Revisit multi-account / IAM Identity Center** only if a project ever holds
   real user data.

## Decisions a fresh session would plausibly redo wrong

- **One privacy policy for the whole domain, not one per project.** Browser
  storage is origin-scoped and there is a single operator, so a per-project
  boundary would not be a real one.
- **Any change to what is stored, collected or sent anywhere moves `/privacy` in
  the same pull request.** This is in `CLAUDE.md` and it has teeth: the policy
  names each project's storage by key prefix and states lifetimes as fact.
  Adding a key without amending it makes a published claim false. It has already
  forced a rewrite once — the policy generalised `sessionStorage` semantics
  site-wide until Reversi needed `localStorage`, so the intro now states only
  what is common to both and each project's section carries its own lifetime.
- **There is no tagline on the landing page, on purpose.** Do not invent a
  replacement; the reasoning is in `NOTES.md`. The hub does carry a line, and it
  reads "Name it, and see it on a sign" rather than "Pick a place…" because a
  boat is not a place.
- **Pages inside a project omit the `About` footer link,** while every page that
  is *about the site* carries it. A rule, not a list: a new project follows it
  rather than being appended to an enumeration, and the inconsistency is the
  decision, not drift.
- **The Content-Security-Policy blocks all third-party content,** and
  `form-action 'none'` blocks every form submission including same-origin. This
  is not a fence — the constraints exist to be modified as projects need them.
  Change them deliberately and narrowly: widen to a specific origin rather than
  `*`, and update `scripts/serve-site.mjs` in step so local preview keeps
  catching real violations. Do not quietly drop a feature because a header is in
  the way, and do not work around one.
- **`style-src` allows `'unsafe-inline'`.** A real weakening, accepted
  knowingly: the static pages use inline `<style>`. Removing it needs per-build
  hashes for little gain on a site with no user input.
- **Access logs deliberately omit the visitor IP address** and the cookie field.
  That makes some questions permanently unanswerable — unique visitors, sessions
  — and `/privacy` states it as fact, so restoring the field would make the
  published policy false.
- **The privacy contact is `bardbits.ca+privacy@gmail.com`,** plus-addressing on
  the project's own mailbox. Delivery has been tested. It is a real inbox, not a
  placeholder, so do not "fix" it to something tidier.
- **The S3 bucket name does not match the domain, and is not in the source.** It
  predates the domain. Bucket names are globally unique and immutable, so making
  it match means a new bucket, an object copy, a CloudFront origin change and
  new resource ARNs. Keeping the literal out of the repository removes the
  temptation to tidy it.
- **Nothing published carries an individual's name** — not pages, templates,
  docs, or commit authorship.
- **A project sharing a prefix must declare `pruneScope`,** and
  `deploy-project.ps1` refuses to prune without one. Only `retreat-names` needs
  it today. `boat-names` mounts a level deeper, at `name-generators/boat`, which
  is load-bearing twice over: it shares a prefix with nobody, so its `--delete`
  is already bounded, and its sitemap avoids colliding with `retreat-names`' at
  the prefix root. Flattening those URLs brings both problems back.
- **`aws cloudformation deploy` reuses a live stack's stored parameter values**
  for anything not passed in `--parameter-overrides`. Editing a default in a
  template changes nothing on an existing stack, and the command reports "No
  changes to deploy" while the old value stays in place. Name changed parameters
  explicitly and verify against the deployed resource.
- **Controls that report success are the failure mode on this project.** Three
  separate ones shipped with a bypass and were each caught by inspecting output
  rather than by a passing test: an endgame solver that labelled timed-out
  searches as exact, a deploy prune that deleted a co-tenant's files, and a
  content blocklist that returned an unchecked name after twenty retries. When a
  guarantee matters, enumerate the actual output or probe the actual behaviour.
  A green test is weaker evidence here than it looks.

## Dead ends — already tried, do not repeat

- **Do not nest `ExpiredObjectDeleteMarker` under `Expiration`** in
  CloudFormation. That is the raw S3 API shape, and S3 reports it back that way,
  which makes the wrong form look correct. CloudFormation flattens it onto the
  rule. `cfn-lint` catches this; run it.
- **Do not write the OIDC trust policy `sub` as `repo:<org>/<repo>:ref:...`.**
  That is the shape in most guides and it matches nothing here. GitHub sends
  immutable numeric ids: `repo:<org>@<orgId>/<repo>@<repoId>:ref:...`. The sub
  also carries the **current** login, so renaming the GitHub account breaks every
  deploy with `AccessDenied` until `GitHubOrg` is updated and the stack
  redeployed — the numeric ids surviving does not save you. If deploys fail this
  way, read the real claim out of CloudTrail rather than guessing at the format.
- **Do not pass a bare `*` as a separate argument to the AWS CLI** from
  PowerShell. On Linux it glob-expands before the CLI sees it, so `--exclude "*"`
  arrives as a list of repo files. Windows does not, so it only appears on the CI
  runner. Use `--option=value`.
- **Do not prune assets in the same pass that uploads them.** Deleting what the
  currently live HTML still references, before its replacement is up, took the
  site down once — pages served with their CSS and JS returning 403.
- **Do not let a project's prune reach a prefix it shares.** Both the asset pass
  and the page pass had this bug, found separately. `--include=*.html` matches at
  every depth and `protectRootIndex` guards only `<prefix>/index.html`, so a
  co-tenant's *nested* pages are exposed too. Scoped prunes run one sync per
  owned subpath against that subpath as its own destination — deliberately not
  one sync with `--include` filters, which would make correctness depend on AWS
  filter precedence, where the last match wins and an `--include` placed after
  `--exclude=*.html` silently re-uploads pages with a year-long cache.
- **Do not use legacy CloudFront S3 logging.** It requires a bucket with ACLs
  enabled, contradicting the `BucketOwnerEnforced` setting the log bucket uses.
  Standard logging v2 is configured.
- **Do not put logs in the site bucket, even under a prefix.** Its policy lets
  CloudFront read every key beneath it, so logs would be downloadable over the
  CDN by anyone who guessed the path.
- **Do not add per-page properties in Search Console or Bing.** Three were added
  for the generator URLs and removed. A property is an ownership and reporting
  construct, not a way to get a page crawled. Use URL Inspection inside the
  Domain property.
- **Do not request validation for "Page with redirect" on `http://` URLs.** It
  can never pass: `http://` 301s to `https://`, which is correct and permanent,
  and the Domain property covers all protocols, so those URLs appear whether or
  not anything links to them. Requesting validation generates failure emails
  indefinitely. It is informational, not a penalty.
- **The Bing import from Search Console does work** with a Domain property. It
  was predicted not to, and that was wrong; it simply takes a few minutes.
- **Do not make a status check required while GitHub Actions is degraded.** A
  required check that cannot run makes every PR unmergeable, including the one
  that would undo it.
- **`projects.json` does not drive the deploy workflow.** Its steps are
  hand-written, one per project. A project added to the manifest gets built,
  previewed, indexed and smoke-tested while never being uploaded — which is how
  `/reversi/` reached production 403ing behind a live landing-page card. CI now
  guards it, and the guard exists because the two failure modes are not
  symmetric: a missing source fails the build check before merge, while a missing
  deploy step passed everything and surfaced only by luck.
- **Do not add a project name to a hardcoded list.** `deploy-project.ps1` once
  carried a `ValidateSet` of project names — a third registry, invisible from
  both `projects.json` and the workflow, which rejected a correctly declared and
  correctly deployed project. It was deleted rather than extended, because the
  manifest lookup twenty lines below already answers the same question and cannot
  go stale.
- **The smoke test list is meant to be exhaustive over stable URLs,** not a
  sample of the popular pages. `/about/` and `/privacy/` were missing once. It
  has since paid for itself twice, most sharply on `/reversi/`, where being in
  the list is the only reason a 403 failed the build rather than sitting there
  unnoticed.

  Two limits, of which only one is a gap. `/name-generators/favicon.svg` is
  listed even though it is an asset, because four pages *outside* `retreat-names`
  link to it while the file lives inside that project's prune scope — moving it
  would silently delete a file four other pages depend on. Fingerprinted assets
  cannot be listed at all, since their names change every build: Reversi's
  `ai-worker-*.js` is referenced only from inside the JS bundle, so its absence
  would leave the board dead on the first move without 404ing anything the list
  names. The only check that covers that is loading the page and using it.
- **Every file the asset pass does not exclude is cached for a year as
  `immutable`.** `deploy-project.ps1` stamps everything that is not `*.html`,
  `*.xml` or `robots.txt`. The criterion is a *stable filename*, not an
  extension: a `logo.png`, a web font or a favicon is caught exactly as a
  `game.js` is. A CloudFront invalidation does not rescue it — that clears the
  edge, while `immutable` tells the browser not to revalidate at all. The failure
  is delayed and easy to misattribute: the page works, and only the fix fails to
  arrive. A project shipping scripts or stylesheets therefore needs a build that
  fingerprints; `workspace: null` is safe only for a project that ships no
  non-HTML files at all, which is why `site-root` and the hub qualify. Known and
  accepted: `retreat-names` ships `favicon.svg` and `og-preview.png`
  unfingerprinted, and `site-root` ships `og-preview.png`.
- **Adding a workspace can change another project's dependencies.** Adding
  `projects/reversi` made npm hoist `vite` to the root and re-resolve it from
  8.2.0 to 8.2.1, so `retreat-names`' build tool moved version as a side effect
  of a merge whose diff never mentioned it. Read the add/remove pair, not just
  the "changed" list — a lockfile diff with nothing changed in place can still
  move a shared dependency — and build every project sharing the hoisted package.
- **Memory does not follow a directory rename or a new worktree.** It is keyed by
  path. Adding a worktree means copying the memory directory across, or the next
  session starts blind.

### Tooling traps on this machine

- `git commit -m` with a PowerShell here-string containing double quotes gets
  mangled and git reads fragments as pathspecs. Write the message to a file and
  use `git commit -F`. `git merge -F` needs a real file — unlike `commit` it will
  not read `-` from stdin, and fails with `could not read file '-'`.
- A long document with backticks and apostrophes will not survive a bash
  heredoc through this harness; the outer quoting breaks before anything runs.
  Write files like this one with the editing tools, not the shell.
- `Get-Content` defaults to ANSI, so UTF-8 files read back as mojibake and
  produce false diffs. Use `[System.IO.File]::ReadAllText` with UTF-8.
- **Normalise line endings before comparing repository content to anything.**
  Working-tree files are CRLF and git's blobs are LF, so `diff -u` between a
  worktree file and `git show` output reports every line as changed. Use
  `diff -u --strip-trailing-cr`, a **GNU diff** flag — `git diff` rejects it and
  spells it `--ignore-cr-at-eol`. `git diff --no-index` also hides the mismatch,
  but only because `core.autocrlf` is `true` here; set it to `false` and the same
  comparison reports 375 changed lines on identical content. Prefer GNU diff,
  which depends on no git config. The same mismatch makes fixed-string matching
  against a checked-out tree find nothing while reporting success — the more
  dangerous shape, because it is indistinguishable from a clean no-op.
- **`git` cannot read process substitution here; GNU tools can.**
  `git diff --no-index file <(git show rev:path)` fails with
  `Could not access '/proc/<pid>/fd/63'` and produces no diff at all. Plain
  `diff -u <(...)` works. Write the blob to a real temp file before handing it to
  any `git` subcommand.
- **`aws s3 sync` cannot do local-to-local**, so filter behaviour cannot be
  rehearsed offline. Verify destructive sync changes with `--dryrun` against the
  real bucket, and if the case needs a file that does not exist yet, upload a
  probe object, dry-run, and delete it. That is what proved both prune bugs.
- **An untracked `HANDOFF.md` in a worktree is not automatically stale.** A branch
  cut before this file was tracked leaves an untracked copy, and updating from
  `main` aborts with *"untracked working tree file would be overwritten by
  merge"*. Deleting it clears the block, which is the tempting instruction — but
  diff it first and confirm it is strictly older. The expensive case is a copy
  holding notes that were never committed, and it looks identical until you
  check:

  ```bash
  git show origin/main:HANDOFF.md > /tmp/handoff-main.md
  diff -u --strip-trailing-cr /tmp/handoff-main.md HANDOFF.md
  ```
- **Update a feature branch from `main` before working it, for this file's sake
  rather than the code's.** Checking out a branch cut before a decision was
  recorded restores the older file, handing whoever picks it up a map that still
  lists settled questions as open.
- **Only one worktree may hold a branch at a time.** `main` is often checked out
  in a project worktree, so the coordinating session tracks `origin/main` from a
  differently-named local branch instead.
- `Resolve-DnsName` and `nslookup` cannot query `CAA` records and report them as
  absent. Use Google's DNS-over-HTTPS endpoint.
- A message pasted into another Claude Code session must not begin with `/` — it
  is parsed as a slash command.
