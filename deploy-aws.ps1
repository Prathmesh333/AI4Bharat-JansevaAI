# JanSeva AI - AWS Deployment Script (PowerShell)
# This script builds the application and deploys it using AWS CDK.

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 JanSeva AI - Starting AWS Deployment..." -ForegroundColor Cyan
Write-Host "=".repeat(60)

# 1. Check Prerequisites
Write-Host "`n🔍 Checking prerequisites..." -ForegroundColor Yellow
if (!(Get-Command "node" -ErrorAction SilentlyContinue)) { throw "Node.js is not installed." }
if (!(Get-Command "npm" -ErrorAction SilentlyContinue)) { throw "npm is not installed." }
if (!(Get-Command "aws" -ErrorAction SilentlyContinue)) { throw "AWS CLI is not installed." }
if (!(Get-Command "cdk" -ErrorAction SilentlyContinue)) { throw "CDK is not installed. Run 'npm install -g aws-cdk'" }

# 2. Check AWS Identity
Write-Host "`n👤 Verifying AWS identity..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
Write-Host "Connected as: $($identity.Arn)" -ForegroundColor Green

# 3. Build the Application
Write-Host "`n🏗️ Building the application (monolithic)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed." }
Write-Host "Build successful! Assets copied to dist/." -ForegroundColor Green

# 4. CDK Bootstrap (Optional/First time)
Write-Host "`n☁️ Bootstrapping CDK (if needed)..." -ForegroundColor Yellow
# We'll skip this if already bootstrapped, but safe to run again
# npx cdk bootstrap

# 5. Deploy Stack
Write-Host "`n🚀 Deploying to AWS App Runner..." -ForegroundColor Yellow
npx cdk deploy --all --require-approval never
if ($LASTEXITCODE -ne 0) { throw "CDK Deployment failed." }

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "=".repeat(60)
Write-Host "`nYou can find your App Runner URL in the CDK Outputs above." -ForegroundColor Cyan
Write-Host "Note: It may take 5-10 minutes for App Runner to fully provision." -ForegroundColor White
Write-Host "`nJanSeva AI is now live on AWS!" -ForegroundColor Green
