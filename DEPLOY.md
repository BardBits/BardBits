# Deploying BardBits (S3 + CloudFront)

Every project in this monorepo is static, and all of them share one private S3
bucket served through one CloudFront distribution. Projects are separated by key
prefix rather than by bucket, so adding a project costs nothing in
infrastructure. No servers, no backend.

Deployed as stack `portfolio-site` in `ca-central-1`, account `657918590662`.

## Layout

```
projects/site-root/            -> bardbits.ca/
projects/name-generators-hub/  -> bardbits.ca/name-generators/
projects/retreat-names/        -> bardbits.ca/name-generators/{cottage,cabin,beach}/
```

`retreat-names` is one app serving three themes that share a design and a
history store. A future generator with its own look is a new project, not a
fourth theme.

## projects.json

`projects.json` at the repo root declares where each project deploys and how
much of its prefix it may delete. It is read by `deploy-project.ps1`,
`serve-site.mjs` and `build-sitemap-index.mjs`, so a project's prefix cannot
drift between being deployed, previewed and indexed.

| Field | Meaning |
| --- | --- |
| `prefix` | S3 key prefix; `""` is the bucket root |
| `workspace` | npm workspace to build, or `null` for a project with no build |
| `prune` | may this project's sync delete keys under its prefix? |
| `protectRootIndex` | keep `<prefix>/index.html` while pruning, because another project owns it |
| `pages` | static URLs this project contributes to the sitemap |
| `sitemap` | true if the build emits its own `sitemap.xml` |

**Only `retreat-names` prunes.** Two projects can share a prefix, and both of the
others do:

- `site-root` sits at the bucket root, which every other project lives beneath.
  A `--delete` there would wipe the entire site.
- `name-generators-hub` shares `name-generators/` with `retreat-names`. A
  `--delete` from the hub would remove `cottage/`, `cabin/` and `assets/`.
- `retreat-names` owns everything under that prefix *except* `index.html`, which
  is the hub's. `protectRootIndex` excludes exactly that one key.

The exclusion works because `--exclude "index.html"` matches only the prefix
root — `cottage/index.html` is untouched, so stale nested pages are still pruned.
`deploy-project.ps1` also refuses to prune anything mounted at the bucket root
regardless of what the manifest says.

## One-time setup

### 1. Sign in

The account has no access keys by design. Credentials come from a browser
sign-in that issues short-term keys:

```bash
aws login
```

This mirrors whichever principal is signed into the AWS Console, so be signed in
as `agent-toolkit` first, not root or `DJS_Admin`. It silently reuses a live
console session, so switching identity means signing out of the console (or
using a private window) rather than just re-running the command. Verify with:

```bash
aws sts get-caller-identity
```

### 2. Create the infrastructure

Bucket names are globally unique across all of AWS. This account uses an
account-ID suffix to guarantee that:

```bash
aws cloudformation deploy --template-file infra/site.yaml --stack-name portfolio-site --parameter-overrides BucketName=darou-portfolio-657918590662 --region ca-central-1
```

This creates the bucket, the CloudFront distribution, and an Origin Access
Control so the bucket stays private — only CloudFront can read it. The first
distribution rollout takes about 5–15 minutes.

Then read back the values you'll need:

```bash
aws cloudformation describe-stacks --stack-name portfolio-site --region ca-central-1 --query "Stacks[0].Outputs" --output table
```

Validate template changes before deploying them:

```bash
cfn-lint infra/site.yaml
```

## Deploying

One project at a time, by name:

```bash
./scripts/deploy-project.ps1 -Project retreat-names -Bucket darou-portfolio-657918590662 -DistributionId E3RJMPASAQD8EC
```

Valid names are the `name` fields in `projects.json`. The script builds the
project's workspace if it has one, uploads, and invalidates that prefix. Pass
`-SkipBuild` to publish what is already in `dist/`.

Deploying everything is three calls, root last so the sitemap index reflects
whatever the other projects just built:

```bash
./scripts/deploy-project.ps1 -Project retreat-names -Bucket BUCKET -DistributionId DIST
./scripts/deploy-project.ps1 -Project name-generators-hub -Bucket BUCKET -DistributionId DIST
./scripts/deploy-project.ps1 -Project site-root -Bucket BUCKET -DistributionId DIST
```

## Previewing the whole site locally

Each project builds in isolation, so no single `dist/` can prove that links
*between* projects resolve. This stages every project into one tree exactly as
the bucket holds them and serves it:

```bash
npm run site
```

It replicates CloudFront's directory-index behaviour, so `/name-generators/cabin/`
behaves as it does in production. For iterating on the app itself, `npm run dev`
is still the faster loop.

## Edge routing

A CloudFront behaviour allows only **one** viewer-request function, so all edge
routing lives in `DirectoryIndexFunction` in `infra/site.yaml`, in this order:

1. **Canonical host.** `www` 301s to the apex, so only one hostname ranks.
2. **Legacy redirects.** The themes used to live under `/cottage-generator/`.
   Those URLs 301 to their new addresses so indexed pages transfer their ranking
   instead of becoming 404s. Everything under that prefix redirects, assets
   included: the objects behind it were deleted once the move was verified, so
   there is nothing left to serve and no reason to make an exception.
3. **Directory index.** S3 has no notion of one, and `DefaultRootObject` only
   covers `/`, so `/name-generators/cabin/` would ask S3 for a key that does not
   exist and come back 403. This rewrites directory-style URLs onto the real
   object.

