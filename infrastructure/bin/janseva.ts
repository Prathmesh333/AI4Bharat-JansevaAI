#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { JanSevaStack } from '../lib/janseva-stack';

const app = new cdk.App();

new JanSevaStack(app, 'JanSevaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
  },
  description: 'JanSeva AI - Voice-first multilingual AI assistant for government welfare schemes',
});

app.synth();
