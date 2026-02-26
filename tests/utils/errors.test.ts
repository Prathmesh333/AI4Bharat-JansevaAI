// Tests for error handling utilities

import { JanSevaError, ErrorCodes, getErrorMessage, createErrorResponse } from '../../src/utils/errors';
import { Language } from '../../src/types';

describe('Error Utilities', () => {
  describe('JanSevaError', () => {
    it('should create error with code and message', () => {
      const error = new JanSevaError(ErrorCodes.VOICE_TRANSCRIPTION_FAILED, 'Test error', false);
      
      expect(error.code).toBe(ErrorCodes.VOICE_TRANSCRIPTION_FAILED);
      expect(error.message).toBe('Test error');
      expect(error.retryable).toBe(false);
      expect(error.name).toBe('JanSevaError');
    });

    it('should support retryable flag', () => {
      const retryableError = new JanSevaError(ErrorCodes.SYS_TIMEOUT, 'Timeout', true);
      expect(retryableError.retryable).toBe(true);
    });

    it('should support additional details', () => {
      const error = new JanSevaError(
        ErrorCodes.DATA_VALIDATION_ERROR,
        'Validation failed',
        false,
        { field: 'age', value: -1 }
      );
      
      expect(error.details).toEqual({ field: 'age', value: -1 });
    });
  });

  describe('getErrorMessage', () => {
    it('should return Hindi message for Hindi language', () => {
      const message = getErrorMessage(ErrorCodes.VOICE_TRANSCRIPTION_FAILED, Language.HINDI);
      expect(message).toContain('आवाज़');
    });

    it('should return English message for English language', () => {
      const message = getErrorMessage(ErrorCodes.VOICE_TRANSCRIPTION_FAILED, Language.ENGLISH);
      expect(message).toContain('Failed to understand voice');
    });

    it('should return Bengali message for Bengali language', () => {
      const message = getErrorMessage(ErrorCodes.CONV_SESSION_EXPIRED, Language.BENGALI);
      expect(message).toContain('সেশন');
    });

    it('should fallback to English for unknown error code', () => {
      const message = getErrorMessage('UNKNOWN_CODE', Language.HINDI);
      expect(message).toBe('An error occurred');
    });

    it('should fallback to English if language not available', () => {
      const message = getErrorMessage(ErrorCodes.VOICE_TRANSCRIPTION_FAILED, 'unknown' as Language);
      expect(message).toContain('Failed to understand voice');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with all fields', () => {
      const error = new JanSevaError(
        ErrorCodes.ELIG_NO_SCHEMES_FOUND,
        'No schemes',
        false,
        { criteria: 'age' }
      );
      
      const response = createErrorResponse(error, Language.HINDI);
      
      expect(response.code).toBe(ErrorCodes.ELIG_NO_SCHEMES_FOUND);
      expect(response.message).toContain('योजना');
      expect(response.messageTranslations).toBeDefined();
      expect(response.messageTranslations![Language.ENGLISH]).toContain('No schemes found');
      expect(response.details).toEqual({ criteria: 'age' });
      expect(response.retryable).toBe(false);
    });

    it('should include translations for all supported languages', () => {
      const error = new JanSevaError(ErrorCodes.VOICE_TRANSCRIPTION_FAILED, 'Test', false);
      const response = createErrorResponse(error, Language.ENGLISH);
      
      expect(response.messageTranslations).toBeDefined();
      expect(response.messageTranslations![Language.HINDI]).toBeDefined();
      expect(response.messageTranslations![Language.BENGALI]).toBeDefined();
      expect(response.messageTranslations![Language.TAMIL]).toBeDefined();
    });
  });

  describe('ErrorCodes', () => {
    it('should have correct format for all error codes', () => {
      const codes = Object.values(ErrorCodes);
      
      codes.forEach(code => {
        expect(code).toMatch(/^JSAI-[A-Z]+-\d{4}$/);
      });
    });

    it('should have unique error codes', () => {
      const codes = Object.values(ErrorCodes);
      const uniqueCodes = new Set(codes);
      
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should categorize errors correctly', () => {
      expect(ErrorCodes.AUTH_INVALID_TOKEN).toContain('AUTH');
      expect(ErrorCodes.VOICE_TRANSCRIPTION_FAILED).toContain('VOICE');
      expect(ErrorCodes.CONV_SESSION_EXPIRED).toContain('CONV');
      expect(ErrorCodes.ELIG_NO_SCHEMES_FOUND).toContain('ELIG');
      expect(ErrorCodes.FORM_GENERATION_FAILED).toContain('FORM');
      expect(ErrorCodes.LOC_CSC_NOT_FOUND).toContain('LOC');
      expect(ErrorCodes.DATA_DYNAMODB_ERROR).toContain('DATA');
      expect(ErrorCodes.SYS_INTERNAL_ERROR).toContain('SYS');
    });
  });
});