The function is ES5 only — the CloudFront Functions runtime is not full modern
JS. Adding a rule means editing that one function, not attaching another.

## Sitemaps

Crawlers only read `robots.txt` from the origin root, so the root must describe
the whole site. But projects deploy on their own schedules, so the root cannot
hold one flat list without being regenerated whenever anything changes.

A sitemap index solves that — `scripts/build-sitemap-index.mjs` writes:

```
/sitemap.xml   index -> /pages.xml and each project's own sitemap
/pages.xml     the standalone pages that have no build step of their own
```

Both are generated into `projects/site-root/` and gitignored. A project updating
its URLs never touches a file it does not own. Sitemaps are excluded from the
year-long asset cache and given an hour instead, since their URLs are stable but
their contents change.

## Pages are prerendered

`npm run build` runs the client bundle, an SSR bundle, then
`scripts/prerender.mjs`, which renders each theme to static HTML. The files S3
serves contain the real headings, copy and sign text rather than an empty
`<div id="root">`, so crawlers see content without executing JavaScript. The
browser then hydrates that markup.

The prerenderer deletes `dist/index.html` rather than filling it: the hub owns
`/name-generators/`, and shipping a fourth copy of a theme there would compete
with that theme's own canonical URL.

Because the same components render in Node and in the browser, anything
affecting layout must be deterministic — see the note in `src/nameLayout.js`
about why text sizing uses a fixed estimate rather than measuring glyphs.

## Mount points

A project's mount point is defined in two places that **must agree**: `prefix`
in `projects.json`, and `base` in the project's `vite.config.js` (override with
the `SITE_BASE` env var).

Set that override from PowerShell, not Git Bash — MSYS rewrites a leading-slash
value into a Windows path, so `/name-generators/` silently becomes
`/Program Files/Git/name-generators/`:

```bash
$env:SITE_BASE = "/name-generators/"; npm run build
```

## How caching is handled

Vite fingerprints asset filenames (`index-BnxbtRNF.js`), so those URLs are
immutable and get a one-year `max-age`. Every `.html` file keeps a stable URL
across deploys, so all of them upload with `no-cache`; `robots.txt` and the
sitemaps get an hour. Assets upload before the HTML, so a new page is never live
while the files it references are missing.

## Custom domain: bardbits.ca

`bardbits.ca` is canonical and serves the site. `www` 301s to the apex at the
edge so only one hostname ranks. The other four domains in the registration
(`.net`, `.info`, `.shop`, `.store`) use **GoDaddy forwarding** to 301 to
`https://bardbits.ca` — they must never serve the content themselves, or the
same pages would compete with each other in search results.

Two AWS facts drive the shape of this:

- **CloudFront only reads certificates from `us-east-1`**, wherever the
  distribution lives. One stack cannot span regions, hence `certificate.yaml`
  being separate from `site.yaml`.
- **An apex domain cannot be a CNAME.** Route 53 ALIAS records can sit at a zone
  root; GoDaddy's DNS has no equivalent. That is the whole reason DNS moves to
  Route 53 while registration stays at GoDaddy.

### Order matters

The certificate validates by writing DNS records into the hosted zone, so the
zone has to be authoritative on the public internet first. Doing these out of
order leaves the certificate stack pending until it eventually times out.

1. Deploy `site.yaml` with `CertificateArn` empty. Creates the hosted zone; the
   distribution keeps serving its `cloudfront.net` URL.

   ```bash
   aws cloudformation deploy --template-file infra/site.yaml --stack-name portfolio-site --parameter-overrides BucketName=darou-portfolio-657918590662 --region ca-central-1
   ```

2. Read the nameservers and set them on `bardbits.ca` at GoDaddy. Wait for them
   to resolve publicly — usually minutes, occasionally hours.

3. Deploy the certificate **to us-east-1**, passing the zone from step 1. ACM
   writes its own validation records, so there is nothing to paste anywhere.

   ```bash
   aws cloudformation deploy --template-file infra/certificate.yaml --stack-name portfolio-certificate --parameter-overrides HostedZoneId=THE_ZONE_ID --region us-east-1
   ```

4. Re-deploy `site.yaml` with the certificate ARN. This attaches the aliases and
   creates the ALIAS records. Allow 5–15 minutes for CloudFront to propagate.

5. Rebuild and deploy every project so canonical tags carry the real domain.

## Cost

At low traffic this sits inside or near the free tier — CloudFront's perpetual
free tier covers 1 TB/month out, and the bucket holds well under a megabyte.
Expect pennies per month. `PriceClass_100` in the template limits edges to North
America and Europe; widen it in `infra/site.yaml` if you need Asia-Pacific
latency.

## Tearing it down

The bucket carries `DeletionPolicy: Retain`, so deleting the stack leaves both
the bucket and its contents behind. That's deliberate — it means a stack mistake
can't wipe every deployed project at once.

```bash
aws cloudformation delete-stack --stack-name portfolio-site
```

To remove the bucket as well, do it explicitly afterwards. Versioning is on, so
`rm --recursive` alone won't empty it; `rb --force` handles versions too:

```bash
aws s3 rb s3://darou-portfolio-657918590662 --force
```

To remove just one project and leave its siblings alone:

```bash
aws s3 rm s3://darou-portfolio-657918590662/name-generators/ --recursive
```
