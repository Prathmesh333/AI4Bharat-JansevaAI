// Tests for Transcribe speech-to-text service

import { detectLanguage } from '../../../src/services/voice/transcribe';
import { Language } from '../../../src/types';

describe('Transcribe Service', () => {
  describe('detectLanguage', () => {
    it('should detect Hindi from Devanagari script', () => {
      const hindiText = 'नमस्ते, मैं आपकी कैसे मदद कर सकता हूं?';
      expect(detectLanguage(hindiText)).toBe(Language.HINDI);
    });

    it('should detect Bengali from Bengali script', () => {
      const bengaliText = 'নমস্কার, আমি কিভাবে সাহায্য করতে পারি?';
      expect(detectLanguage(bengaliText)).toBe(Language.BENGALI);
    });

    it('should detect Telugu from Telugu script', () => {
      const teluguText = 'నమస్కారం, నేను ఎలా సహాయం చేయగలను?';
      expect(detectLanguage(teluguText)).toBe(Language.TELUGU);
    });

    it('should detect Tamil from Tamil script', () => {
      const tamilText = 'வணக்கம், நான் எப்படி உதவ முடியும்?';
      expect(detectLanguage(tamilText)).toBe(Language.TAMIL);
    });

    it('should detect Gujarati from Gujarati script', () => {
      const gujaratiText = 'નમસ્તે, હું કેવી રીતે મદદ કરી શકું?';
      expect(detectLanguage(gujaratiText)).toBe(Language.GUJARATI);
    });

    it('should detect Kannada from Kannada script', () => {
      const kannadaText = 'ನಮಸ್ಕಾರ, ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?';
      expect(detectLanguage(kannadaText)).toBe(Language.KANNADA);
    });

    it('should detect Malayalam from Malayalam script', () => {
      const malayalamText = 'നമസ്കാരം, എനിക്ക് എങ്ങനെ സഹായിക്കാം?';
      expect(detectLanguage(malayalamText)).toBe(Language.MALAYALAM);
    });

    it('should detect Punjabi from Gurmukhi script', () => {
      const punjabiText = 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?';
      expect(detectLanguage(punjabiText)).toBe(Language.PUNJABI);
    });

    it('should detect Odia from Odia script', () => {
      const odiaText = 'ନମସ୍କାର, ମୁଁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?';
      expect(detectLanguage(odiaText)).toBe(Language.ODIA);
    });

    it('should default to English for Latin script', () => {
      const englishText = 'Hello, how can I help you?';
      expect(detectLanguage(englishText)).toBe(Language.ENGLISH);
    });

    it('should handle mixed script text', () => {
      const mixedText = 'Hello नमस्ते';
      // Should detect based on first matching pattern
      expect([Language.HINDI, Language.ENGLISH]).toContain(detectLanguage(mixedText));
    });
  });
});
