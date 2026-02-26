#!/usr/bin/env ts-node
// Local demo of JanSeva AI functionality (without AWS)

import { Language, ConversationState, UserProfile } from '../src/types';
import { extractIntent } from '../src/services/conversation/bedrock';
import { transitionState, addMessageToContext, resetContext } from '../src/services/conversation/stateManager';
import { checkEligibility } from '../src/services/eligibility/matcher';
import { searchSchemes } from '../src/services/schemes/search';
import { detectLanguage } from '../src/services/voice/transcribe';
import { findNearestCSC } from '../src/services/location/csc';
import { getDocumentGuidance } from '../src/services/location/documents';

console.log('🎯 JanSeva AI - Local Demo\n');
console.log('Seva Har Samasya Ki (Service for Every Problem)\n');
console.log('='.repeat(60));

// Demo 1: Language Detection
console.log('\n📝 Demo 1: Language Detection');
console.log('-'.repeat(60));
const hindiText = 'नमस्ते, मैं योजना के बारे में जानना चाहता हूं';
const englishText = 'Hello, I want to know about schemes';
const tamilText = 'வணக்கம், திட்டங்களைப் பற்றி தெரிந்து கொள்ள விரும்புகிறேன்';

console.log(`Hindi text: "${hindiText}"`);
console.log(`Detected: ${detectLanguage(hindiText)}`);
console.log(`\nEnglish text: "${englishText}"`);
console.log(`Detected: ${detectLanguage(englishText)}`);
console.log(`\nTamil text: "${tamilText}"`);
console.log(`Detected: ${detectLanguage(tamilText)}`);

// Demo 2: Intent Extraction
console.log('\n\n🎯 Demo 2: Intent Extraction');
console.log('-'.repeat(60));
const queries = [
  'Tell me about schemes',
  'I want to apply',
  'Am I eligible?',
  'Where is the nearest office?',
  'What documents do I need?'
];

queries.forEach(query => {
  const intent = extractIntent(query);
  console.log(`Query: "${query}"`);
  console.log(`Intent: ${intent}\n`);
});

// Demo 3: Conversation State Machine
console.log('\n🔄 Demo 3: Conversation State Machine');
console.log('-'.repeat(60));
let currentState = ConversationState.INITIATED;
console.log(`Initial state: ${currentState}`);

currentState = transitionState(currentState, ConversationState.LANGUAGE_SELECTED);
console.log(`After language selection: ${currentState}`);

currentState = transitionState(currentState, ConversationState.COLLECTING_PROFILE);
console.log(`After starting profile: ${currentState}`);

currentState = transitionState(currentState, ConversationState.SHOWING_SCHEMES);
console.log(`After profile complete: ${currentState}`);

// Demo 4: Scheme Search
console.log('\n\n🔍 Demo 4: Scheme Search');
console.log('-'.repeat(60));

