<#
.SYNOPSIS
  Keeps the Projectory demo alive for a fixed window (default 60 minutes).

.DESCRIPTION
  A Cloudflare quick tunnel lives exactly as long as its process, and the Next
  server can be killed by Windows or by a stray `next dev` run. Both died twice
  during development. This loop checks both every 15 seconds and restarts
  whatever is missing.

  IMPORTANT: if cloudflared is restarted, Cloudflare assigns a DIFFERENT
  hostname, because quick-tunnel hostnames are random per process. The current
  URL is therefore written to .tunnel-url on every check, and the log records
  every change. Read .tunnel-url to get the current link - do not assume an
  earlier one still works.

.PARAMETER Minutes
  How long to keep watching. Defaults to 60.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\watchdog.ps1 -Minutes 60
#>

[CmdletBinding()]
param(
  [int]$Minutes = 60
)

$ErrorActionPreference = 'Continue'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Port        = 3001
$UrlFile     = Join-Path $ProjectRoot '.tunnel-url'
$LogDir      = Join-Path $ProjectRoot '.logs'
$WatchLog    = Join-Path $LogDir 'watchdog.log'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { $npx = (Get-Command npx).Source }

function Say([string]$Message) {
  $line = "{0}  {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message
  Write-Host $line
  # Append-only, and never throw: a locked handle must not kill the watchdog.
  try { Add-Content -Path $WatchLog -Value $line -Encoding utf8 } catch { }
}

function Get-PortOwner {
  (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1).OwningProcess
}

function Get-TunnelUrl {
  foreach ($name in @('tunnel.log', 'tunnel.err.log')) {
    $log = Join-Path $LogDir $name
    if (-not (Test-Path $log)) { continue }
    try {
      foreach ($line in (Get-Content -Path $log -Tail 200 -ErrorAction Stop)) {
        $m = [regex]::Match($line, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($m.Success) { return $m.Value }
      }
    } catch { }
  }
  if (Test-Path $UrlFile) {
    try { return (Get-Content -Path $UrlFile -Raw -ErrorAction Stop).Trim() } catch { }
  }
  return $null
}

function Start-AppServer {
  Say "app server DOWN - restarting on :$Port"
  Start-Process -FilePath $npx `
    -ArgumentList 'next', 'start', '-p', "$Port" `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput (Join-Path $LogDir 'server.log') `
    -RedirectStandardError    (Join-Path $LogDir 'server.err.log') `
    -WindowStyle Hidden | Out-Null
}

function Start-Tunnel {
  # Clear both streams first, or a stale URL from the previous run is read back
  # and reported as though this one had just come up.
  Say 'tunnel DOWN - opening a new quick tunnel'
  Remove-Item (Join-Path $LogDir 'tunnel.log'), (Join-Path $LogDir 'tunnel.err.log') -ErrorAction SilentlyContinue
  Start-Process -FilePath $npx `
    -ArgumentList 'cloudflared', 'tunnel', '--url', "http://localhost:$Port", '--no-autoupdate' `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput (Join-Path $LogDir 'tunnel.log') `
    -RedirectStandardError    (Join-Path $LogDir 'tunnel.err.log') `
    -WindowStyle Hidden | Out-Null
}

Say "watchdog starting - watching for $Minutes minute(s), checking every 15s"
$startUrl = Get-TunnelUrl
if ($startUrl) { Say "current URL: $startUrl" } else { Say 'no URL yet' }

$deadline  = (Get-Date).AddMinutes($Minutes)
$lastUrl   = $startUrl
$restarts  = 0

while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 15

  if (-not (Get-PortOwner)) {
    $restarts++
    Start-AppServer
    # Give it a moment before anything tries to reach it.
    Start-Sleep -Seconds 10
  }

  if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
    $restarts++
    Start-Tunnel
    # cloudflared needs a few seconds to be handed a hostname.
    Start-Sleep -Seconds 12
  }

  $url = Get-TunnelUrl
  if ($url -and $url -ne $lastUrl) {
    $lastUrl = $url
    Set-Content -Path $UrlFile -Value $url -Encoding ascii
    Say "URL CHANGED - the new link is: $url"
  }
}

Say "watchdog finished after $Minutes minute(s). $restarts restart(s)."
Say 'the tunnel is still running; stop it with: Stop-Process -Name cloudflared -Force'