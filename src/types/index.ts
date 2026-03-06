// Core data models for JanSeva AI

export enum Language {
  HINDI = 'hi',
  ENGLISH = 'en',
  BENGALI = 'bn',
  TELUGU = 'te',
  MARATHI = 'mr',
  TAMIL = 'ta',
  GUJARATI = 'gu',
  KANNADA = 'kn',
  MALAYALAM = 'ml',
  PUNJABI = 'pa',
  ODIA = 'or'
}

export enum ConversationState {
  INITIATED = 'INITIATED',
  LANGUAGE_SELECTED = 'LANGUAGE_SELECTED',
  COLLECTING_PROFILE = 'COLLECTING_PROFILE',
  SHOWING_SCHEMES = 'SHOWING_SCHEMES',
  FILLING_FORM = 'FILLING_FORM',
  PROVIDING_LOCATION = 'PROVIDING_LOCATION',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Session {
  sessionId: string;
  userId?: string;
  language: Language;
  state: ConversationState;
  context: ConversationContext;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface ConversationContext {
  conversationHistory: Message[];
  currentIntent?: string;
  userProfile?: UserProfile;
  selectedSchemes?: string[];
  currentFormId?: string;
  formProgress?: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language: Language;
}

export interface UserProfile {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  state: string;
  district?: string;
  income?: number;
  category?: 'general' | 'obc' | 'sc' | 'st' | 'ews';
  occupation?: string;
  familySize?: number;
  disabilities?: string[];
  landOwnership?: boolean;
  rationCard?: 'apl' | 'bpl' | 'antyodaya';
}

export interface Scheme {
  schemeId: string;
  name: string;
  nameTranslations: Record<Language, string>;
  description: string;
  descriptionTranslations: Record<Language, string>;
  ministry: string;
  category: string;
  benefits: string[];
  eligibilityCriteria: EligibilityCriteria;
  documents: string[];
  applicationProcess: string;
  officialUrl: string;
  lastUpdated: number;
}

export interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  gender?: string[];
  states?: string[];
  income?: { max?: number; min?: number };
  category?: string[];
  occupation?: string[];
  disabilities?: string[];
  landOwnership?: boolean;
  rationCard?: string[];
}

export interface EligibilityResult {
  schemeId: string;
  schemeName: string;
  eligible: boolean;
  matchScore: number;
  estimatedBenefit?: string;
  missingCriteria?: string[];
  requiredDocuments: string[];
}

export interface FormTemplate {
  formId: string;
  schemeId: string;
  formName: string;
  version: string;
  fields: FormField[];
  pdfTemplateUrl: string;
}

export interface FormField {
  fieldId: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file';
  required: boolean;
  question: Record<Language, string>;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface GeneratedForm {
  formId: string;
  schemeId: string;
  userId: string;
  referenceNumber: string;
  fields: Record<string, any>;
  completionPercentage: number;
  pdfUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CSCLocation {
  cscId: string;
  name: string;
  address: string;
  state: string;
  district: string;
  pincode: string;
  latitude: number;
  longitude: number;
  contactNumber: string;
  email?: string;
  operatingHours: string;
  servicesOffered: string[];
  distance?: number;
  mapsUrl?: string;
  directionsUrl?: string;
  source?: 'catalog' | 'google_places' | 'maps_search';
  note?: string;
}

export interface VoiceInput {
  audioData: Buffer;
  format: 'wav' | 'mp3' | 'ogg';
  language?: Language;
}

export interface VoiceOutput {
  text: string;
  audioData: Buffer;
  format: 'mp3';
  language: Language;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  detectedLanguage: Language;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  timestamp: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  messageTranslations?: Record<Language, string>;
  details?: any;
  retryable: boolean;
}
