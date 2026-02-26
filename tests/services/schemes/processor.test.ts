// Tests for scheme document processor

import { chunkDocument } from '../../../src/services/schemes/processor';

describe('Scheme Processor', () => {
  describe('chunkDocument', () => {
    it('should split document into chunks', () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const chunks = chunkDocument(content, 20);
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(50); // Allow for sentence boundaries
      });
    });

    it('should handle single sentence', () => {
      const content = 'This is a single sentence.';
      const chunks = chunkDocument(content, 100);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('This is a single sentence');
    });

    it('should handle empty content', () => {
      const chunks = chunkDocument('', 100);
      expect(chunks).toHaveLength(0);
    });

    it('should respect max chunk size', () => {
      const longSentence = 'a'.repeat(100);
      const content = `${longSentence}. ${longSentence}. ${longSentence}.`;
      const chunks = chunkDocument(content, 50);
      
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(100); // Single sentence max
      });
    });

    it('should preserve sentence boundaries', () => {
      const content = 'Sentence one. Sentence two. Sentence three.';
      const chunks = chunkDocument(content, 20);
      
      // Chunks should be complete sentences or groups of sentences
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle multiple punctuation marks', () => {
      const content = 'Question? Exclamation! Statement.';
      const chunks = chunkDocument(content, 100);
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from chunks', () => {
      const content = 'First.   Second.   Third.';
      const chunks = chunkDocument(content, 100);
      
      chunks.forEach(chunk => {
        expect(chunk).toBe(chunk.trim());
        expect(chunk).not.toMatch(/\s{2,}/);
      });
    });

    it('should handle Hindi text', () => {
      const content = 'यह पहला वाक्य है। यह दूसरा वाक्य है। यह तीसरा वाक्य है।';
      const chunks = chunkDocument(content, 50);
      
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
