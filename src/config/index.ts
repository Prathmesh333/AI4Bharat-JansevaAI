// Configuration management

export const config = {
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accountId: process.env.AWS_ACCOUNT_ID || '',
  },
  
  dynamodb: {
    sessionTable: process.env.SESSION_TABLE_NAME || 'janseva-sessions',
    userProfileTable: process.env.USER_PROFILE_TABLE_NAME || 'janseva-user-profiles',
    sessionTTL: 3600, // 1 hour in seconds
  },
  
  s3: {
    schemeDocumentsBucket: process.env.SCHEME_DOCUMENTS_BUCKET || 'janseva-scheme-docs',
    formsBucket: process.env.FORMS_BUCKET || 'janseva-forms',
  },
  
  opensearch: {
    endpoint: process.env.OPENSEARCH_ENDPOINT || '',
    index: process.env.OPENSEARCH_INDEX || 'janseva-schemes',
  },
  
  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    region: process.env.BEDROCK_REGION || 'us-east-1',
    maxTokens: 4096,
    temperature: 0.7,
  },
  
  transcribe: {
    supportedLanguages: ['hi-IN', 'en-IN', 'bn-IN', 'te-IN', 'mr-IN', 'ta-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'],
    sampleRate: 16000,
  },
  
  polly: {
    voiceMapping: {
      hi: 'Aditi',
      en: 'Kajal',
      // Add more voice mappings as needed
    },
    outputFormat: 'mp3' as const,
  },
  
  api: {
    stage: process.env.API_STAGE || 'dev',
    rateLimitPerMinute: 60,
    maxRequestSize: '10mb',
  },
  
  performance: {
    maxResponseTime: 3000, // 3 seconds
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
  },
};
