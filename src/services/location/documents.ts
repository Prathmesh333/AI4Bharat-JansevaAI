// Document guidance service

import { Scheme, Language } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DocumentGuidance');

export interface DocumentGuidance {
  requiredDocuments: DocumentInfo[];
  optionalDocuments: DocumentInfo[];
  submissionOptions: SubmissionOption[];
}

export interface DocumentInfo {
  name: string;
  description: string;
  howToObtain: string;
  issuingAuthority: string;
  estimatedTime: string;
}

export interface SubmissionOption {
  method: 'online' | 'offline' | 'csc';
  description: string;
  steps: string[];
  estimatedTime: string;
}

const documentDatabase: Record<string, DocumentInfo> = {
  'Aadhaar': {
    name: 'Aadhaar Card',
    description: '12-digit unique identification number',
    howToObtain: 'Visit nearest Aadhaar enrollment center or update online',
    issuingAuthority: 'UIDAI',
    estimatedTime: '15-30 days',
  },
  'Income Certificate': {
    name: 'Income Certificate',
    description: 'Certificate showing annual income',
    howToObtain: 'Apply at Tehsil office or online through state portal',
    issuingAuthority: 'Tehsildar/Revenue Department',
    estimatedTime: '7-15 days',
  },
  'Land records': {
    name: 'Land Ownership Records',
    description: 'Documents proving land ownership',
    howToObtain: 'Obtain from Revenue Department or online land records portal',
    issuingAuthority: 'Revenue Department',
    estimatedTime: '1-7 days',
  },
  'Bank account': {
    name: 'Bank Account Details',
    description: 'Active bank account with passbook/statement',
    howToObtain: 'Open account at any bank branch',
    issuingAuthority: 'Bank',
    estimatedTime: '1-2 days',
  },
};

export function getDocumentGuidance(scheme: Scheme, language: Language): DocumentGuidance {
  logger.info('Getting document guidance', { schemeId: scheme.schemeId, language });

  const requiredDocuments: DocumentInfo[] = scheme.documents
    .map(docName => documentDatabase[docName])
    .filter(doc => doc !== undefined);

  const submissionOptions: SubmissionOption[] = [
    {
      method: 'online',
      description: 'Submit application online through official portal',
      steps: [
        'Visit official scheme website',
        'Register/Login with credentials',
        'Fill application form',
        'Upload required documents',
        'Submit and note reference number',
      ],
      estimatedTime: '30-60 minutes',
    },
    {
      method: 'csc',
      description: 'Visit Common Service Center for assisted application',
      steps: [
        'Find nearest CSC center',
        'Bring all required documents',
        'CSC operator will help fill form',
        'Pay nominal service charge',
        'Collect acknowledgment receipt',
      ],
      estimatedTime: '1-2 hours',
    },
    {
      method: 'offline',
      description: 'Submit physical application at government office',
      steps: [
        'Download and print application form',
        'Fill form with required details',
        'Attach photocopies of documents',
        'Submit at designated office',
        'Collect acknowledgment receipt',
      ],
      estimatedTime: '2-4 hours',
    },
  ];

  return {
    requiredDocuments,
    optionalDocuments: [],
    submissionOptions,
  };
}

export function getSubmissionOptions(schemeId: string): SubmissionOption[] {
  // Return submission options based on scheme
  return [
    {
      method: 'online',
      description: 'Submit application online',
      steps: ['Visit portal', 'Fill form', 'Upload documents', 'Submit'],
      estimatedTime: '30-60 minutes',
    },
    {
      method: 'csc',
      description: 'Visit CSC center',
      steps: ['Find CSC', 'Bring documents', 'Get assistance', 'Submit'],
      estimatedTime: '1-2 hours',
    },
  ];
}
