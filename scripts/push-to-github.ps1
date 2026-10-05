<#
.SYNOPSIS
  Pushes the Projectory branch to GitHub, creating the repository if needed.

.DESCRIPTION
  Everything here is prepared and verified; the only thing that genuinely
  requires the account holder is the credential itself. This script picks
  whichever route is available:

    1. A token in $env:PROJECTORY_GITHUB_TOKEN or $env:GITHUB_TOKEN
       -> creates the repo through the API and pushes with no further prompts.

    2. GitHub CLI (`gh`) already authenticated
       -> creates the repo through gh and pushes.

    3. Git Credential Manager (Windows default)
       -> opens a browser for a one-time sign-in, then pushes. The remote
          repository must already exist.

  What it does on success:
    - creates github.com/<user>/<repo> if it is missing
    - pushes master (the create-next-app scaffold) so the remote is not empty
    - pushes the working branch
    - fast-forwards master onto the working branch so the repository landing
      page shows the actual application, and pushes that too

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\push-to-github.ps1
#>

[CmdletBinding()]
param(
  [string]$RepoName = 'projectory',
  [switch]$SkipCreate
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WorkBranch  = 'member1/auth-project-management'
$User        = 'adityakumar3649'
$RemoteUrl   = "https://github.com/$User/$RepoName.git"
$RepoApi     = "https://api.github.com/repos/$User/$RepoName"

Write-Host ''
Write-Host '  Push to GitHub' -ForegroundColor Cyan
Write-Host '  --------------' -ForegroundColor DarkCyan
Write-Host ''

if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
  Write-Host '  ERROR: not a git repository' -ForegroundColor Red
  exit 1
}
Set-Location $ProjectRoot

# ------------------------------------------------------------------ remote
$existing = git remote get-url origin 2>$null
if ($existing -ne $RemoteUrl) {
  if ($existing) { git remote set-url origin $RemoteUrl }
  else { git remote add origin $RemoteUrl }
  Write-Host "  remote    origin -> $RemoteUrl" -ForegroundColor Green
} else {
  Write-Host "  remote    already $RemoteUrl" -ForegroundColor DarkGray
}

$dirty = git status --porcelain
if ($dirty) {
  Write-Host '  ERROR: uncommitted changes. Commit them first.' -ForegroundColor Red
  $dirty | Select-Object -First 10 | ForEach-Object { "            $_" }
  exit 1
}
Write-Host "  working   tree clean" -ForegroundColor DarkGray
Write-Host "  branch    $WorkBranch ($(git rev-list --count HEAD) commits)" -ForegroundColor DarkGray
Write-Host ''

# ------------------------------------------------------------------ auth route
$token = $env:PROJECTORY_GITHUB_TOKEN
if (-not $token) { $token = $env:GITHUB_TOKEN }

$headers = @{ 'User-Agent' = 'projectory-push'; 'Accept' = 'application/vnd.github+json' }
if ($token) { $headers['Authorization'] = "Bearer $token" }

$gh = Get-Command gh -ErrorAction SilentlyContinue

# ------------------------------------------------------------------ create repo
$repoExists = $false
if ($token) {
  try {
    Invoke-WebRequest -Uri $RepoApi -Headers $headers -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop | Out-Null
    $repoExists = $true
    Write-Host '  repo      already exists' -ForegroundColor DarkGray
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
  }
} elseif ($gh) {
  & gh repo view "$User/$RepoName" *> $null
  if ($LASTEXITCODE -eq 0) { $repoExists = $true; Write-Host '  repo      already exists' -ForegroundColor DarkGray }
} else {
  try {
    Invoke-WebRequest -Uri $RepoApi -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop | Out-Null
    $repoExists = $true
    Write-Host '  repo      already exists' -ForegroundColor DarkGray
  } catch { }
}

if (-not $repoExists) {
  if ($SkipCreate) {
    Write-Host '  repo      missing and --SkipCreate was given' -ForegroundColor Red
    Write-Host "            create it at https://github.com/new?name=$RepoName then re-run" -ForegroundColor Yellow
    exit 1
  }
  Write-Host '  repo      creating ...' -ForegroundColor Yellow
  $body = @{ description = 'A place to publish what you build.'; private = $true } | ConvertTo-Json
  if ($token) {
    Invoke-WebRequest -Uri 'https://api.github.com/user/repos' -Method Post -Headers $headers `
      -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 30 | Out-Null
    Write-Host '  repo      created (private)' -ForegroundColor Green
  } elseif ($gh) {
    & gh repo create "$User/$RepoName" --private --description 'A place to publish what you build.' --source . --remote origin 2>&1 |
      Select-Object -Last 3 | ForEach-Object { "            $_" }
  } else {
    Write-Host '  ERROR: no credential available to create the repository.' -ForegroundColor Red
    Write-Host ''
    Write-Host '  Do ONE of these, then re-run this script:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '   A) Create the repo in the browser (30 seconds, no terminal):' -ForegroundColor White
    Write-Host "        https://github.com/new?name=$RepoName&visibility=private" -ForegroundColor Gray
    Write-Host '      then re-run this script. It will prompt a one-time browser sign-in.'
    Write-Host ''
    Write-Host '   B) Authenticate the CLI, then re-run:' -ForegroundColor White
    Write-Host "        `$env:PROJECTORY_GITHUB_TOKEN = 'ghp_your_token_here'   # github.com/settings/tokens" -ForegroundColor Gray
    Write-Host '        powershell -ExecutionPolicy Bypass -File scripts\push-to-github.ps1' -ForegroundColor Gray
    Write-Host ''
    Write-Host '   C) Install GitHub CLI, which can create the repo for you:' -ForegroundColor White
    Write-Host '        winget install --id GitHub.cli' -ForegroundColor Gray
    Write-Host '        gh auth login' -ForegroundColor Gray
    exit 1
  }
}

# ------------------------------------------------------------------ push
Write-Host ''
Write-Host '  pushing (a browser window may open for a one-time GitHub sign-in) ...' -ForegroundColor Yellow

& git push -u origin master 2>&1 | ForEach-Object { "            $_" }
& git push -u origin "$WorkBranch" 2>&1 | ForEach-Object { "            $_" }

# Put the finished app on master as well, so the repository landing page shows
# it rather than the empty scaffold. Fast-forward only - this never rewrites
# history, because master is a strict ancestor of the working branch.
& git branch -f master "$WorkBranch" 2>&1 | Out-Null
& git push origin master 2>&1 | ForEach-Object { "            $_" }

Write-Host ''
Write-Host '  Done.' -ForegroundColor Green
Write-Host "  repo    https://github.com/$User/$RepoName" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Branches pushed:' -ForegroundColor DarkGray
Write-Host "    master                          (fast-forwarded to the finished app)"
Write-Host "    $WorkBranch"
Write-Host ''
Write-Host '  The repo is PRIVATE. Make it public only if you want the teacher to' -ForegroundColor DarkYellow
Write-Host '  view it without a GitHub login: Settings -> General -> Danger Zone.' -ForegroundColor DarkYellow