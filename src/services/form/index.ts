// Form services - Main entry point

export { generateForm, generateReferenceNumber, getForm } from './generator';
export { generateQuestion, getNextQuestion, parseResponse, validateField } from './conversational';
export type { FormQuestion } from './conversational';