async function demoSchemeSearch() {
  const results = await searchSchemes({
    text: 'farmer',
    language: Language.ENGLISH,
    userProfile: {
      state: 'Maharashtra',
      age: 35,
      occupation: 'farmer',
      landOwnership: true,
    },
    limit: 5,
  });

  console.log(`Found ${results.length} schemes:`);
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.schemeName}`);
    console.log(`   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`);
    console.log(`   Matched: ${result.matchedCriteria.join(', ')}`);
  });
}

// Demo 5: Eligibility Checking
console.log('\n\n✅ Demo 5: Eligibility Checking');
console.log('-'.repeat(60));

async function demoEligibility() {
  const userProfile: UserProfile = {
    age: 35,
    gender: 'male',
    state: 'Maharashtra',
    income: 50000,
    category: 'general',
    occupation: 'farmer',
    landOwnership: true,
  };

  const schemes = await searchSchemes({
    text: 'farmer',
    language: Language.ENGLISH,
    limit: 3,
  });

  const eligibilityResults = await checkEligibility(userProfile, schemes.map(s => ({
    schemeId: s.schemeId,
    name: s.schemeName,
    nameTranslations: {} as any,
    description: s.excerpt,
    descriptionTranslations: {} as any,
    ministry: 'Agriculture',
    category: 'Agriculture',
    benefits: ['Financial support'],
    eligibilityCriteria: {
      occupation: ['farmer'],
      landOwnership: true,
      states: ['Maharashtra'],
    },
    documents: ['Aadhaar', 'Land records'],
    applicationProcess: 'Online',
    officialUrl: 'https://example.gov.in',
    lastUpdated: Date.now(),
  })));

  console.log('User Profile:');
  console.log(`  Age: ${userProfile.age}`);
  console.log(`  State: ${userProfile.state}`);
  console.log(`  Occupation: ${userProfile.occupation}`);
  console.log(`  Income: ₹${userProfile.income}`);

  console.log('\nEligibility Results:');
  eligibilityResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.schemeName}`);
    console.log(`   Eligible: ${result.eligible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Match Score: ${(result.matchScore * 100).toFixed(0)}%`);
    if (result.eligible) {
      console.log(`   Benefit: ${result.estimatedBenefit}`);
    }
    if (result.missingCriteria && result.missingCriteria.length > 0) {
      console.log(`   Missing: ${result.missingCriteria.join(', ')}`);
    }
  });
}

// Demo 6: Location Services
console.log('\n\n📍 Demo 6: Location Services');
console.log('-'.repeat(60));

async function demoLocation() {
  const cscs = await findNearestCSC({
    state: 'Maharashtra',
    district: 'Mumbai',
  });

  console.log(`Found ${cscs.length} CSC centers:`);
  cscs.forEach((csc, index) => {
    console.log(`\n${index + 1}. ${csc.name}`);
    console.log(`   Address: ${csc.address}`);
    console.log(`   Contact: ${csc.contactNumber}`);
    console.log(`   Hours: ${csc.operatingHours}`);
    console.log(`   Services: ${csc.servicesOffered.join(', ')}`);
  });
}

// Demo 7: Document Guidance
console.log('\n\n📄 Demo 7: Document Guidance');
console.log('-'.repeat(60));

const mockScheme = {
  schemeId: 'PM-KISAN',
  name: 'PM-KISAN',
  nameTranslations: {} as any,
  description: 'Income support to farmers',
  descriptionTranslations: {} as any,
  ministry: 'Agriculture',
  category: 'Agriculture',
  benefits: ['₹6000 per year'],
  eligibilityCriteria: {},
  documents: ['Aadhaar', 'Land records', 'Bank account'],
  applicationProcess: 'Online',
  officialUrl: 'https://pmkisan.gov.in',
  lastUpdated: Date.now(),
};

const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);

console.log('Required Documents:');
guidance.requiredDocuments.forEach((doc, index) => {
  console.log(`\n${index + 1}. ${doc.name}`);
  console.log(`   Description: ${doc.description}`);
  console.log(`   How to obtain: ${doc.howToObtain}`);
  console.log(`   Authority: ${doc.issuingAuthority}`);
  console.log(`   Time: ${doc.estimatedTime}`);
});

console.log('\n\nSubmission Options:');
guidance.submissionOptions.forEach((option, index) => {
  console.log(`\n${index + 1}. ${option.method.toUpperCase()}`);
  console.log(`   ${option.description}`);
  console.log(`   Time: ${option.estimatedTime}`);
  console.log(`   Steps:`);
  option.steps.forEach((step, i) => {
    console.log(`     ${i + 1}. ${step}`);
  });
});

// Run all demos
(async () => {
  await demoSchemeSearch();
  await demoEligibility();
  await demoLocation();
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ Demo Complete!');
  console.log('='.repeat(60));
  console.log('\nTo deploy to AWS:');
  console.log('  1. Configure AWS credentials: aws configure');
  console.log('  2. Bootstrap CDK: npx cdk bootstrap');
  console.log('  3. Deploy: npm run deploy');
  console.log('\nFor more info, see DEPLOYMENT_GUIDE.md');
})();
