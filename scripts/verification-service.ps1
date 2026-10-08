param([ValidateSet('Test', 'Serve', 'Bridge')][string]$Mode = 'Test')
$ErrorActionPreference = 'Stop'
$verificationRoot = Split-Path -Parent $PSScriptRoot
$serviceRoot = Join-Path (Split-Path -Parent $verificationRoot) 'aLcassa-service'
Set-Location -LiteralPath $verificationRoot
if (-not (Test-Path -LiteralPath (Join-Path $serviceRoot 'pyproject.toml'))) {
  throw 'Clone the private alcassa-service repository beside aLcassa first.'
}
$verificationEnv = Join-Path $verificationRoot '.env.verification.local'
if (-not (Test-Path -LiteralPath $verificationEnv)) { throw 'Start and prepare the disposable stack first.' }
foreach ($line in Get-Content -LiteralPath $verificationEnv) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
  }
}
if ($env:NEXT_PUBLIC_SUPABASE_URL -ne 'http://127.0.0.1:55421') { throw 'Verification requires the disposable provider.' }
foreach ($name in @('DATABASE_URL', 'DATABASE_URL_ADMIN')) {
  $value = [Environment]::GetEnvironmentVariable($name, 'Process')
  if ($value -notmatch '^postgresql://[^@]+@127\.0\.0\.1:55422/postgres$') { throw 'Verification requires the disposable database.' }
}
if ($env:DATABASE_URL -notmatch '^postgresql://alcassa_app:[^@]+@127\.0\.0\.1:55422/postgres$') { throw 'Use the restricted local application role.' }
foreach ($name in @('RESEND_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','AXIOM_TOKEN','AXIOM_DATASET','SENTRY_DSN','NEXT_PUBLIC_SENTRY_DSN','SENTRY_AUTH_TOKEN','GOOGLE_CLIENT_SECRET','OPENAI_API_KEY','EMAIL_FROM','CRON_SECRET')) {
  [Environment]::SetEnvironmentVariable($name, '', 'Process')
}
$env:CACHE_DISABLED = 'true'
$env:ALLOW_DEMO_ACCESS = ''
$env:VERIFICATION_ENV_FILE = $verificationEnv
$env:DATABASE_URL_TEST = $env:DATABASE_URL
$env:SERVICE_DATABASE_URL = $env:DATABASE_URL
$env:SERVICE_DATABASE_URL_ADMIN = ''
$env:VERIFICATION_SERVICE_URL = 'http://127.0.0.1:8100'
if ($Mode -eq 'Bridge') {
  & node --conditions=react-server --import tsx scripts/verification-service-contract.ts
} else {
  if ($Mode -eq 'Test') { $env:SERVICE_DATABASE_URL_ADMIN = $env:DATABASE_URL_ADMIN }
  # The runtime receives no administrative connection; only the test fixture may use it.
  $env:DATABASE_URL_ADMIN = ''
  Set-Location -LiteralPath $serviceRoot
  if ($Mode -eq 'Serve') {
    & uv run uvicorn alcassa_service.main:app --host 127.0.0.1 --port 8100 --no-access-log
  } else {
    & uv run pytest -q --junitxml=.test-report/service-contract.xml
  }
}
if ($LASTEXITCODE -ne 0) { throw "Service verification failed (exit $LASTEXITCODE)." }
