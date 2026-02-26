# JanSeva AI - Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** installed
4. **AWS CDK** installed globally

## Step-by-Step Deployment

### 1. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (ap-south-1 recommended)
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Edit `.env`:
```
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=your-account-id-here
```

### 4. Bootstrap AWS CDK (First Time Only)

```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-1
```

### 5. Build TypeScript

```bash
npm run build
```

### 6. Deploy Infrastructure

```bash
npm run deploy
```

This will create:
- DynamoDB tables (sessions, user profiles)
- S3 buckets (scheme documents, forms)
- API Gateway endpoints
- Lambda functions (when added)
- IAM roles and policies

### 7. Note the Outputs

After deployment, CDK will output:
- API Gateway endpoint URL
- DynamoDB table names
- S3 bucket names

### 8. Request Bedrock Model Access

1. Go to AWS Console > Bedrock
2. Navigate to "Model access"
3. Request access to "Claude 3.5 Sonnet"
4. Wait for approval (usually instant)

### 9. Test the Deployment

```bash
# Test API endpoint
curl https://your-api-gateway-url/dev/health

# Run integration tests
npm test
```

## Post-Deployment Configuration

### Upload Scheme Documents

```bash
# Upload scheme data to S3
aws s3 cp schemes/ s3://janseva-scheme-docs-YOUR_ACCOUNT/ --recursive
```

### Configure OpenSearch (Optional)

For production RAG functionality:
1. Create OpenSearch domain
2. Update `.env` with OpenSearch endpoint
3. Run embedding generation script

## Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/janseva-voice-handler --follow

# View API Gateway logs
aws logs tail /aws/apigateway/janseva-api --follow
```

### CloudWatch Metrics

Monitor in AWS Console:
- Lambda invocations
- API Gateway requests
- DynamoDB read/write capacity
- Error rates

## Cost Estimation

### Development (10K users/month)
- Lambda: ~$50/month
- DynamoDB: ~$25/month
- S3: ~$5/month
- Bedrock: ~$500/month
- API Gateway: ~$35/month
- **Total: ~$615/month**

### Production (100K users/month)
- Lambda: ~$200/month
- DynamoDB: ~$100/month
- S3: ~$20/month
- Bedrock: ~$5,000/month
- API Gateway: ~$350/month
- **Total: ~$5,670/month**

## Troubleshooting

### CDK Deploy Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check CDK version
cdk --version

# Clean and retry
rm -rf cdk.out
npm run deploy
```

### Bedrock Access Denied

1. Ensure model access is granted in Bedrock console
2. Check IAM role has bedrock:InvokeModel permission
3. Verify region supports Bedrock (us-east-1, us-west-2)

### DynamoDB Throttling

Increase provisioned capacity or switch to on-demand billing:
```bash
aws dynamodb update-table \
  --table-name janseva-sessions \
  --billing-mode PAY_PER_REQUEST
```

## Rollback

To remove all resources:

```bash
npm run destroy
```

⚠️ Warning: This will delete all data!

## Next Steps

1. Deploy infrastructure
2. Upload scheme documents
3. Test API endpoints
4. Configure monitoring
5. Set up CI/CD pipeline
6. Enable auto-scaling
7. Configure backups
8. Set up alerts

## Support

For deployment issues:
- Check AWS CloudWatch logs
- Review CDK deployment output
- Verify IAM permissions
- Check service quotas
