param([ValidateSet('Start', 'Prepare', 'Test', 'Unit', 'Upgrade', 'Dev', 'Preview', 'Build', 'BuildLive', 'Serve', 'Stop')][string]$Mode = 'Start')
$ErrorActionPreference = 'Stop'
$verificationRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $verificationRoot
$verificationEnv = Join-Path $verificationRoot '.env.verification.local'
$verificationCli = 'supabase@2.119.0'

function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}

function Clear-ExternalServices {
  # Defined empty values prevent dotenv and Next from falling back to .env.local.
  foreach ($name in @('SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN','AXIOM_DATASET','AXIOM_TOKEN','RESEND_API_KEY',
    'SENTRY_AUTH_TOKEN','SENTRY_ORG','SENTRY_PROJECT','GOOGLE_CLIENT_SECRET',
    'EMAIL_FROM','CRON_SECRET','DATABASE_URL','DATABASE_URL_ADMIN','DATABASE_URL_TEST',
    'NEXT_PUBLIC_SUPABASE_URL','SEED_ADMIN_EMAIL','SEED_ADMIN_PASSWORD','APP_ROLE_PASSWORD',
    'SHOTS_EMAIL','SHOTS_PASSWORD','OPENAI_API_KEY')) {
    [Environment]::SetEnvironmentVariable($name, '', 'Process')
  }
  $env:CACHE_DISABLED = 'true'
  $env:ALLOW_DEMO_ACCESS = ''
  $env:SEED_HIDE_CREDENTIALS = 'true'
  $env:NEXT_PUBLIC_APP_URL = 'http://localhost:3100'
  $env:NEXT_PUBLIC_ENVIRONMENT = 'development'
  $env:NEXT_DIST_DIR = '.next-verify'
  $env:SESSION_COOKIE_PLATFORM = 'alcassa_verify_platform'
  $env:SESSION_COOKIE_TENANT = 'alcassa_verify_tenant'
  $env:VERIFICATION_ENV_FILE = $verificationEnv
}

function Assert-LocalEnvironment {
  if ($env:NEXT_PUBLIC_SUPABASE_URL -ne 'http://127.0.0.1:55421') { throw 'Verification requires the local API on port 55421.' }
  foreach ($name in @('DATABASE_URL', 'DATABASE_URL_ADMIN')) {
    $value = [Environment]::GetEnvironmentVariable($name, 'Process')
    if ($value -notmatch '^postgresql://[^@]+@127\.0\.0\.1:55422/postgres$') { throw "$name must target the disposable database on port 55422." }
  }
  if ($env:DATABASE_URL -notmatch '^postgresql://alcassa_app:[0-9a-f]{32}@127\.0\.0\.1:55422/postgres$') { throw 'The application connection must use the disposable RLS-bound alcassa_app role.' }
  if ($env:APP_ROLE_PASSWORD -notmatch '^[0-9a-f]{32}$') { throw 'The disposable app role password is invalid.' }
  $env:DATABASE_URL_TEST = $env:DATABASE_URL
}

Clear-ExternalServices
if ($Mode -in @('Preview', 'Build', 'Unit')) {
  # Read-only fixture review. No authentication, data, email or observability service.
  $env:DATABASE_URL = 'postgresql://alcassa_app:preview@127.0.0.1:55422/postgres'
  $env:DATABASE_URL_ADMIN = $env:DATABASE_URL
  $env:DATABASE_URL_TEST = $env:DATABASE_URL
  $env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55421'
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'preview-only-not-a-real-key'
  $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'preview-only-not-a-real-key'
  if ($Mode -eq 'Unit') {
    Invoke-Checked node @('node_modules/vitest/vitest.mjs', 'run', '--exclude', 'tests/isolation/**', '--reporter=default', '--reporter=json', '--outputFile=.test-report/phase-one/non-database.json')
    exit
  }
  if ($Mode -eq 'Build') {
    $env:NEXT_DIST_DIR = '.next-build-verify'
    Invoke-Checked node @('node_modules/next/dist/bin/next', 'build')
    exit
  }
  $env:ALLOW_DEMO_ACCESS = 'true'
  Invoke-Checked node @('node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100')
  exit
}

