// Tests for form generator

import { generateReferenceNumber } from '../../../src/services/form/generator';

describe('Form Generator', () => {
  describe('generateReferenceNumber', () => {
    it('should generate unique reference numbers', () => {
      const ref1 = generateReferenceNumber('PM-KISAN');
      const ref2 = generateReferenceNumber('PM-KISAN');
      
      expect(ref1).not.toBe(ref2);
    });

    it('should include scheme prefix', () => {
      const ref = generateReferenceNumber('PM-KISAN');
      expect(ref).toMatch(/^PM-/);
    });

    it('should have correct format', () => {
      const ref = generateReferenceNumber('TEST-SCHEME');
      expect(ref).toMatch(/^[A-Z]{3}-[A-Z0-9]+-[A-Z0-9]{4}$/);
    });

    it('should handle short scheme IDs', () => {
      const ref = generateReferenceNumber('AB');
      expect(ref).toMatch(/^AB-/);
    });

    it('should be uppercase', () => {
      const ref = generateReferenceNumber('test-scheme');
      expect(ref).toBe(ref.toUpperCase());
    });

    it('should generate different references for different schemes', () => {
      const ref1 = generateReferenceNumber('ALPHA-SCHEME');
      const ref2 = generateReferenceNumber('BETA-SCHEME');
      
      // References should be different (timestamp + random ensures uniqueness)
      expect(ref1).not.toBe(ref2);
    });
  });
});
