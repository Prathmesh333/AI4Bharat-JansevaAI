# JanSeva AI - AWS Architecture Documentation

## High-Level Architecture Overview

JanSeva AI is a serverless, voice-first multilingual platform that helps Indian citizens discover and apply for 3,400+ government welfare schemes. The architecture leverages AWS services for scalability, security, and cost-effectiveness.

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Delivery                         │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │   CloudFront   │────────▶│   S3 Website     │           │
│  │  Distribution  │         │     Bucket       │           │
│  │   (CDN/HTTPS)  │         │  (Static Files)  │           │
│  └────────────────┘         └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
       │ POST /api/*
       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  API Gateway   │────────▶│     Lambda       │           │
│  │   (REST API)   │         │  (Node.js 22.x)  │           │
│  │                │         │   120s timeout   │           │
│  └────────────────┘         └────────┬─────────┘           │
└──────────────────────────────────────┼──────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────┐
       │                               │                       │
       ▼                               ▼                       ▼
┌─────────────┐              ┌──────────────────┐    ┌──────────────┐
│   Gemini    │              │    DynamoDB      │    │  S3 Buckets  │
│  AI Model   │              │   (Sessions &    │    │   (Forms &   │
│ (3.0 Flash) │              │   Profiles)      │    │  Documents)  │
└─────────────┘              └──────────────────┘    └──────────────┘
```

---

## Component Breakdown & AWS Service Rationale

### 1. Frontend Delivery Layer

#### **CloudFront Distribution**
**AWS Service**: Amazon CloudFront  
**Purpose**: Content Delivery Network (CDN) with HTTPS support

**Why CloudFront?**
- **HTTPS/SSL Support**: Required for browser microphone access (getUserMedia API)
  - Modern browsers block microphone access on HTTP sites for security
  - CloudFront provides free SSL certificates via AWS Certificate Manager
  
- **Global Performance**: 
  - 450+ edge locations worldwide
  - Reduced latency for users across India (Mumbai, Delhi, Chennai, etc.)
  - Cached static assets served from nearest edge location
  
- **Scalability**:
  - Handles traffic spikes automatically
  - No origin server overload during high traffic
  - Automatic scaling without configuration
  
- **Security**:
  - DDoS protection via AWS Shield Standard (included)
  - Origin Access Control (OAC) prevents direct S3 access
  - HTTPS-only redirect enforced
  
- **Cost Efficiency**:
  - Pay-per-use pricing
  - Reduced S3 data transfer costs
  - Free tier: 1TB data transfer out per month

**Configuration**:
```typescript
const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  defaultRootObject: 'index.html',
  errorResponses: [
    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' }
  ]
});
```

#### **S3 Website Bucket**
**AWS Service**: Amazon S3  
**Purpose**: Static website hosting

**Why S3?**
- **Durability**: 99.999999999% (11 9's) durability
- **Availability**: 99.99% availability SLA
- **Cost-Effective**: $0.023 per GB/month (ap-south-2)
- **Versioning**: Easy rollback of deployments
- **Integration**: Native CloudFront origin

**Security Configuration**:
- Private bucket (no public access)
- CloudFront Origin Access Control (OAC) for secure access
- Encryption at rest (S3-managed keys)

---

### 2. API Layer

#### **API Gateway (REST API)**
**AWS Service**: Amazon API Gateway  
**Purpose**: RESTful API endpoint management

**Why API Gateway?**
- **Serverless**: No infrastructure management
- **Auto-Scaling**: Handles any request volume
- **CORS Support**: Built-in CORS configuration
- **Throttling**: Protects backend from abuse
- **Monitoring**: CloudWatch integration for metrics
- **Cost**: Pay per million requests ($3.50/million in ap-south-2)

**Endpoints**:
```
POST /api/session          - Create chat session
POST /api/message          - Send message to AI
POST /api/eligibility/check - Check scheme eligibility
POST /api/location/csc     - Find nearest CSC
GET  /api/schemes          - List schemes
GET  /api/schemes/:slug    - Get scheme details
GET  /api/schemes/form/print/:slug - Generate form
```

#### **Lambda Function (Node.js 22.x)**
**AWS Service**: AWS Lambda  
**Purpose**: Serverless compute for API logic

**Why Lambda?**
- **Serverless**: No server management, automatic scaling
- **Cost-Effective**: Pay only for compute time used
  - Free tier: 1M requests + 400,000 GB-seconds per month
  - After free tier: $0.0000166667 per GB-second
  
- **Auto-Scaling**: Handles 1 to 10,000+ concurrent requests
- **High Availability**: Multi-AZ deployment by default
- **Fast Cold Starts**: Node.js 22.x has <200ms cold start
- **Memory/CPU**: 1024 MB memory = ~0.6 vCPU

**Configuration Rationale**:
```typescript
const apiLambda = new lambda.Function(this, 'JanSevaApiFunction', {
  runtime: lambda.Runtime.NODEJS_22_X,  // Latest Node.js for performance
  timeout: cdk.Duration.seconds(120),   // 120s for Gemini API calls
  memorySize: 1024,                     // 1GB for CSV processing + AI
  handler: 'index.handler',
});
```

**Why 120-second timeout?**
- Gemini AI API calls: 5-30 seconds
- CSV scheme search: 1-5 seconds
- Form generation: 2-10 seconds
- Buffer for network latency
- Default 30s was causing Gateway Timeout errors

**Why 1024 MB memory?**
- CSV dataset: ~50 MB loaded in memory
- Node.js runtime: ~100 MB
- Express.js + dependencies: ~50 MB
- AI response processing: ~100 MB
- Headroom for concurrent requests: ~700 MB

---

### 3. AI Service Layer

#### **Google Gemini 3.0 Flash**
**Service**: Google Gemini AI (External API)  
**Purpose**: Conversational AI and RAG (Retrieval-Augmented Generation)

**Why Gemini 3.0 Flash?**
- **Multilingual Support**: Native support for 6 Indian languages
  - English, Hindi, Telugu, Tamil, Bengali, Marathi
  
- **Fast Response**: 2-5 second response time
- **Context Window**: 1M tokens (handles large scheme data)
- **Cost-Effective**: $0.075 per 1M input tokens
- **RAG Capabilities**: Excellent at using provided context
- **Structured Output**: Generates form markers and structured responses

**Integration Pattern**:
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  systemInstruction: systemInstruction, // Includes matched schemes
});

// RAG: Schemes passed as context
if (matchedSchemes && matchedSchemes.length > 0) {
  systemInstruction += `\n\n[SYSTEM CONTEXT: REAL MATCHED SCHEMES]\n`;
  matchedSchemes.forEach(scheme => {
    systemInstruction += `Scheme: ${scheme.scheme_name}\n`;
    systemInstruction += `Benefits: ${scheme.benefits}\n`;
    systemInstruction += `Eligibility: ${scheme.eligibility}\n`;
  });
}
```

**Why Not AWS Bedrock?**
- Gemini has better multilingual support for Indian languages
- Lower latency for conversational responses
- More cost-effective for our use case
- Better at following complex instructions (form generation)

---

### 4. Storage Layer

#### **DynamoDB Tables**
**AWS Service**: Amazon DynamoDB  
**Purpose**: Session and user profile storage

**Why DynamoDB?**
- **Serverless**: No capacity planning needed
- **Performance**: Single-digit millisecond latency
- **Scalability**: Handles millions of requests per second
- **TTL Support**: Auto-delete expired sessions (no cleanup code)
- **Cost**: Pay-per-request pricing
  - Free tier: 25 GB storage + 25 WCU + 25 RCU

**Tables**:

1. **SessionTable**
   - Partition Key: `sessionId`
   - TTL: `expiresAt` (24 hours)
   - Stores: Conversation history, language preference, user context
   
2. **UserProfileTable**
   - Partition Key: `userId`
   - TTL: `expiresAt` (30 days)
   - Stores: User demographics, eligibility data, preferences

**Configuration**:
```typescript
const sessionTable = new dynamodb.Table(this, 'SessionTable', {
  partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Auto-scaling
  timeToLiveAttribute: 'expiresAt', // Auto-cleanup
});
```

#### **S3 Buckets (Forms & Documents)**
**AWS Service**: Amazon S3  
**Purpose**: Generated forms and document storage

**Buckets**:

1. **Forms Bucket** (`janseva-forms-*`)
   - Stores: Generated application forms (HTML/PDF)
   - Lifecycle: Auto-delete after 7 days
   - Encryption: S3-managed (SSE-S3)
   - Access: Private (Lambda only)

2. **Scheme Docs Bucket** (`janseva-scheme-docs-*`)
   - Stores: Scheme documentation, guidelines
   - Lifecycle: Permanent storage
   - Encryption: S3-managed (SSE-S3)

**Why S3 for Forms?**
- **Durability**: 99.999999999% durability
- **Lifecycle Policies**: Auto-delete old forms (cost savings)
- **Scalability**: Unlimited storage
- **Integration**: Direct Lambda access
- **Cost**: $0.023 per GB/month

---

## Data Flow Examples

### Example 1: User Discovers Schemes

```
1. User opens https://d2xlnq3yj86lrz.cloudfront.net
   └─▶ CloudFront serves cached index.html from S3
   
2. User clicks "Find Schemes For You"
   └─▶ Frontend: POST /api/session
       └─▶ API Gateway → Lambda
           └─▶ Lambda creates session in DynamoDB
           └─▶ Returns sessionId
   
3. User enters: "I am a farmer from Maharashtra"
   └─▶ Frontend: POST /api/message
       └─▶ API Gateway → Lambda
           └─▶ Lambda searches CSV dataset (3,400 schemes)
           └─▶ Finds 50 matching schemes
           └─▶ Sends top 5 to Gemini with user message
           └─▶ Gemini generates conversational response
           └─▶ Lambda saves to DynamoDB session
           └─▶ Returns AI response to user
```

### Example 2: User Generates Application Form

```
1. User completes eligibility check
   └─▶ AI collects: name, age, state, income, documents
   
2. AI generates form marker:
   [FORM_DOWNLOAD:pm-kisan:PM-KISAN?full_name=Ram&state=Maharashtra...]
   
3. Frontend renders download button
   
4. User clicks "Download Form"
   └─▶ GET /api/schemes/form/print/pm-kisan?full_name=Ram&...
       └─▶ API Gateway → Lambda
           └─▶ Lambda resolves scheme by slug
           └─▶ Generates dynamic HTML form with user data
           └─▶ Optionally saves to S3 Forms Bucket
           └─▶ Returns HTML form
   
5. User prints form with pre-filled data
```

---

## Security Architecture

### 1. Network Security
- **CloudFront**: HTTPS-only, DDoS protection (AWS Shield)
- **API Gateway**: CORS configured, throttling enabled
- **Lambda**: VPC not required (public services only)
- **S3**: Private buckets, OAC for CloudFront access

### 2. Data Security
- **Encryption in Transit**: TLS 1.2+ everywhere
- **Encryption at Rest**: 
  - S3: SSE-S3 (AES-256)
  - DynamoDB: AWS-managed encryption
- **API Keys**: Stored in Lambda environment variables
- **No PII Storage**: Forms auto-deleted after 7 days

### 3. IAM Security
```typescript
const lambdaRole = new iam.Role(this, 'JanSevaLambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AWSLambdaBasicExecutionRole'
    ),
  ],
});

// Least privilege: Only required permissions
sessionTable.grantReadWriteData(lambdaRole);
formsBucket.grantReadWrite(lambdaRole);
```

---

## Scalability & Performance

### Auto-Scaling Components

| Component | Scaling Method | Limits |
|-----------|---------------|--------|
| CloudFront | Automatic | Unlimited |
| API Gateway | Automatic | 10,000 RPS (soft limit) |
| Lambda | Automatic | 1,000 concurrent (default) |
| DynamoDB | On-Demand | Unlimited |
| S3 | Automatic | Unlimited |

### Performance Optimizations

1. **CloudFront Caching**
   - Static assets: 24-hour cache
   - HTML files: 5-minute cache
   - API responses: No cache

2. **Lambda Optimizations**
   - CSV dataset loaded once (cold start)
   - Reused across warm invocations
   - Connection pooling for DynamoDB

3. **Database Optimizations**
   - DynamoDB: Single-table design
   - Efficient partition key (sessionId)
   - TTL for automatic cleanup

---

## Cost Analysis

### Monthly Cost Estimate (1,000 users/month)

| Service | Usage | Cost |
|---------|-------|------|
| CloudFront | 10 GB transfer | $0.85 |
| API Gateway | 50,000 requests | $0.18 |
| Lambda | 100,000 invocations, 30s avg | $2.50 |
| DynamoDB | 100,000 reads/writes | Free tier |
| S3 | 5 GB storage | $0.12 |
| **Total** | | **~$3.65/month** |

### Cost at Scale (100,000 users/month)

| Service | Usage | Cost |
|---------|-------|------|
| CloudFront | 1 TB transfer | $85 |
| API Gateway | 5M requests | $17.50 |
| Lambda | 10M invocations | $250 |
| DynamoDB | 10M reads/writes | $12.50 |
| S3 | 100 GB storage | $2.30 |
| **Total** | | **~$367/month** |

---

## Deployment Architecture

### Infrastructure as Code (AWS CDK)

```typescript
// Single stack deployment
export class JanSevaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // 1. Storage Layer
    const sessionTable = new dynamodb.Table(...);
    const websiteBucket = new s3.Bucket(...);
    const formsBucket = new s3.Bucket(...);
    
    // 2. Compute Layer
    const apiLambda = new lambda.Function(...);
    
    // 3. API Layer
    const api = new apigateway.LambdaRestApi(...);
    
    // 4. CDN Layer
    const distribution = new cloudfront.Distribution(...);
    
    // 5. Permissions
    sessionTable.grantReadWriteData(apiLambda);
    formsBucket.grantReadWrite(apiLambda);
  }
}
```

### Deployment Process

```bash
# 1. Bundle Lambda code
node scripts/bundle-lambda.js

# 2. Deploy infrastructure
cdk deploy --require-approval never

# 3. Upload frontend to S3
aws s3 sync server/public/ s3://janseva-website-*/

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1Q0GCT5UGNQR5 \
  --paths "/*"
