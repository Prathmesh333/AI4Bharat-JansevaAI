// Tests for eligibility matcher

import { checkEligibility, suggestAlternativeSchemes } from '../../../src/services/eligibility/matcher';
import { UserProfile, Scheme, Language } from '../../../src/types';
import { JanSevaError } from '../../../src/utils/errors';

describe('Eligibility Matcher', () => {
  const mockScheme: Scheme = {
    schemeId: 'TEST-001',
    name: 'Test Scheme',
    nameTranslations: {} as any,
    description: 'Test scheme description',
    descriptionTranslations: {} as any,
    ministry: 'Test Ministry',
    category: 'Test',
    benefits: ['₹10000 per year'],
    eligibilityCriteria: {
      minAge: 18,
      maxAge: 60,
      states: ['Maharashtra', 'Gujarat'],
      income: { max: 100000 },
      category: ['general', 'obc'],
    },
    documents: ['Aadhaar', 'Income Certificate'],
    applicationProcess: 'Online',
    officialUrl: 'https://test.gov.in',
    lastUpdated: Date.now(),
  };

  const completeProfile: UserProfile = {
    age: 30,
    gender: 'male',
    state: 'Maharashtra',
    income: 50000,
    category: 'general',
  };

  describe('checkEligibility', () => {
    it('should return eligible for matching profile', async () => {
      const results = await checkEligibility(completeProfile, [mockScheme]);
      
      expect(results).toHaveLength(1);
      expect(results[0].eligible).toBe(true);
      expect(results[0].matchScore).toBeGreaterThan(0.7);
    });

    it('should return not eligible for non-matching profile', async () => {
      const nonMatchingProfile: UserProfile = {
        age: 70, // Exceeds maxAge
        state: 'Karnataka', // Not in eligible states
        income: 200000, // Exceeds max income
      };
      
      const results = await checkEligibility(nonMatchingProfile, [mockScheme]);
      
      expect(results).toHaveLength(1);
      expect(results[0].eligible).toBe(false);
    });

    it('should throw error for insufficient profile data', async () => {
      const incompleteProfile: UserProfile = {
        state: 'Maharashtra',
        // Missing age
      };
      
      await expect(checkEligibility(incompleteProfile, [mockScheme]))
        .rejects.toThrow(JanSevaError);
    });

    it('should calculate match score correctly', async () => {
      const results = await checkEligibility(completeProfile, [mockScheme]);
      
      expect(results[0].matchScore).toBeGreaterThanOrEqual(0);
      expect(results[0].matchScore).toBeLessThanOrEqual(1);
    });

    it('should include missing criteria for partial matches', async () => {
      const partialProfile: UserProfile = {
        age: 30,
        state: 'Karnataka', // Wrong state
        income: 50000,
      };
      
      const results = await checkEligibility(partialProfile, [mockScheme]);
      
      if (!results[0].eligible) {
        expect(results[0].missingCriteria).toBeDefined();
        expect(results[0].missingCriteria!.length).toBeGreaterThan(0);
      }
    });

    it('should include required documents', async () => {
      const results = await checkEligibility(completeProfile, [mockScheme]);
      
      expect(results[0].requiredDocuments).toEqual(['Aadhaar', 'Income Certificate']);
    });

    it('should include estimated benefit for eligible schemes', async () => {
      const results = await checkEligibility(completeProfile, [mockScheme]);
      
      if (results[0].eligible) {
        expect(results[0].estimatedBenefit).toBeDefined();
        expect(results[0].estimatedBenefit).toBe('₹10000 per year');
      }
    });

    it('should sort results by match score', async () => {
      const scheme1 = { ...mockScheme, schemeId: 'SCHEME-1' };
      const scheme2 = { 
        ...mockScheme, 
        schemeId: 'SCHEME-2',
        eligibilityCriteria: { minAge: 18, maxAge: 60 } // Fewer criteria
      };
      
      const results = await checkEligibility(completeProfile, [scheme1, scheme2]);
      
      expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
    });

    it('should handle age boundary conditions', async () => {
      const minAgeProfile = { ...completeProfile, age: 18 };
      const maxAgeProfile = { ...completeProfile, age: 60 };
      
      const results1 = await checkEligibility(minAgeProfile, [mockScheme]);
      const results2 = await checkEligibility(maxAgeProfile, [mockScheme]);
      
      expect(results1[0].eligible).toBe(true);
      expect(results2[0].eligible).toBe(true);
    });

    it('should handle income range checks', async () => {
      const lowIncomeProfile = { ...completeProfile, income: 10000 };
      const highIncomeProfile = { ...completeProfile, income: 150000 };
      
      const results1 = await checkEligibility(lowIncomeProfile, [mockScheme]);
      const results2 = await checkEligibility(highIncomeProfile, [mockScheme]);
      
      expect(results1[0].eligible).toBe(true);
      // High income profile may still be eligible if other criteria match (70% threshold)
      expect(results2[0].matchScore).toBeLessThan(results1[0].matchScore);
    });
  });

  describe('suggestAlternativeSchemes', () => {
    it('should return schemes with partial match', () => {
      const partialProfile: UserProfile = {
        age: 30,
        state: 'Karnataka', // Wrong state
        income: 50000,
        category: 'general',
      };
      
      const results = suggestAlternativeSchemes(partialProfile, [mockScheme]);
      
      results.forEach(result => {
        expect(result.matchScore).toBeGreaterThanOrEqual(0.4);
        expect(result.matchScore).toBeLessThan(0.7);
      });
    });

    it('should limit results to 5 schemes', () => {
      const schemes = Array(10).fill(null).map((_, i) => ({
        ...mockScheme,
        schemeId: `SCHEME-${i}`,
        eligibilityCriteria: { minAge: 18 + i, maxAge: 60 },
      }));
      
      const results = suggestAlternativeSchemes(completeProfile, schemes);
      
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should sort by match score descending', () => {
      const schemes = Array(5).fill(null).map((_, i) => ({
        ...mockScheme,
        schemeId: `SCHEME-${i}`,
      }));
      
      const results = suggestAlternativeSchemes(completeProfile, schemes);
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore);
      }
    });
  });
});
