# BAMA read-only verification. Run from anywhere:  powershell -ExecutionPolicy Bypass -File scripts\verify-all.ps1
# Writes verify-report.txt in the project root. It never prints .env values (only variable NAMES),
# masks database URLs and secret-looking lines, and runs no destructive command
# (no migrate dev/reset, no db push). Attach verify-report.txt to the chat.
$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
$out = Join-Path (Get-Location) 'verify-report.txt'
if (Test-Path $out) { Remove-Item $out }

function Mask([string]$t) {
  $t = $t -replace '(postgres(ql)?://)[^\s"'']+', '$1***'
  $t -replace '(?im)^(.*(SECRET|PASSWORD|API_KEY|ACCESS_KEY|TOKEN)[^=\r\n]*[=:]\s*).*$', '$1***'
}
function Write-Out([string]$t) { Mask $t | Out-File -FilePath $out -Append -Encoding utf8 }
function Run([string]$title, [string]$cmd) {
  Write-Out "`n===== $title ====="
  Write-Out "> $cmd"
  $o = (& cmd /c "$cmd 2>&1") | Out-String
  Write-Out $o
  Write-Out "exit code: $LASTEXITCODE"
}

Run 'node / npm' 'node --version && npm --version'
Run 'project root listing' 'dir /b'
Run 'prisma folder' 'dir /s /b prisma'
Run 'storage folder' 'dir /s /b src\server\storage'
Run 'tsconfig.json' 'type tsconfig.json'
Run 'package.json' 'type package.json'
Run 'file-policy.ts' 'type src\server\storage\file-policy.ts'
Run '.env.example' 'type .env.example'

Write-Out "`n===== .env variable NAMES (values not read) ====="
if (Test-Path '.env') { Get-Content '.env' | Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' } | ForEach-Object { ($_ -split '=')[0].Trim() } | ForEach-Object { Write-Out $_ } } else { Write-Out '(no .env file)' }

Run 'are backup folders in the TypeScript program? (expect no matches)' 'npx tsc --noEmit --listFilesOnly | findstr /i "backup-"'
Run 'typecheck' 'npm run typecheck'
Run 'lint' 'npm run lint'
Run 'unit tests' 'npm test'
Run 'prisma validate' 'npx prisma validate'
Run 'prisma generate' 'npx prisma generate'
Run 'prisma migrate status (read-only)' 'npx prisma migrate status'
Run 'build' 'npm run build'

Write-Host "Done. Report: $out"
