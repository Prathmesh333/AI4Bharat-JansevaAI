// Tests for logging utility

import { createLogger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('TestContext');
      expect(logger).toBeDefined();
    });
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      const logger = createLogger('TestContext');
      logger.debug('Debug message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      expect(logEntry.level).toBe(LogLevel.DEBUG);
      expect(logEntry.message).toBe('Debug message');
      expect(logEntry.context).toBe('TestContext');
      expect(logEntry.meta).toEqual({ key: 'value' });
    });

    it('should log info messages', () => {
      const logger = createLogger('TestContext');
      logger.info('Info message');

      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.message).toBe('Info message');
    });

    it('should log warn messages', () => {
      const logger = createLogger('TestContext');
      logger.warn('Warning message', { warning: true });

      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logEntry.level).toBe(LogLevel.WARN);
      expect(logEntry.message).toBe('Warning message');
      expect(logEntry.meta).toEqual({ warning: true });
    });

    it('should log error messages with error object', () => {
      const logger = createLogger('TestContext');
      const error = new Error('Test error');
      logger.error('Error occurred', error, { additional: 'data' });

      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.message).toBe('Error occurred');
      expect(logEntry.meta.error.name).toBe('Error');
      expect(logEntry.meta.error.message).toBe('Test error');
      expect(logEntry.meta.error.stack).toBeDefined();
      expect(logEntry.meta.additional).toBe('data');
    });
  });

  describe('log format', () => {
    it('should include timestamp in ISO format', () => {
      const logger = createLogger('TestContext');
      logger.info('Test message');

      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should output valid JSON', () => {
      const logger = createLogger('TestContext');
      logger.info('Test message', { nested: { data: 'value' } });

      expect(() => {
        JSON.parse(consoleLogSpy.mock.calls[0][0]);
      }).not.toThrow();
    });

    it('should handle messages without metadata', () => {
      const logger = createLogger('TestContext');
      logger.info('Simple message');

      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logEntry.meta).toBeUndefined();
    });
  });
});
