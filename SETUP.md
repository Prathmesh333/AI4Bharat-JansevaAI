# JanSeva AI - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with credentials
- AWS CDK CLI installed globally
- Python 3.9+ (for future ML components)
- Docker (optional, for local testing)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your AWS details:

```bash
cp .env.example .env
```

Edit `.env` and set:
- AWS_REGION (default: ap-south-1)
- AWS_ACCOUNT_ID (your AWS account ID)

### 3. Bootstrap AWS CDK (First Time Only)

```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-1
```

### 4. Deploy Infrastructure

```bash
npm run deploy
```

This will create:
- DynamoDB tables (sessions, user profiles)
- S3 buckets (scheme documents, forms)
- API Gateway
- IAM roles and policies

### 5. Verify Deployment

After deployment, CDK will output:
- SessionTableName
- UserProfileTableName
- SchemeDocsBucketName
- FormsBucketName
- ApiEndpoint

Update your `.env` file with these values.

## Development

### Build TypeScript

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## Project Structure

```
janseva-ai/
├── src/
│   ├── config/           # Configuration management
│   ├── types/            # TypeScript interfaces
│   ├── utils/            # Utilities (errors, logger)
│   ├── services/         # Business logic services
│   │   ├── voice/        # Voice processing (Transcribe, Polly)
│   │   ├── session/      # Session management
│   │   ├── conversation/ # Conversation with Bedrock
│   │   ├── eligibility/  # Eligibility matching
│   │   ├── form/         # Form generation
│   │   └── location/     # Location services
│   └── handlers/         # Lambda function handlers
├── infrastructure/       # AWS CDK infrastructure code
├── tests/               # Test files
└── docs/                # Additional documentation
```

## AWS Services Used

- Amazon Bedrock (Claude 3.5 Sonnet)
- Amazon Transcribe (Speech-to-text)
- Amazon Polly (Text-to-speech)
- Amazon Translate (Language translation)
- DynamoDB (Session storage)
- S3 (Document storage)
- API Gateway (REST API)
- Lambda (Serverless functions)
- OpenSearch (Vector search - to be configured)
- CloudWatch (Logging and monitoring)

## Next Steps

1. Implement Conversation Service (Task 3)
2. Build Scheme Knowledge Base with RAG (Task 4)
3. Implement Eligibility Engine (Task 6)
4. Create Form Generation Service (Task 7)
5. Add Location Services (Task 8)

## Troubleshooting

### CDK Deploy Fails

- Ensure AWS CLI is configured: `aws configure`
- Check IAM permissions for CDK deployment
- Verify account ID and region in `.env`

### DynamoDB Access Denied

- Check Lambda execution role has DynamoDB permissions
- Verify table names match configuration

### Bedrock Not Available

- Bedrock is available in us-east-1, us-west-2, ap-southeast-1
- Request model access in AWS Console > Bedrock > Model access

## Support

For issues or questions, refer to:
- `.kiro/specs/janseva-ai/requirements.md`
- `.kiro/specs/janseva-ai/design.md`
- `.kiro/specs/janseva-ai/tasks.md`
