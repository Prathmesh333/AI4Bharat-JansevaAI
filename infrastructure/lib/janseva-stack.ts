import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
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

    // S3 Buckets
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

    // IAM Role for App Runner / Lambda
    const instanceRole = new iam.Role(this, 'JanSevaInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    sessionTable.grantReadWriteData(instanceRole);
    userProfileTable.grantReadWriteData(instanceRole);
    schemeDocsBucket.grantReadWrite(instanceRole);
    formsBucket.grantReadWrite(instanceRole);

    // Bedrock permissions
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // Transcribe/Polly/Translate permissions
    instanceRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'transcribe:*',
        'polly:*',
        'translate:*',
      ],
      resources: ['*'],
    }));

    // App Runner Service (Monolithic)
    const appService = new apprunner.Service(this, 'JanSevaAppService', {
      source: apprunner.Source.fromAsset({
        assetPath: path.resolve(__dirname, '../../'),
        imageConfiguration: {
          port: 8080,
          environmentVariables: {
            NODE_ENV: 'production',
            PORT: '8080',
            FORMS_BUCKET: formsBucket.bucketName,
            AWS_REGION: this.region,
          },
        },
      }),
      instanceRole: instanceRole,
    });

    // API Gateway (Legacy/Optional - App Runner has its own URL)
    const api = new apigateway.RestApi(this, 'JanSevaAPI', {
      restApiName: 'JanSeva AI API',
      description: 'API for JanSeva AI voice assistant',
      deployOptions: {
        stageName: 'dev',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'AppRunnerUrl', {
      value: appService.serviceUrl,
      description: 'The URL of the JanSeva AI App Runner service',
    });

    new cdk.CfnOutput(this, 'FormsBucketName', {
      value: formsBucket.bucketName,
      description: 'S3 Forms Bucket Name',
    });
  }
}
