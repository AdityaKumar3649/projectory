<#
.SYNOPSIS
  Starts (or restarts) the Projectory demo: the production server plus a
  Cloudflare quick tunnel, then prints the public URL.

.DESCRIPTION
  Both processes are launched DETACHED from this script. That is deliberate:
  a process started normally from a shell is killed when that shell's job
  object is cleaned up, which is why the demo kept dying between sessions.
  Start-Process with -WindowStyle Hidden gives each one its own lifetime, so
  closing this window leaves the site up.

  A quick tunnel is assigned a RANDOM hostname every time it starts, so the URL
  changes on every run. The current one is also written to .tunnel-url so it can
  be read back without parsing logs.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\serve.ps1
#>

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Port        = 3001
$UrlFile     = Join-Path $ProjectRoot '.tunnel-url'

# Logs live beside the project rather than in %TEMP%. The temp directory proved
# volatile on this machine - the whole log folder disappeared between two runs -
# and a script whose logs vanish cannot tell a running tunnel from a dead one.
$LogDir      = Join-Path $ProjectRoot '.logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { $npx = (Get-Command npx).Source }

function Get-PortOwner([int]$Port) {
  (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1).OwningProcess
}

function Get-TunnelUrl {
  # cloudflared prints its assigned hostname to STDERR, so both streams have to
  # be scanned - reading only stdout finds nothing and looks like a hang.
  foreach ($name in @('tunnel.log', 'tunnel.err.log')) {
    $log = Join-Path $LogDir $name
    if (-not (Test-Path $log)) { continue }
    try {
      # Read line-by-line. The redirect holds an exclusive lock, so slurping the
      # whole file with ReadAllText throws while the process is alive.
      foreach ($line in (Get-Content -Path $log -Tail 200 -ErrorAction Stop)) {
        $m = [regex]::Match($line, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($m.Success) { return $m.Value }
      }
    } catch { }
  }
  # Last resort: a URL recorded by an earlier run that may still be up.
  if (Test-Path $UrlFile) {
    try { return (Get-Content -Path $UrlFile -Raw -ErrorAction Stop).Trim() } catch { }
  }
  return $null
}

Write-Host ''
Write-Host '  Projectory - local demo' -ForegroundColor Cyan
Write-Host '  -----------------------' -ForegroundColor DarkCyan
Write-Host ''

# ---------------------------------------------------------------- app server
$owner = Get-PortOwner $Port
if ($owner) {
  Write-Host "  server    already listening on :$Port (PID $owner)" -ForegroundColor Green
} else {
  Write-Host "  server    starting on :$Port ..." -ForegroundColor Yellow
  Start-Process -FilePath $npx `
    -ArgumentList 'next', 'start', '-p', "$Port" `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput (Join-Path $LogDir 'server.log') `
    -RedirectStandardError    (Join-Path $LogDir 'server.err.log') `
    -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    $owner = Get-PortOwner $Port
    if ($owner) { break }
    Start-Sleep -Milliseconds 700
  }
  if ($owner) {
    Write-Host "  server    up (PID $owner)" -ForegroundColor Green
  } else {
    Write-Host '  server    FAILED to start - see server.err.log' -ForegroundColor Red
    exit 1
  }
}

# ---------------------------------------------------------------- tunnel
if (Get-Process cloudflared -ErrorAction SilentlyContinue) {
  $existing = Get-TunnelUrl
  Write-Host '  tunnel    already running' -ForegroundColor Green
  if ($existing) { Write-Host "            $existing" -ForegroundColor Cyan }
} else {
  Write-Host '  tunnel    opening a quick tunnel ...' -ForegroundColor Yellow
  # Clear both streams first, otherwise a URL from the previous run is read back
  # and reported as though this one had just come up.
  Remove-Item (Join-Path $LogDir 'tunnel.log'), (Join-Path $LogDir 'tunnel.err.log') -ErrorAction SilentlyContinue

  Start-Process -FilePath $npx `
    -ArgumentList 'cloudflared', 'tunnel', '--url', "http://localhost:$Port", '--no-autoupdate' `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput (Join-Path $LogDir 'tunnel.log') `
    -RedirectStandardError    (Join-Path $LogDir 'tunnel.err.log') `
    -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds(90)
  $url = $null
  while ((Get-Date) -lt $deadline) {
    $url = Get-TunnelUrl
    if ($url) { break }
    Start-Sleep -Milliseconds 800
  }
  if (-not $url) {
    Write-Host '  tunnel    FAILED to report a URL - see tunnel.err.log' -ForegroundColor Red
    exit 1
  }
  Write-Host '  tunnel    up' -ForegroundColor Green
}

$url = Get-TunnelUrl
if ($url) { Set-Content -Path $UrlFile -Value $url -Encoding ascii }

Write-Host ''
if ($url) {
  Write-Host '  PUBLIC URL' -ForegroundColor Cyan
  Write-Host "  $url" -ForegroundColor White
  Write-Host ''
  Write-Host '  login: demo@projectory.app / projectory' -ForegroundColor DarkGray
  Write-Host '  local: http://localhost:3001' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host '  The link stops working when this machine sleeps or shuts down.' -ForegroundColor DarkYellow
  Write-Host '  Run this script again to get a fresh link.' -ForegroundColor DarkYellow
}
Write-Host ''