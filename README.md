# BardBits

Small tools, carefully made — [bardbits.ca](https://bardbits.ca)

A monorepo of static web projects sharing one AWS deployment. Everything is
prerendered HTML on S3 behind CloudFront: no servers, no backend, pennies a
month.

## Projects

| Path | URL |
| --- | --- |
| `projects/site-root` | [bardbits.ca](https://bardbits.ca) — landing page |
| `projects/name-generators-hub` | [/name-generators/](https://bardbits.ca/name-generators/) — generator index |
| `projects/retreat-names` | [/cottage/](https://bardbits.ca/name-generators/cottage/) · [/cabin/](https://bardbits.ca/name-generators/cabin/) · [/beach/](https://bardbits.ca/name-generators/beach/) |

`retreat-names` is a single React app serving three themes that share a design
and a history store. A generator with a different look would be its own project
rather than a fourth theme here.

## Getting started

```bash
npm install
npm run dev     # the app alone, with hot reload
npm run build   # all projects, prerendered
npm run site    # every project staged into one tree, served as the bucket holds it
```

`npm run site` is the one worth knowing about. Each project builds in isolation,
so no single `dist/` can prove that links *between* projects resolve. It
assembles them the way S3 does — including CloudFront's directory-index
behaviour — and serves the result on `localhost:4180`.

## How it fits together

One bucket, one CloudFront distribution, projects separated by key prefix. Adding
a project costs no new infrastructure.

`projects.json` is the single source of truth for where each project deploys and
how much of its prefix it may delete. Three scripts read it, so a project's
prefix cannot drift between being deployed, previewed and indexed.

Two projects can share a prefix — `name-generators-hub` owns
`/name-generators/index.html` while `retreat-names` owns everything else under
it — so delete policy is declared per project rather than assumed.

Pages are prerendered to static HTML: crawlers get real content without running
JavaScript, and the browser hydrates the same markup. Anything affecting layout
must therefore be deterministic across Node and the browser.

Pushing to `main` deploys. GitHub Actions builds every project, publishes them,
and smoke-tests the live domain, authenticating to AWS through OIDC federation —
the account holds no access keys, and nothing is stored in the repository.

See [DEPLOY.md](DEPLOY.md) for deployment, edge routing, caching and DNS.

## Stack

React 18 · Vite · CloudFormation · S3 · CloudFront · Route 53 · ACM