```

---

## Monitoring & Observability

### CloudWatch Metrics

1. **Lambda Metrics**
   - Invocations, Duration, Errors, Throttles
   - Custom: Scheme searches, AI response time

2. **API Gateway Metrics**
   - Request count, Latency, 4XX/5XX errors
   - Integration latency

3. **CloudFront Metrics**
   - Requests, Bytes downloaded, Error rate
   - Cache hit ratio

### Logging Strategy

```typescript
// Lambda logs to CloudWatch
console.log(`[DEBUG] Message: "${message}", Matched ${schemes.length} schemes`);

// Structured logging
logger.info('Scheme search', {
  query: message,
  matchCount: schemes.length,
  duration: Date.now() - startTime
});
```

---

## Disaster Recovery

### Backup Strategy
- **DynamoDB**: Point-in-time recovery (PITR) enabled
- **S3**: Versioning enabled on critical buckets
- **Lambda**: Code stored in S3 (automatic)
- **Infrastructure**: CDK code in Git

### Recovery Time Objective (RTO)
- **CloudFront**: < 1 minute (multi-region)
- **API Gateway**: < 1 minute (multi-AZ)
- **Lambda**: < 1 minute (automatic failover)
- **DynamoDB**: < 1 minute (multi-AZ)
- **Overall RTO**: < 5 minutes

### Recovery Point Objective (RPO)
- **DynamoDB**: < 5 minutes (PITR)
- **S3**: 0 (versioning)
- **Lambda**: 0 (code in S3)
- **Overall RPO**: < 5 minutes

---

## Future Enhancements

### Planned AWS Service Additions

1. **Amazon Cognito**
   - User authentication
   - Social login (Google, Facebook)
   - User profile management

2. **Amazon SES**
   - Email notifications
   - Form submission confirmations
   - Scheme alerts

3. **Amazon EventBridge**
   - Scheduled scheme updates
   - Webhook integrations
   - Event-driven workflows

4. **AWS WAF**
   - Advanced DDoS protection
   - Bot detection
   - Rate limiting

5. **Amazon ElastiCache**
   - Redis for session caching
   - Reduce DynamoDB reads
   - Faster response times

---

## Conclusion

JanSeva AI's AWS architecture is designed for:
- **Scalability**: Handles 1 to 1M users without code changes
- **Performance**: <2s response time globally
- **Cost-Efficiency**: Pay only for what you use
- **Security**: Enterprise-grade encryption and access control
- **Reliability**: 99.99% uptime SLA
- **Maintainability**: Serverless = no server management

The architecture leverages AWS's managed services to focus on business logic rather than infrastructure management, enabling rapid iteration and feature development.
