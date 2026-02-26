// Tests for Bedrock conversation service

import { extractIntent, validateContextSize } from '../../../src/services/conversation/bedrock';
import { ConversationContext, Language } from '../../../src/types';
import { JanSevaError } from '../../../src/utils/errors';

describe('Bedrock Service', () => {
  describe('extractIntent', () => {
    it('should extract discover_schemes intent', () => {
      expect(extractIntent('Tell me about schemes')).toBe('discover_schemes');
      expect(extractIntent('What schemes are available?')).toBe('discover_schemes');
      expect(extractIntent('मुझे योजना के बारे में बताएं')).toBe('discover_schemes');
    });

    it('should extract apply_for_scheme intent', () => {
      expect(extractIntent('I want to apply')).toBe('apply_for_scheme');
      expect(extractIntent('How do I apply for this?')).toBe('apply_for_scheme');
      expect(extractIntent('मैं आवेदन करना चाहता हूं')).toBe('apply_for_scheme');
    });

    it('should extract fill_form intent', () => {
      expect(extractIntent('Help me fill the form')).toBe('fill_form');
      expect(extractIntent('I need to complete the form')).toBe('fill_form');
      expect(extractIntent('फॉर्म भरने में मदद करें')).toBe('fill_form');
    });

    it('should extract check_eligibility intent', () => {
      expect(extractIntent('Am I eligible?')).toBe('check_eligibility');
      expect(extractIntent('check if I am eligible')).toBe('check_eligibility');
      expect(extractIntent('क्या मैं पात्र हूं?')).toBe('check_eligibility');
    });

    it('should extract document_guidance intent', () => {
      expect(extractIntent('What documents do I need?')).toBe('document_guidance');
      expect(extractIntent('Required documents')).toBe('document_guidance');
      expect(extractIntent('कौन से दस्तावेज चाहिए?')).toBe('document_guidance');
    });

    it('should extract find_location intent', () => {
      expect(extractIntent('Where is the nearest office?')).toBe('find_location');
      expect(extractIntent('Find CSC center near me')).toBe('find_location');
      expect(extractIntent('नजदीकी कार्यालय कहां है?')).toBe('find_location');
    });

    it('should default to general_inquiry for unknown intent', () => {
      expect(extractIntent('Hello')).toBe('general_inquiry');
      expect(extractIntent('Thank you')).toBe('general_inquiry');
      expect(extractIntent('Random text')).toBe('general_inquiry');
    });

    it('should be case insensitive', () => {
      expect(extractIntent('SCHEME')).toBe('discover_schemes');
      expect(extractIntent('Apply')).toBe('apply_for_scheme');
      expect(extractIntent('FORM')).toBe('fill_form');
    });
  });

  describe('validateContextSize', () => {
    it('should pass for small context', () => {
      const context: ConversationContext = {
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: Date.now(), language: Language.ENGLISH },
        ],
      };
      
      expect(() => validateContextSize(context)).not.toThrow();
    });

    it('should pass for moderate context', () => {
      const context: ConversationContext = {
        conversationHistory: Array(20).fill(null).map(() => ({
          role: 'user' as const,
          content: 'This is a test message',
          timestamp: Date.now(),
          language: Language.ENGLISH,
        })),
      };
      
      expect(() => validateContextSize(context)).not.toThrow();
    });

    it('should throw error for oversized context', () => {
      const largeMessage = 'x'.repeat(10000);
      const context: ConversationContext = {
        conversationHistory: Array(20).fill(null).map(() => ({
          role: 'user' as const,
          content: largeMessage,
          timestamp: Date.now(),
          language: Language.ENGLISH,
        })),
      };
      
      expect(() => validateContextSize(context)).toThrow(JanSevaError);
    });

    it('should include context size in error details', () => {
      const largeMessage = 'x'.repeat(10000);
      const context: ConversationContext = {
        conversationHistory: Array(20).fill(null).map(() => ({
          role: 'user' as const,
          content: largeMessage,
          timestamp: Date.now(),
          language: Language.ENGLISH,
        })),
      };
      
      try {
        validateContextSize(context);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(JanSevaError);
        expect((error as JanSevaError).details).toHaveProperty('size');
        expect((error as JanSevaError).details).toHaveProperty('maxSize');
      }
    });
  });
});