if ($Mode -in @('Start', 'Stop')) {
  if ($Mode -eq 'Start') {
    $verificationDrive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($verificationRoot))
    if ($verificationDrive.AvailableFreeSpace -lt 6GB) {
      throw 'The minimal local verification stack needs at least 6 GB free on the system/workspace drive. Allow 10 GB for a cold image download, free space and retry Start.'
    }
  }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed. The disposable Supabase stack requires a running local container runtime.' }
  Invoke-Checked docker @('info', '--format', '{{.ServerVersion}}')
  # The CLI's start summary includes keys. Keep it out of terminal output.
  if ($Mode -eq 'Start') {
    # Phase One needs Auth, PostgreSQL, Storage and local email capture.
    # Optional dashboards, telemetry, Edge Functions and Realtime are separate gates.
    & npx --yes $verificationCli start --workdir verification/local --exclude 'realtime,studio,postgres-meta,edge-runtime,logflare,vector,supavisor' 1>$null
  } else {
    & npx --yes $verificationCli stop --workdir verification/local 1>$null
  }
  if ($LASTEXITCODE -ne 0) { throw "Local stack $Mode failed (exit $LASTEXITCODE)." }
  if ($Mode -eq 'Stop') { exit }
  $verificationStatusRaw = & npx --yes $verificationCli status --workdir verification/local --output json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Could not read the local stack status.' }
  $verificationStatus = ($verificationStatusRaw -join "`n") | ConvertFrom-Json
  if ($verificationStatus.API_URL -ne 'http://127.0.0.1:55421') { throw 'Unexpected local stack URL. Refusing to create environment settings.' }
  $verificationPassword = [Guid]::NewGuid().ToString('N')
  $verificationAdminPassword = [Guid]::NewGuid().ToString('N') + '!aA9'
  $verificationValues = [ordered]@{
    NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55421'
    NEXT_PUBLIC_SUPABASE_ANON_KEY = $verificationStatus.ANON_KEY
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $verificationStatus.ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY = $verificationStatus.SERVICE_ROLE_KEY
    SUPABASE_SECRET_KEY = $verificationStatus.SERVICE_ROLE_KEY
    DATABASE_URL = "postgresql://alcassa_app:${verificationPassword}@127.0.0.1:55422/postgres"
    DATABASE_URL_ADMIN = 'postgresql://postgres:postgres@127.0.0.1:55422/postgres'
    APP_ROLE_PASSWORD = $verificationPassword
    SEED_ADMIN_EMAIL = 'operator@verification.local'
    SEED_ADMIN_PASSWORD = $verificationAdminPassword
  }
  foreach ($requiredKey in @('ANON_KEY','SERVICE_ROLE_KEY')) { if (-not $verificationStatus.$requiredKey) { throw "Local stack status is missing $requiredKey." } }
  if (-not (Test-Path -LiteralPath $verificationEnv)) {
    $verificationValues.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" } | Set-Content -LiteralPath $verificationEnv -Encoding utf8
  }
  Write-Output 'Local stack started. Environment saved locally; secrets are not printed.'
  exit
}

if (-not (Test-Path -LiteralPath $verificationEnv)) { throw 'Run Start first to create .env.verification.local.' }
foreach ($line in Get-Content -LiteralPath $verificationEnv) {
  if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
  }
}
Assert-LocalEnvironment
switch ($Mode) {
  'Prepare' {
    foreach ($command in @('db:migrate','db:app-role','db:seed')) { Invoke-Checked pnpm @('run', $command) }
    Invoke-Checked node @('--import', 'tsx', 'scripts/verification-accounts.ts')
  }
  'Test' {
    Invoke-Checked pnpm @('run', 'check:policies')
    Invoke-Checked pnpm @('run', 'test:cache-disabled', '--reporter=default', '--reporter=json', '--outputFile=.test-report/phase-one/cache-disabled.json')
  }
  'Upgrade' { Invoke-Checked node @('--import', 'tsx', 'scripts/verification-upgrade.ts') }
  'Dev' {
    $env:NEXT_DIST_DIR = '.next-local-verify'
    Invoke-Checked node @('node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100')
  }
  'BuildLive' {
    $env:NEXT_DIST_DIR = '.next-live-verify'
    Invoke-Checked node @('node_modules/next/dist/bin/next', 'build')
  }
  'Serve' {
    $env:NEXT_DIST_DIR = '.next-live-verify'
    Invoke-Checked node @('node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100')
  }
}
