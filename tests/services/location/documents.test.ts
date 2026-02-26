// Tests for document guidance service

import { getDocumentGuidance, getSubmissionOptions } from '../../../src/services/location/documents';
import { Scheme, Language } from '../../../src/types';

describe('Document Guidance', () => {
  const mockScheme: Scheme = {
    schemeId: 'TEST-001',
    name: 'Test Scheme',
    nameTranslations: {} as any,
    description: 'Test',
    descriptionTranslations: {} as any,
    ministry: 'Test',
    category: 'Test',
    benefits: ['Test benefit'],
    eligibilityCriteria: {},
    documents: ['Aadhaar', 'Income Certificate', 'Bank account'],
    applicationProcess: 'Online',
    officialUrl: 'https://test.gov.in',
    lastUpdated: Date.now(),
  };

  describe('getDocumentGuidance', () => {
    it('should return document guidance', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      
      expect(guidance.requiredDocuments).toBeDefined();
      expect(guidance.submissionOptions).toBeDefined();
    });

    it('should include all required documents', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      
      expect(guidance.requiredDocuments.length).toBeGreaterThan(0);
      guidance.requiredDocuments.forEach(doc => {
        expect(doc.name).toBeDefined();
        expect(doc.description).toBeDefined();
        expect(doc.howToObtain).toBeDefined();
        expect(doc.issuingAuthority).toBeDefined();
      });
    });

    it('should include submission options', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      
      expect(guidance.submissionOptions.length).toBeGreaterThan(0);
      guidance.submissionOptions.forEach(option => {
        expect(option.method).toBeDefined();
        expect(option.description).toBeDefined();
        expect(Array.isArray(option.steps)).toBe(true);
        expect(option.estimatedTime).toBeDefined();
      });
    });

    it('should include online submission option', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      const onlineOption = guidance.submissionOptions.find(o => o.method === 'online');
      
      expect(onlineOption).toBeDefined();
      expect(onlineOption!.steps.length).toBeGreaterThan(0);
    });

    it('should include CSC submission option', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      const cscOption = guidance.submissionOptions.find(o => o.method === 'csc');
      
      expect(cscOption).toBeDefined();
      expect(cscOption!.description).toContain('Common Service Center');
    });

    it('should include offline submission option', () => {
      const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
      const offlineOption = guidance.submissionOptions.find(o => o.method === 'offline');
      
      expect(offlineOption).toBeDefined();
    });
  });

  describe('getSubmissionOptions', () => {
    it('should return submission options', () => {
      const options = getSubmissionOptions('TEST-001');
      
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });

    it('should include method and steps', () => {
      const options = getSubmissionOptions('TEST-001');
      
      options.forEach(option => {
        expect(option.method).toBeDefined();
        expect(Array.isArray(option.steps)).toBe(true);
        expect(option.steps.length).toBeGreaterThan(0);
      });
    });
  });
});
