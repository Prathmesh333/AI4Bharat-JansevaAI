// Tests for conversational form filling

import { generateQuestion, parseResponse, validateField, getNextQuestion } from '../../../src/services/form/conversational';
import { FormField, FormTemplate, Language } from '../../../src/types';

describe('Conversational Form', () => {
  const mockField: FormField = {
    fieldId: 'name',
    fieldName: 'Full Name',
    fieldType: 'text',
    required: true,
    question: {
      [Language.ENGLISH]: 'What is your full name?',
      [Language.HINDI]: 'आपका पूरा नाम क्या है?',
      [Language.BENGALI]: 'আপনার পুরো নাম কি?',
      [Language.TELUGU]: 'మీ పూర్తి పేరు ఏమిటి?',
      [Language.MARATHI]: 'तुमचे पूर्ण नाव काय आहे?',
      [Language.TAMIL]: 'உங்கள் முழு பெயர் என்ன?',
      [Language.GUJARATI]: 'તમારું પૂરું નામ શું છે?',
      [Language.KANNADA]: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಏನು?',
      [Language.MALAYALAM]: 'നിങ്ങളുടെ മുഴുവൻ പേര് എന്താണ്?',
      [Language.PUNJABI]: 'ਤੁਹਾਡਾ ਪੂਰਾ ਨਾਮ ਕੀ ਹੈ?',
      [Language.ODIA]: 'ଆପଣଙ୍କର ସମ୍ପୂର୍ଣ୍ଣ ନାମ କଣ?',
    },
  };

  describe('generateQuestion', () => {
    it('should generate question in English', () => {
      const question = generateQuestion(mockField, Language.ENGLISH);
      
      expect(question.question).toBe('What is your full name?');
      expect(question.fieldId).toBe('name');
      expect(question.fieldType).toBe('text');
      expect(question.required).toBe(true);
    });

    it('should generate question in Hindi', () => {
      const question = generateQuestion(mockField, Language.HINDI);
      expect(question.question).toContain('नाम');
    });

    it('should fallback to English if language not available', () => {
      const fieldWithoutTranslation: FormField = {
        ...mockField,
        question: {
          [Language.ENGLISH]: 'English question',
          [Language.HINDI]: '',
          [Language.BENGALI]: '',
          [Language.TELUGU]: '',
          [Language.MARATHI]: '',
          [Language.TAMIL]: '',
          [Language.GUJARATI]: '',
          [Language.KANNADA]: '',
          [Language.MALAYALAM]: '',
          [Language.PUNJABI]: '',
          [Language.ODIA]: '',
        },
      };
      
      const question = generateQuestion(fieldWithoutTranslation, Language.TAMIL);
      expect(question.question).toBe('English question');
    });
  });

  describe('parseResponse', () => {
    it('should parse text response', () => {
      const result = parseResponse('John Doe', 'text');
      expect(result).toBe('John Doe');
    });

    it('should parse number response', () => {
      const result = parseResponse('25', 'number');
      expect(result).toBe(25);
    });

    it('should return null for invalid number', () => {
      const result = parseResponse('abc', 'number');
      expect(result).toBeNull();
    });

    it('should parse date response', () => {
      const result = parseResponse('15-08-1990', 'date');
      expect(result).toBeTruthy();
    });

    it('should parse checkbox response - yes', () => {
      expect(parseResponse('yes', 'checkbox')).toBe(true);
      expect(parseResponse('हां', 'checkbox')).toBe(true);
      expect(parseResponse('হ্যাঁ', 'checkbox')).toBe(true);
    });

    it('should parse checkbox response - no', () => {
      expect(parseResponse('no', 'checkbox')).toBe(false);
      expect(parseResponse('नहीं', 'checkbox')).toBe(false);
      expect(parseResponse('না', 'checkbox')).toBe(false);
    });

    it('should parse select response with fuzzy matching', () => {
      const options = ['Maharashtra', 'Gujarat', 'Karnataka'];
      const result = parseResponse('maha', 'select', options);
      expect(result).toBe('Maharashtra');
    });

    it('should trim whitespace', () => {
      const result = parseResponse('  John Doe  ', 'text');
      expect(result).toBe('John Doe');
    });
  });

  describe('validateField', () => {
    it('should validate required field with value', () => {
      const result = validateField('John', mockField);
      expect(result.valid).toBe(true);
    });

    it('should fail validation for empty required field', () => {
      const result = validateField('', mockField);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate pattern', () => {
      const emailField: FormField = {
        ...mockField,
        validation: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
      };
      
      expect(validateField('test@example.com', emailField).valid).toBe(true);
      expect(validateField('invalid-email', emailField).valid).toBe(false);
    });

    it('should validate number range', () => {
      const ageField: FormField = {
        ...mockField,
        fieldType: 'number',
        validation: { min: 18, max: 60 },
      };
      
      expect(validateField(25, ageField).valid).toBe(true);
      expect(validateField(15, ageField).valid).toBe(false);
      expect(validateField(65, ageField).valid).toBe(false);
    });
  });

  describe('getNextQuestion', () => {
    const mockTemplate: FormTemplate = {
      formId: 'test-form',
      schemeId: 'test-scheme',
      formName: 'Test Form',
      version: '1.0',
      fields: [
        { ...mockField, fieldId: 'field1' },
        { ...mockField, fieldId: 'field2' },
        { ...mockField, fieldId: 'field3' },
      ],
      pdfTemplateUrl: 'https://example.com/template.pdf',
    };

    it('should return first unfilled field', () => {
      const filledFields = { field1: 'value1' };
      const next = getNextQuestion(mockTemplate, filledFields, Language.ENGLISH);
      
      expect(next).toBeDefined();
      expect(next!.fieldId).toBe('field2');
    });

    it('should return null when all fields filled', () => {
      const filledFields = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      };
      const next = getNextQuestion(mockTemplate, filledFields, Language.ENGLISH);
      
      expect(next).toBeNull();
    });

    it('should skip empty string values', () => {
      const filledFields = { field1: '' };
      const next = getNextQuestion(mockTemplate, filledFields, Language.ENGLISH);
      
      expect(next!.fieldId).toBe('field1');
    });
  });
});
