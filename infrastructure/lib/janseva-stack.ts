import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class JanSevaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: 'janseva-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userProfileTable = new dynamodb.Table(this, 'UserProfileTable', {
      tableName: 'janseva-user-profiles',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket for Frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `janseva-website-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy frontend files to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../server/public'))],
      destinationBucket: websiteBucket,
    });

    // S3 Buckets for backend
    const schemeDocsBucket = new s3.Bucket(this, 'SchemeDocsBucket', {
      bucketName: `janseva-scheme-docs-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const formsBucket = new s3.Bucket(this, 'FormsBucket', {
      bucketName: `janseva-forms-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7),
        },
      ],
    });

    // IAM Role for Lambda
    const lambdaRole = new iam.Role(this, 'JanSevaLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    sessionTable.grantReadWriteData(lambdaRole);
    userProfileTable.grantReadWriteData(lambdaRole);
    schemeDocsBucket.grantReadWrite(lambdaRole);
    formsBucket.grantReadWrite(lambdaRole);

    // Bedrock permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // Transcribe/Polly/Translate permissions
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'transcribe:*',
        'polly:*',
        'translate:*',
      ],
      resources: ['*'],
    }));

    // Lambda Function with bundled code
    const apiLambda = new lambda.Function(this, 'JanSevaApiFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../dist-lambda')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: 'production',
        FORMS_BUCKET: formsBucket.bucketName,
        SESSION_TABLE_NAME: sessionTable.tableName,
        USER_PROFILE_TABLE_NAME: userProfileTable.tableName,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      },
    });

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'JanSevaApi', {
      handler: apiLambda,
      proxy: true,
      description: 'JanSeva AI API Gateway',
      deployOptions: {
        stageName: 'prod',
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'The URL of the JanSeva AI website',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the JanSeva AI API',
    });

    new cdk.CfnOutput(this, 'FormsBucketName', {
      value: formsBucket.bucketName,
      description: 'S3 Forms Bucket Name',
    });
  }
}
