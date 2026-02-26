// Conversational form filling

import { FormField, FormTemplate, Language } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ConversationalForm');

export interface FormQuestion {
  fieldId: string;
  question: string;
  fieldType: string;
  required: boolean;
  options?: string[];
  validation?: any;
}

export function generateQuestion(field: FormField, language: Language): FormQuestion {
  const question = field.question[language] || field.question[Language.ENGLISH];
  
  return {
    fieldId: field.fieldId,
    question,
    fieldType: field.fieldType,
    required: field.required,
    options: field.options,
    validation: field.validation,
  };
}

export function getNextQuestion(
  template: FormTemplate,
  filledFields: Record<string, any>,
  language: Language
): FormQuestion | null {
  // Find first unfilled field
  for (const field of template.fields) {
    if (!filledFields[field.fieldId] || filledFields[field.fieldId] === '') {
      return generateQuestion(field, language);
    }
  }
  
  return null; // All fields filled
}

export function parseResponse(
  response: string,
  fieldType: string,
  options?: string[]
): any {
  const trimmed = response.trim();
  
  switch (fieldType) {
    case 'number':
      const num = parseFloat(trimmed);
      return isNaN(num) ? null : num;
      
    case 'date':
      // Parse various date formats
      const date = parseDate(trimmed);
      return date ? date.toISOString() : null;
      
    case 'select':
      if (options) {
        // Fuzzy match against options
        const match = options.find(opt => 
          opt.toLowerCase().includes(trimmed.toLowerCase()) ||
          trimmed.toLowerCase().includes(opt.toLowerCase())
        );
        return match || null;
      }
      return trimmed;
      
    case 'checkbox':
      return parseBoolean(trimmed);
      
    case 'text':
    default:
      return trimmed;
  }
}

function parseDate(dateString: string): Date | null {
  // Try various date formats
  const formats = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      // Try to parse the date
      let date: Date;
      if (format === formats[0]) {
        // DD-MM-YYYY format
        const [, day, month, year] = match;
        date = new Date(`${year}-${month}-${day}`);
      } else {
        // YYYY-MM-DD format
        date = new Date(dateString);
      }
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase();
  const yesWords = ['yes', 'y', 'true', 'हां', 'हाँ', 'হ্যাঁ', 'అవును', 'होय', 'ஆம்'];
  const noWords = ['no', 'n', 'false', 'नहीं', 'না', 'కాదు', 'नाही', 'இல்லை'];
  
  if (yesWords.some(word => lower.includes(word))) return true;
  if (noWords.some(word => lower.includes(word))) return false;
  
  return false;
}

export function validateField(value: any, field: FormField): { valid: boolean; error?: string } {
  if (field.required && (!value || value === '')) {
    return { valid: false, error: 'This field is required' };
  }
  
  if (!field.validation) {
    return { valid: true };
  }
  
  const validation = field.validation;
  
  // Pattern validation
  if (validation.pattern && typeof value === 'string') {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return { valid: false, error: 'Invalid format' };
    }
  }
  
  // Number range validation
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return { valid: false, error: `Minimum value is ${validation.min}` };
    }
    if (validation.max !== undefined && value > validation.max) {
      return { valid: false, error: `Maximum value is ${validation.max}` };
    }
  }
  
  return { valid: true };
}
