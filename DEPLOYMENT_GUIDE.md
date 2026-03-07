# JanSeva AI - AWS Deployment Guide

Complete guide for deploying JanSeva AI to AWS using serverless architecture.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment](#post-deployment)
5. [Testing](#testing)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **Node.js 18+** and npm
- **AWS CLI v2** ([Install](https://aws.amazon.com/cli/))
- **AWS CDK v2** (`npm install -g aws-cdk`)
- **Git**

### AWS Account Setup
1. AWS Account with admin access
2. AWS CLI configured: `aws configure`
3. Region: **ap-south-2** (Hyderabad, India)

### API Keys
- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Architecture Overview

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ HTTPS
       ▼
┌──────────────────────┐
│   CloudFront (CDN)   │ ← HTTPS/SSL, Global CDN
│   + S3 Website       │ ← Static files
└──────────┬───────────┘
           │ POST /api/*
           ▼
┌──────────────────────┐
│   API Gateway        │ ← REST API
│   + Lambda           │ ← Node.js 22.x, 120s timeout
└──────────┬───────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐  ┌──────────┐  ┌────────┐
│ Gemini │  │ DynamoDB │  │   S3   │
│   AI   │  │ Sessions │  │ Forms  │
└────────┘  └──────────┘  └────────┘
```

### Why These AWS Services?

| Service | Purpose | Why? |
|---------|---------|------|
| **CloudFront** | CDN + HTTPS | • Required for microphone access<br>• Global performance<br>• DDoS protection<br>• Free SSL certificate |
| **S3** | Static hosting | • 99.999999999% durability<br>• Cost-effective ($0.023/GB)<br>• Versioning support |
| **API Gateway** | REST API | • Serverless<br>• Auto-scaling<br>• Built-in CORS<br>• $3.50 per million requests |
| **Lambda** | Compute | • No server management<br>• Auto-scaling<br>• Pay per use<br>• 120s timeout for AI calls |
| **DynamoDB** | Database | • Serverless NoSQL<br>• Single-digit ms latency<br>• Auto-scaling<br>• TTL for cleanup |
| **Gemini AI** | Conversational AI | • Multilingual (6 Indian languages)<br>• Fast (2-5s response)<br>• Cost-effective<br>• 1M token context |

---

## Deployment Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/Prathmesh333/AI4Bharat-JansevaAI.git
cd AI4Bharat-JansevaAI
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install CDK dependencies
cd infrastructure
npm install
cd ..
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

Add your Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
AWS_REGION=ap-south-2
```

### Step 4: Bootstrap AWS CDK (First Time Only)

```bash
# Bootstrap CDK in your AWS account
cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-2

# This creates:
# - CDK staging bucket
# - IAM roles for deployments
# - CloudFormation stack
```

### Step 5: Build Lambda Package

```bash
# Bundle Lambda code with dependencies
node scripts/bundle-lambda.js

# Output: dist-lambda/ directory with:
# - Compiled TypeScript code
# - node_modules
# - dataset/updated_data.csv (3,400 schemes)
```

### Step 6: Deploy Infrastructure

```bash
# Deploy all AWS resources
cdk deploy --require-approval never

# Deployment time: ~15 minutes (CloudFront takes 10-15 min)
```

**What gets created:**
- ✅ CloudFront Distribution (HTTPS)
- ✅ S3 Buckets (Website, Forms, Docs)
- ✅ Lambda Function (Node.js 22.x, 1GB RAM, 120s timeout)
- ✅ API Gateway (REST API)
- ✅ DynamoDB Tables (Sessions, Profiles)
- ✅ IAM Roles and Policies

### Step 7: Note Deployment URLs

After deployment completes, you'll see:

```
Outputs:
JanSevaStack.WebsiteUrl = https://d2xlnq3yj86lrz.cloudfront.net
JanSevaStack.ApiUrl = https://zz3f5dt1ee.execute-api.ap-south-2.amazonaws.com/prod/
JanSevaStack.CloudFrontDistributionId = E1Q0GCT5UGNQR5
JanSevaStack.FormsBucketName = janseva-forms-868784310681
```

**Save these URLs!** You'll need them for configuration and testing.

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Test API health
curl https://YOUR_API_URL/prod/api/health

# Expected response:
# {"status":"ok","schemesLoaded":3400,"categories":19}
```

### 2. Test Frontend

Open CloudFront URL in browser:
```
https://d2xlnq3yj86lrz.cloudfront.net
```

Verify:
- ✅ Homepage loads
- ✅ Browse categories works
- ✅ Search schemes works
- ✅ Chat modal opens
- ✅ Microphone icon appears (HTTPS required)

### 3. Update Frontend (If Needed)

If API URLs need updating:

```bash
# Edit server/public/index.html
# Update API_BASE_URL constant
const API_BASE_URL = 'https://YOUR_API_GATEWAY_URL/prod';

# Upload to S3
aws s3 sync server/public/ s3://janseva-website-YOUR_ACCOUNT_ID/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Testing

### 1. Test API Endpoints

```bash
# Health check
curl https://YOUR_API_URL/prod/api/health

# Get schemes
curl "https://YOUR_API_URL/prod/api/schemes?page=1&pageSize=5"

# Get categories
curl https://YOUR_API_URL/prod/api/schemes/categories
```

### 2. Test Chat Flow

```bash
# Create session
SESSION_ID=$(curl -X POST https://YOUR_API_URL/prod/api/session \
  -H "Content-Type: application/json" \
  -d '{"language":"en"}' | jq -r '.data.sessionId')

echo "Session ID: $SESSION_ID"

# Send message
curl -X POST https://YOUR_API_URL/prod/api/message \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"I am a farmer from Maharashtra\"
  }"
```

### 3. Test Form Generation

```bash
# Generate form with user data
curl "https://YOUR_API_URL/prod/api/schemes/form/print/pm-kisan?full_name=Test&state=Maharashtra&mobile_number=9876543210" \
  > test-form.html

# Open in browser
open test-form.html
```

---

## Monitoring

### CloudWatch Logs

```bash
# View Lambda logs (real-time)
aws logs tail /aws/lambda/JanSevaStack-JanSevaApiFunction --follow

# View last 100 lines
aws logs tail /aws/lambda/JanSevaStack-JanSevaApiFunction --since 1h
```

### CloudWatch Metrics

Access metrics in AWS Console:
- **Lambda**: Invocations, Duration, Errors, Throttles
- **API Gateway**: Request count, Latency, 4XX/5XX errors
- **CloudFront**: Requests, Bytes, Cache hit ratio
- **DynamoDB**: Read/Write capacity, Throttles

### Set Up Alarms

```bash
# Lambda error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name JanSeva-Lambda-Errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=JanSevaStack-JanSevaApiFunction

# API Gateway 5XX alarm
aws cloudwatch put-metric-alarm \
  --alarm-name JanSeva-API-5XX \
  --alarm-description "Alert on API 5XX errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

## Updating Deployment

### Update Frontend Only

```bash
# 1. Make changes to HTML/CSS/JS files in server/public/

# 2. Upload to S3
aws s3 sync server/public/ s3://janseva-website-YOUR_ACCOUNT_ID/

# 3. Invalidate CloudFront cache (required!)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

# Cache invalidation takes 1-2 minutes
```

### Update Backend Only

```bash
# 1. Make changes to Lambda code (lambda-handler.ts, src/*, server/*)

# 2. Rebuild Lambda package
node scripts/bundle-lambda.js

# 3. Deploy
cdk deploy --require-approval never

# Deployment time: ~2 minutes
```

### Update Infrastructure

```bash
# 1. Make changes to infrastructure/lib/janseva-stack.ts

# 2. Deploy
cdk deploy --require-approval never

# Note: Some changes may require resource replacement
```

---

## Troubleshooting

### Issue: CloudFront deployment takes too long

**Cause**: CloudFront distributions take 10-15 minutes to deploy globally.

**Solution**: Wait patiently. Check status:
```bash
aws cloudformation describe-stacks \
  --stack-name JanSevaStack \
  --query "Stacks[0].StackStatus"
```

### Issue: Lambda timeout errors (504 Gateway Timeout)

**Cause**: Gemini API calls can take 5-30 seconds.

**Solution**: Lambda timeout is set to 120s. If still timing out:
```typescript
// infrastructure/lib/janseva-stack.ts
timeout: cdk.Duration.seconds(180), // Increase to 180s
```

### Issue: CORS errors in browser

**Cause**: CloudFront domain not in CORS whitelist.

**Solution**: Update `lambda-handler.ts`:
```typescript
app.use(cors({
  origin: [
    'https://d2xlnq3yj86lrz.cloudfront.net', // Add your CloudFront URL
    'http://localhost:3000',
  ],
  credentials: true,
}));
```

Redeploy:
```bash
node scripts/bundle-lambda.js
cdk deploy --require-approval never
```

### Issue: Gemini API quota exceeded

**Cause**: Free tier limit: 15 requests/minute.

**Solution**: 
1. Check quota: https://makersuite.google.com/app/apikey
2. Upgrade to paid tier if needed
3. Implement rate limiting in Lambda

### Issue: DynamoDB throttling

**Cause**: Sudden traffic spike.

**Solution**: DynamoDB is on-demand mode (auto-scales). If persistent:
```typescript
// infrastructure/lib/janseva-stack.ts
billingMode: dynamodb.BillingMode.PROVISIONED,
readCapacity: 10,
writeCapacity: 10,
autoScaling: { /* configure */ }
```

### Issue: "Scheme not found" in chat

**Cause**: Scheme name doesn't match exactly in search.

**Solution**: Already fixed in latest deployment. Scheme matching uses fuzzy search and extracts scheme names from quotes.

### Issue: Microphone not working

**Cause**: HTTP site (not HTTPS).

**Solution**: Use CloudFront URL (HTTPS), not S3 website URL (HTTP):
- ✅ https://d2xlnq3yj86lrz.cloudfront.net
- ❌ http://janseva-website-*.s3-website.ap-south-2.amazonaws.com

---

## Cost Optimization

### Current Costs (Estimated)

**1,000 users/month**:
- CloudFront: $0.85
- API Gateway: $0.18
- Lambda: $2.50
- DynamoDB: Free tier
- S3: $0.12
- **Total: ~$3.65/month**

**100,000 users/month**:
- CloudFront: $85
- API Gateway: $17.50
- Lambda: $250
- DynamoDB: $12.50
- S3: $2.30
- **Total: ~$367/month**

### Optimization Tips

1. **Enable CloudFront caching** (already enabled)
   - Static assets: 24-hour cache
   - Reduces S3 requests by 90%

2. **Use DynamoDB TTL** (already enabled)
   - Auto-deletes expired sessions
   - No manual cleanup needed

3. **S3 Lifecycle policies** (already enabled)
   - Forms auto-deleted after 7 days
   - Reduces storage costs

4. **Monitor Lambda memory**
   ```bash
   # Check if 1024 MB is too much
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name MemoryUtilization \
     --dimensions Name=FunctionName,Value=JanSevaStack-JanSevaApiFunction \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Average
   ```

5. **Set up cost alerts**
   ```bash
   aws budgets create-budget \
     --account-id YOUR_ACCOUNT_ID \
     --budget file://budget.json
   ```

---

## Cleanup

### Delete All Resources

```bash
# Delete CloudFormation stack
cdk destroy

# Confirm deletion when prompted
```

This removes:
- ✅ CloudFront Distribution
- ✅ S3 Buckets (with all objects)
- ✅ Lambda Function
- ✅ API Gateway
- ✅ DynamoDB Tables
- ✅ IAM Roles
- ✅ CloudWatch Logs

**Note**: CloudFront deletion takes 15-20 minutes.

### Manual Cleanup (If Needed)

```bash
# If CDK destroy fails, manually delete:

# 1. Empty and delete S3 buckets
aws s3 rb s3://janseva-website-YOUR_ACCOUNT_ID --force
aws s3 rb s3://janseva-forms-YOUR_ACCOUNT_ID --force

# 2. Delete CloudWatch log groups
aws logs delete-log-group \
  --log-group-name /aws/lambda/JanSevaStack-JanSevaApiFunction

# 3. Delete CloudFormation stack
aws cloudformation delete-stack --stack-name JanSevaStack
```

---

## Production Checklist

Before going live:

- [ ] Custom domain configured (optional)
- [ ] SSL certificate validated
- [ ] CloudWatch alarms set up
- [ ] Cost alerts configured
- [ ] Backup strategy documented
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Monitoring dashboard created
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Support & Resources

### Documentation
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **README**: See [README.md](./README.md)

### AWS Resources
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Contact
- **GitHub Issues**: https://github.com/Prathmesh333/AI4Bharat-JansevaAI/issues
- **Email**: support@janseva.ai

---

## Quick Reference

### Deployment URLs
- **Frontend**: https://d2xlnq3yj86lrz.cloudfront.net
- **API**: https://zz3f5dt1ee.execute-api.ap-south-2.amazonaws.com/prod/
- **CloudFront ID**: E1Q0GCT5UGNQR5

### Common Commands
```bash
# Deploy
cdk deploy --require-approval never

# Update frontend
aws s3 sync server/public/ s3://janseva-website-*/
aws cloudfront create-invalidation --distribution-id E1Q0GCT5UGNQR5 --paths "/*"

# View logs
aws logs tail /aws/lambda/JanSevaStack-JanSevaApiFunction --follow

# Destroy
cdk destroy
```

### AWS Console Links
- [CloudFormation](https://ap-south-2.console.aws.amazon.com/cloudformation)
- [Lambda Functions](https://ap-south-2.console.aws.amazon.com/lambda)
- [CloudFront Distributions](https://console.aws.amazon.com/cloudfront)
- [DynamoDB Tables](https://ap-south-2.console.aws.amazon.com/dynamodb)
- [S3 Buckets](https://s3.console.aws.amazon.com/s3)
- [CloudWatch Logs](https://ap-south-2.console.aws.amazon.com/cloudwatch)
