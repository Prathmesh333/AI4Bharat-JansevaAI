# JanSeva AI

JanSeva AI is an Express + TypeScript web app for discovering Indian government schemes, checking eligibility, browsing scheme details, using conversational AI, and generating printable pre-filled application summaries.

The app serves both the frontend and backend from the same server. That is the recommended deployment model on AWS because it avoids browser CORS issues entirely.

## Stack

- Frontend: static HTML/CSS/JS in `server/public`
- Backend: Express server in `server/index.ts`
- Data: CSV-backed scheme dataset in `dataset/updated_data.csv`
- AI: Google Gemini (`GEMINI_API_KEY`)
- Optional maps enrichment: Google Maps Places (`GOOGLE_MAPS_API_KEY`)
- Optional saved-form persistence on AWS: S3 (`FORMS_BUCKET`)

## What was fixed for AWS readiness

- Frontend API calls now use relative URLs instead of `http://localhost:3000`
- Server port is configurable through `PORT`
- Static assets are served using absolute runtime-safe paths
- CORS can be restricted with `CORS_ORIGINS` when needed
- Production build now compiles the actual server code and copies static assets/dataset into `dist/`
- Saved forms can persist in S3 instead of relying on local disk

## Local development

### Prerequisites

- Node.js 22 or newer
- npm

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` and set at least:

```env
GEMINI_API_KEY=your-gemini-api-key
```

Optional:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
FORMS_BUCKET=your-s3-bucket-for-saved-forms
SAVED_FORMS_KEY=saved-forms/forms.json
CORS_ORIGINS=http://localhost:3000
```

### Run locally

```bash
npm start
```

Open:

- `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## Production build

Build the deployable app:

```bash
npm run build
```

Run the compiled server:

```bash
npm run start:prod
```

The production server reads:

- `dist/server/index.js`
- `dist/server/public/*`
- `dist/dataset/updated_data.csv`

## AWS deployment recommendation

Use AWS App Runner from GitHub source.

Reason:

- one service hosts both UI and API
- same-origin requests mean no CORS problems by default
- no separate S3 frontend + API Gateway + ALB coordination is required for this app
- `apprunner.yaml` is already included in the repo

## Deploy to AWS App Runner

### 1. Push the repo to GitHub

The remote already points to:

```text
https://github.com/Prathmesh333/AI4Bharat-JansevaAI.git
```

If you want to push the current branch manually:

```bash
git add .
git commit -m "Prepare JanSeva AI for AWS App Runner deployment"
git push origin main
```

### 2. Create AWS resources

Minimum:

- 1 S3 bucket for saved forms if you want saved forms to persist across restarts

Example bucket name:

```text
janseva-ai-forms-prod
```

### 3. Create an IAM role for App Runner

If you set `FORMS_BUCKET`, attach an instance role with at least:

- `s3:GetObject`
- `s3:PutObject`
- `s3:ListBucket`

Scope it to:

- the bucket itself
- the `saved-forms/*` prefix

### 4. Create the App Runner service

In AWS Console:

1. Open App Runner
2. Create service
3. Source: `Source code repository`
4. Provider: `GitHub`
5. Select this repository and branch
6. Deployment settings: `Automatic` or `Manual`
7. Configuration source: `Use configuration file`

The repo contains [apprunner.yaml](/d:/Hackathon/AI4Bharat/apprunner.yaml), which tells App Runner to:

- run `npm ci`
- build with `npm run build`
- start with `npm run start:prod`
- listen on port `8080`

### 5. Set App Runner environment variables

Required:

```text
AWS_REGION=ap-south-1
GEMINI_API_KEY=...
```

Optional but recommended:

```text
GOOGLE_MAPS_API_KEY=...
FORMS_BUCKET=janseva-ai-forms-prod
SAVED_FORMS_KEY=saved-forms/forms.json
```

Only set `CORS_ORIGINS` if you intentionally split the frontend and backend across different domains.

For a single App Runner service, leave `CORS_ORIGINS` unset.

### 6. Add a custom domain

After the first successful deploy:

1. Open the App Runner service
2. Go to `Custom domains`
3. Add your domain
4. Create the DNS records AWS gives you

## CORS behavior

If you deploy the app as a single App Runner service:

- frontend pages and API share the same origin
- browser CORS preflight is not part of the normal flow
- relative fetches like `/api/session` and `/api/message` work directly

If you later split frontend and backend across domains:

- set `CORS_ORIGINS=https://your-frontend-domain.com`
- do not use `*` if credentials or tighter origin control matter

## Notes about persistence

Without `FORMS_BUCKET`:

- saved forms use local JSON storage
- this is acceptable for local development
- on App Runner, local storage is ephemeral and not reliable across restarts or scaling events

With `FORMS_BUCKET`:

- saved forms are stored in S3
- the feature remains usable on AWS

## Files relevant to deployment

- [server/index.ts](/d:/Hackathon/AI4Bharat/server/index.ts)
- [server/formStorage.ts](/d:/Hackathon/AI4Bharat/server/formStorage.ts)
- [package.json](/d:/Hackathon/AI4Bharat/package.json)
- [tsconfig.app.json](/d:/Hackathon/AI4Bharat/tsconfig.app.json)
- [scripts/copy-runtime-assets.js](/d:/Hackathon/AI4Bharat/scripts/copy-runtime-assets.js)
- [apprunner.yaml](/d:/Hackathon/AI4Bharat/apprunner.yaml)
- [.env.example](/d:/Hackathon/AI4Bharat/.env.example)

## Current limitation

The old CDK infrastructure under `infrastructure/` does not deploy this current Express app. It provisions partial AWS resources from an earlier architecture. For this codebase, App Runner is the deploy path that matches the running application.

## AWS references

- AWS App Runner config file reference: https://docs.aws.amazon.com/apprunner/latest/dg/config-file-ref.html
- AWS App Runner config examples: https://docs.aws.amazon.com/apprunner/latest/dg/config-file-examples.html
- AWS App Runner source code services: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code.html
