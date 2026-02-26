// Tests for scheme search service

import { searchSchemes } from '../../../src/services/schemes/search';
import { Language } from '../../../src/types';

describe('Scheme Search', () => {
  describe('searchSchemes', () => {
    it('should return search results', async () => {
      const results = await searchSchemes({
        text: 'farmer',
        language: Language.ENGLISH,
        limit: 10,
      });
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by query text', async () => {
      const results = await searchSchemes({
        text: 'PM-KISAN',
        language: Language.ENGLISH,
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schemeId).toBe('PM-KISAN');
    });

    it('should return results in requested language', async () => {
      const results = await searchSchemes({
        text: 'farmer',
        language: Language.HINDI,
      });
      
      if (results.length > 0) {
        expect(results[0].schemeName).toMatch(/[\u0900-\u097F]/); // Devanagari script
      }
    });

    it('should respect limit parameter', async () => {
      const results = await searchSchemes({
        text: 'scheme',
        language: Language.ENGLISH,
        limit: 5,
      });
      
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should include relevance scores', async () => {
      const results = await searchSchemes({
        text: 'farmer',
        language: Language.ENGLISH,
      });
      
      results.forEach(result => {
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should sort by relevance score', async () => {
      const results = await searchSchemes({
        text: 'farmer',
        language: Language.ENGLISH,
      });
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('should boost results matching user profile', async () => {
      const resultsWithProfile = await searchSchemes({
        text: 'scheme',
        language: Language.ENGLISH,
        userProfile: {
          state: 'Maharashtra',
          age: 30,
          occupation: 'farmer',
          landOwnership: true,
        },
      });
      
      const resultsWithoutProfile = await searchSchemes({
        text: 'scheme',
        language: Language.ENGLISH,
      });
      
      // Results with matching profile should have higher scores
      if (resultsWithProfile.length > 0 && resultsWithoutProfile.length > 0) {
        expect(resultsWithProfile[0].relevanceScore).toBeGreaterThanOrEqual(
          resultsWithoutProfile[0].relevanceScore
        );
      }
    });

    it('should include matched criteria', async () => {
      const results = await searchSchemes({
        text: 'farmer',
        language: Language.ENGLISH,
        userProfile: {
          state: 'Maharashtra',
          age: 30,
          occupation: 'farmer',
          landOwnership: true,
        },
      });
      
      if (results.length > 0) {
        expect(Array.isArray(results[0].matchedCriteria)).toBe(true);
      }
    });

    it('should handle empty query', async () => {
      const results = await searchSchemes({
        text: '',
        language: Language.ENGLISH,
      });
      
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
