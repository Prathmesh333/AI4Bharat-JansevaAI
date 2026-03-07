# JanSeva AI - AWS Deployment Guide

This guide describes how to deploy the JanSeva AI application to AWS using **AWS App Runner** (for the server) and **AWS CDK** (for infrastructure).

## Prerequisites

1. **AWS Account** with administrator access
2. **AWS CLI** installed and configured (`aws configure`)
3. **Node.js 22+**
4. **AWS CDK** installed globally (`npm install -g aws-cdk`)
5. **Gemini API Key** (from Google AI Studio)

## Quick Deployment (Windows/PowerShell)

We have provided a script to automate the build and deployment process:

```powershell
./deploy-aws.ps1
```

This script will:
1. Verify your AWS credentials.
2. Build the TypeScript application and bundle assets into `dist/`.
3. Deploy the CDK stack which provisions:
   - **App Runner Service**: Runs the monolithic Express server.
   - **S3 Bucket**: Stores saved application forms.
   - **DynamoDB Tables**: Manages user sessions and profiles.
   - **IAM Roles**: Grants permissions for Bedrock (Gemini), S3, and DynamoDB.

## Manual Steps

### 1. Configure Environment

Ensure your `.env` file has the necessary keys:
```
GOOGLE_API_KEY=your_gemini_api_key_here
AWS_REGION=ap-south-1
```

### 2. Build the Application

```bash
npm install
npm run build
```

### 3. Deploy Infrastructure

```bash
# Bootstrap CDK if it's your first time in this region
cdk bootstrap

# Deploy the stack
cdk deploy
```

## Post-Deployment

After deployment, CDK will output the **AppRunnerUrl**. Open this URL in your browser to access the live application.

### Configure Gemini Access

App Runner uses the `JanSevaInstanceRole` created by CDK. Ensure your AWS account has access to the models in the **Amazon Bedrock** console (specifically Claude 3.5 Sonnet or the models used by the assistant) if you are using Bedrock. If using Google Generative AI (Gemini), ensure the `GOOGLE_API_KEY` is set in the App Runner environment variables.

## Monitoring

- **Logs**: View application logs in the AWS App Runner console under the "Logs" tab.
- **Metrics**: Monitor CPU and Memory usage in the "Monitoring" tab.

## Troubleshooting

### Build Fails
Ensure you are using Node.js 22 and that `npm run build` completes without errors locally.

### App Runner Deployment Fails
Check the "Service logs" in the App Runner console. Common issues include:
- Incorrect `PORT` (should be 8080).
- Missing environment variables.
- Permission issues with the Instance Role.

## Cleanup

To remove all AWS resources and stop incurring costs:

```bash
cdk destroy
```

⚠️ **Warning**: This will delete the S3 bucket and DynamoDB tables, causing loss of all saved data.
