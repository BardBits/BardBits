<#
.SYNOPSIS
  Build one project and publish it to its own key prefix in the shared bucket.

.DESCRIPTION
  Every project in this monorepo deploys into one S3 bucket behind one
  CloudFront distribution, separated by key prefix. Which prefix a project owns,
  and how much of that prefix it is allowed to delete, is declared once in
  $PROJECTS below rather than passed in per invocation — a wrong prefix on the
  command line would delete a sibling project's files.

.EXAMPLE
  ./scripts/deploy-project.ps1 -Project retreat-names -Bucket <site-bucket> -DistributionId E3RJMPASAQD8EC
#>
param(
  # Deliberately no ValidateSet. One used to list the project names here, which
  # made this a third place a new project had to be registered - after
  # projects.json and deploy.yml - and the only one that was not obvious from
  # any of the others. It also fired before the manifest lookup below, so a
  # project that was correctly declared and correctly deployed still failed here
  # with an error about a set nobody knew existed. The lookup rejects an unknown
  # name on its own, using the manifest as the single source of truth.
  [Parameter(Mandatory = $true)]
  [string]$Project,

  [Parameter(Mandatory = $true)][string]$Bucket,
  [Parameter(Mandatory = $true)][string]$DistributionId,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

# Read from projects.json rather than restated here, so the prefix a project
# deploys to cannot drift from the one it is previewed and indexed under. Only
# retreat-names prunes: site-root sits at the bucket root that every other
# project lives underneath, and name-generators-hub shares its prefix with
# retreat-names, so a --delete from either would wipe the other out.
$manifest = Get-Content (Join-Path $root "projects.json") -Raw | ConvertFrom-Json

try {
  $cfg = $manifest.projects | Where-Object { $_.name -eq $Project }
  if (-not $cfg) { throw "Project '$Project' is not in projects.json." }
  $prefix = $cfg.prefix
  $dest = if ($prefix) { "s3://$Bucket/$prefix" } else { "s3://$Bucket" }

  # Belt and braces over the manifest: a project mounted at the bucket root can
  # never prune, whatever projects.json claims, because the blast radius is
  # every project on the site.
  $prune = $cfg.prune -and $prefix -ne ""
  if ($cfg.prune -and -not $prune) {
    Write-Host "==> Ignoring prune for $Project - it is mounted at the bucket root." -ForegroundColor Yellow
  }

  # More than one project can mount at the same prefix - the generators hub and
  # retreat-names both sit at name-generators/, and boat-names sits beneath it.
  # A --delete against the whole prefix reaches whatever a co-tenant owns: the
  # asset pass excludes only *.html, *.xml and robots.txt, and the page pass
  # matches *.html at every depth, so both a co-tenant's fingerprinted assets
  # and its nested pages are in range. So a project sharing its prefix must name
  # the subpaths it may delete.
  #
  # Resolved here, before anything is uploaded: a misconfigured project should
  # fail having changed nothing, not half way through.
  $sharers = @($manifest.projects | Where-Object { $_.name -ne $Project -and $_.prefix -eq $prefix })
  $scope = @($cfg.pruneScope | Where-Object { $_ })
  if ($prune -and $sharers.Count -gt 0 -and $scope.Count -eq 0) {
    throw ("Project '$Project' prunes '$prefix', which it shares with: " +
           ($sharers.name -join ", ") + ". Declare pruneScope in projects.json " +
           "listing only the subpaths '$Project' owns, or set prune to false.")
  }
  foreach ($path in $scope) {
    $full = Join-Path $cfg.source $path
    if (-not (Test-Path $full)) { throw "pruneScope names '$full', which does not exist after the build." }
  }

  if ($cfg.workspace -and -not $SkipBuild) {
    Write-Host "==> Building $Project..." -ForegroundColor Cyan
    npm run build --workspace $cfg.workspace
    if ($LASTEXITCODE -ne 0) { throw "Build failed; nothing was uploaded." }
  }

  if (-not (Test-Path $cfg.source)) { throw "Source '$($cfg.source)' not found. Build first, or drop -SkipBuild." }

  # Every filter below uses the --option=value form rather than two arguments.
  # PowerShell on Linux glob-expands a bare "*" against the working directory
  # before the AWS CLI ever sees it, so `--exclude "*"` arrived as the repo's
  # file listing and the CLI rejected it. Windows does not do this, so it only
  # appeared once deploys moved to a Linux runner. Keeping the wildcard glued to
  # its option name leaves nothing that looks like a bare glob to expand.

  # Vite fingerprints asset filenames (index-BnxbtRNF.js), so a given URL's
  # contents never change: cache them for a year. Sitemaps are excluded
  # wholesale: they keep stable URLs and change often, so a year-long immutable
  # cache would strand crawlers on a stale copy.
  #
  # Deliberately additive - no --delete here. Pruning in this pass would remove
  # the assets the *currently live* HTML still points at, before the new HTML
  # replacing it has been uploaded. A failure between the two passes then leaves
  # the site referencing objects that no longer exist; that is exactly what
  # happened on the first CI run. Stale assets are pruned after the HTML lands.
  Write-Host "==> Uploading fingerprinted assets..." -ForegroundColor Cyan
  aws s3 sync $cfg.source $dest `
    "--exclude=*.html" "--exclude=*.xml" "--exclude=robots.txt" `
    --cache-control "public,max-age=31536000,immutable"
  if ($LASTEXITCODE -ne 0) { throw "Asset sync failed." }

  # Every page keeps a stable URL across deploys, so all HTML must revalidate.
  # Note the filter is "*.html", not "index.html" — the latter matches only the
  # prefix root, missing the nested cottage/, cabin/ and beach/ pages and
  # caching them for a year. That same narrowness is what makes it usable as the
  # protectRootIndex exclusion below.
  # A scoped project's deletions are deferred to per-subpath passes below.
  # "--include=*.html" matches at every depth, so a --delete here would remove a
  # co-tenant's nested pages: protectRootIndex guards only <prefix>/index.html,
  # which is exactly why /name-generators/boat/funny/index.html would not be
  # covered. Verified with a probe object and a dry run, not assumed.
  Write-Host "==> Uploading pages..." -ForegroundColor Cyan
  $htmlFilter = @("--exclude=*", "--include=*.html")
  if ($cfg.protectRootIndex) { $htmlFilter += "--exclude=index.html" }
  $htmlMeta = @("--cache-control", "no-cache", "--content-type", "text/html; charset=utf-8")

  $htmlArgs = @("s3", "sync", $cfg.source, $dest) + $htmlFilter
  if ($prune -and $scope.Count -eq 0) { $htmlArgs += "--delete" }
  $htmlArgs += $htmlMeta
  aws @htmlArgs
  if ($LASTEXITCODE -ne 0) { throw "Page upload failed." }

  # Superseded pages, removed one owned subpath at a time. The destination bounds
  # each --delete, so it cannot reach a sibling project whatever the filters do.
  if ($prune -and $scope.Count -gt 0) {
    Write-Host "    removing superseded pages under: $($scope -join ', ')" -ForegroundColor DarkGray
    foreach ($path in $scope) {
      $pageArgs = @("s3", "sync", (Join-Path $cfg.source $path), "$dest/$path", "--delete") +
                  @("--exclude=*", "--include=*.html") + $htmlMeta
      aws @pageArgs
      if ($LASTEXITCODE -ne 0) { throw "Page prune failed for '$dest/$path'." }
    }
  }

  # Now that the new HTML is live and points only at assets already uploaded,
  # the superseded ones can go. Running this last means an interrupted deploy
  # leaves orphaned assets - wasted bytes - rather than a broken page.
  if ($prune) {
    Write-Host "==> Pruning superseded assets..." -ForegroundColor Cyan

    # A scoped prune runs one sync per owned subpath, against that subpath as
    # its own destination. Deliberately NOT one sync with --include filters:
    # that would make correctness depend on AWS filter precedence, where the
    # last match wins and an --include placed after --exclude=*.html silently
    # re-includes pages and re-uploads them with the year-long immutable cache
    # this pass applies. Here the destination bounds the blast radius, so a
    # --delete cannot reach outside the subtree whatever the filters say.
    $targets = if ($scope.Count -gt 0) {
      $scope | ForEach-Object { @{ From = (Join-Path $cfg.source $_); To = "$dest/$_" } }
    } else {
      @(@{ From = $cfg.source; To = $dest })
    }
    if ($scope.Count -gt 0) {
      Write-Host "    limited to: $($scope -join ', ')" -ForegroundColor DarkGray
    }

    foreach ($t in $targets) {
      # A declared subpath that the build did not produce means the manifest and
      # the build disagree. Syncing an empty directory with --delete would empty
      # the live one, so stop instead.
      if (-not (Test-Path $t.From)) {
        throw "pruneScope names '$($t.From)', which does not exist after the build."
      }
      aws s3 sync $t.From $t.To --delete `
        "--exclude=*.html" "--exclude=*.xml" "--exclude=robots.txt" `
        --cache-control "public,max-age=31536000,immutable"
      if ($LASTEXITCODE -ne 0) { throw "Asset prune failed for '$($t.To)'." }
    }
  }

  # A sitemap may live at any path, so each ships with the project it describes;
  # the root project additionally carries the sitemap index and pages.xml.
  # robots.txt is different — crawlers only read it from the origin root, so it
  # belongs to whichever project is mounted there. Both take a short cache.
  $extras = @(Get-ChildItem $cfg.source -File -Filter "*.xml" | ForEach-Object {
      @{ Name = $_.Name; Type = "application/xml" }
    })
  if (Test-Path (Join-Path $cfg.source "robots.txt")) {
    $extras += @{ Name = "robots.txt"; Type = "text/plain; charset=utf-8" }
  }

  foreach ($extra in $extras) {
    Write-Host "==> Uploading $($extra.Name)..." -ForegroundColor Cyan
    aws s3 cp (Join-Path $cfg.source $extra.Name) "$dest/$($extra.Name)" `
      --cache-control "public,max-age=3600" --content-type $extra.Type
    if ($LASTEXITCODE -ne 0) { throw "$($extra.Name) upload failed." }
  }

  # One wildcard path is billed as a single invalidation.
  $invalidation = if ($prefix) { "/$prefix/*" } else { "/*" }
  Write-Host "==> Invalidating $invalidation..." -ForegroundColor Cyan
  aws cloudfront create-invalidation --distribution-id $DistributionId --paths $invalidation | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Invalidation failed." }

  $shown = if ($prefix) { "/$prefix/" } else { "/" }
  Write-Host "==> Deployed $Project to $shown" -ForegroundColor Green
}
finally {
  Pop-Location
}
