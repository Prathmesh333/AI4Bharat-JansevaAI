// Error handling utilities

import { Language } from '../types';

export class JanSevaError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'JanSevaError';
  }
}

// Error code categories
export const ErrorCodes = {
  // Authentication & Authorization (1000s)
  AUTH_INVALID_TOKEN: 'JSAI-AUTH-1001',
  AUTH_EXPIRED_TOKEN: 'JSAI-AUTH-1002',
  AUTH_MISSING_TOKEN: 'JSAI-AUTH-1003',
  AUTH_INSUFFICIENT_PERMISSIONS: 'JSAI-AUTH-1004',
  
  // Voice Processing (2000s)
  VOICE_TRANSCRIPTION_FAILED: 'JSAI-VOICE-2001',
  VOICE_UNSUPPORTED_LANGUAGE: 'JSAI-VOICE-2002',
  VOICE_INVALID_AUDIO_FORMAT: 'JSAI-VOICE-2003',
  VOICE_SYNTHESIS_FAILED: 'JSAI-VOICE-2004',
  VOICE_AUDIO_TOO_LARGE: 'JSAI-VOICE-2005',
  
  // Conversation (3000s)
  CONV_SESSION_NOT_FOUND: 'JSAI-CONV-3001',
  CONV_SESSION_EXPIRED: 'JSAI-CONV-3002',
  CONV_INVALID_STATE: 'JSAI-CONV-3003',
  CONV_BEDROCK_ERROR: 'JSAI-CONV-3004',
  CONV_CONTEXT_TOO_LARGE: 'JSAI-CONV-3005',
  
  // Eligibility (4000s)
  ELIG_INSUFFICIENT_DATA: 'JSAI-ELIG-4001',
  ELIG_NO_SCHEMES_FOUND: 'JSAI-ELIG-4002',
  ELIG_SEARCH_FAILED: 'JSAI-ELIG-4003',
  ELIG_INVALID_CRITERIA: 'JSAI-ELIG-4004',
  
  // Form Generation (5000s)
  FORM_TEMPLATE_NOT_FOUND: 'JSAI-FORM-5001',
  FORM_GENERATION_FAILED: 'JSAI-FORM-5002',
  FORM_INVALID_DATA: 'JSAI-FORM-5003',
  FORM_PDF_GENERATION_FAILED: 'JSAI-FORM-5004',
  FORM_REFERENCE_GENERATION_FAILED: 'JSAI-FORM-5005',
  
  // Location Services (6000s)
  LOC_CSC_NOT_FOUND: 'JSAI-LOC-6001',
  LOC_INVALID_COORDINATES: 'JSAI-LOC-6002',
  LOC_GEOCODING_FAILED: 'JSAI-LOC-6003',
  
  // Data Layer (7000s)
  DATA_DYNAMODB_ERROR: 'JSAI-DATA-7001',
  DATA_S3_ERROR: 'JSAI-DATA-7002',
  DATA_OPENSEARCH_ERROR: 'JSAI-DATA-7003',
  DATA_VALIDATION_ERROR: 'JSAI-DATA-7004',
  
  // System (8000s)
  SYS_INTERNAL_ERROR: 'JSAI-SYS-8001',
  SYS_SERVICE_UNAVAILABLE: 'JSAI-SYS-8002',
  SYS_TIMEOUT: 'JSAI-SYS-8003',
  SYS_RATE_LIMIT_EXCEEDED: 'JSAI-SYS-8004',
  SYS_INVALID_REQUEST: 'JSAI-SYS-8005',
};

// Error messages with multilingual support
export const ErrorMessages: Record<string, Record<Language, string>> = {
  [ErrorCodes.VOICE_TRANSCRIPTION_FAILED]: {
    [Language.HINDI]: 'आवाज़ को समझने में समस्या हुई। कृपया फिर से बोलें।',
    [Language.ENGLISH]: 'Failed to understand voice. Please speak again.',
    [Language.BENGALI]: 'ভয়েস বুঝতে ব্যর্থ। আবার বলুন।',
    [Language.TELUGU]: 'వాయిస్ అర్థం చేసుకోవడంలో విఫలమైంది. దయచేసి మళ్లీ మాట్లాడండి.',
    [Language.MARATHI]: 'आवाज समजण्यात अयशस्वी. कृपया पुन्हा बोला.',
    [Language.TAMIL]: 'குரலைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் பேசவும்.',
    [Language.GUJARATI]: 'અવાજ સમજવામાં નિષ્ફળ. કૃપા કરીને ફરીથી બોલો.',
    [Language.KANNADA]: 'ಧ್ವನಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಮಾತನಾಡಿ.',
    [Language.MALAYALAM]: 'ശബ്ദം മനസ്സിലാക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും സംസാരിക്കുക.',
    [Language.PUNJABI]: 'ਆਵਾਜ਼ ਸਮਝਣ ਵਿੱਚ ਅਸਫਲ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।',
    [Language.ODIA]: 'ସ୍ୱର ବୁଝିବାରେ ବିଫଳ | ଦୟାକରି ପୁନର୍ବାର କୁହନ୍ତୁ |',
  },
  [ErrorCodes.CONV_SESSION_EXPIRED]: {
    [Language.HINDI]: 'आपका सत्र समाप्त हो गया है। कृपया नए सत्र से शुरू करें।',
    [Language.ENGLISH]: 'Your session has expired. Please start a new session.',
    [Language.BENGALI]: 'আপনার সেশন মেয়াদ শেষ হয়েছে। নতুন সেশন শুরু করুন।',
    [Language.TELUGU]: 'మీ సెషన్ గడువు ముగిసింది. కొత్త సెషన్ ప్రారంభించండి.',
    [Language.MARATHI]: 'तुमचे सत्र कालबाह्य झाले आहे. नवीन सत्र सुरू करा.',
    [Language.TAMIL]: 'உங்கள் அமர்வு காலாவதியானது. புதிய அமர்வைத் தொடங்கவும்.',
    [Language.GUJARATI]: 'તમારું સત્ર સમાપ્ત થઈ ગયું છે. નવું સત્ર શરૂ કરો.',
    [Language.KANNADA]: 'ನಿಮ್ಮ ಸೆಷನ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಹೊಸ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ.',
    [Language.MALAYALAM]: 'നിങ്ങളുടെ സെഷൻ കാലഹരണപ്പെട്ടു. പുതിയ സെഷൻ ആരംഭിക്കുക.',
    [Language.PUNJABI]: 'ਤੁਹਾਡਾ ਸੈਸ਼ਨ ਮਿਆਦ ਪੁੱਗ ਗਿਆ ਹੈ। ਨਵਾਂ ਸੈਸ਼ਨ ਸ਼ੁਰੂ ਕਰੋ।',
    [Language.ODIA]: 'ଆପଣଙ୍କର ଅଧିବେଶନ ସମାପ୍ତ ହୋଇଛି | ଏକ ନୂତନ ଅଧିବେଶନ ଆରମ୍ଭ କରନ୍ତୁ |',
  },
  [ErrorCodes.ELIG_NO_SCHEMES_FOUND]: {
    [Language.HINDI]: 'आपके लिए कोई योजना नहीं मिली। क्या आप अन्य विकल्प देखना चाहेंगे?',
    [Language.ENGLISH]: 'No schemes found for you. Would you like to see other options?',
    [Language.BENGALI]: 'আপনার জন্য কোনো প্রকল্প পাওয়া যায়নি। অন্যান্য বিকল্প দেখতে চান?',
    [Language.TELUGU]: 'మీ కోసం ఎటువంటి పథకాలు కనుగొనబడలేదు. ఇతర ఎంపికలను చూడాలనుకుంటున్నారా?',
    [Language.MARATHI]: 'तुमच्यासाठी कोणतीही योजना आढळली नाही. इतर पर्याय पहायचे आहेत का?',
    [Language.TAMIL]: 'உங்களுக்கான திட்டங்கள் எதுவும் கிடைக்கவில்லை. மற்ற விருப்பங்களைப் பார்க்க விரும்புகிறீர்களா?',
    [Language.GUJARATI]: 'તમારા માટે કોઈ યોજના મળી નથી. અન્ય વિકલ્પો જોવા માંગો છો?',
    [Language.KANNADA]: 'ನಿಮಗಾಗಿ ಯಾವುದೇ ಯೋಜನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಇತರ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?',
    [Language.MALAYALAM]: 'നിങ്ങൾക്കായി പദ്ധതികളൊന്നും കണ്ടെത്തിയില്ല. മറ്റ് ഓപ്ഷനുകൾ കാണാൻ ആഗ്രഹിക്കുന്നുണ്ടോ?',
    [Language.PUNJABI]: 'ਤੁਹਾਡੇ ਲਈ ਕੋਈ ਸਕੀਮ ਨਹੀਂ ਮਿਲੀ। ਕੀ ਤੁਸੀਂ ਹੋਰ ਵਿਕਲਪ ਦੇਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?',
    [Language.ODIA]: 'ଆପଣଙ୍କ ପାଇଁ କୌଣସି ଯୋଜନା ମିଳିଲା ନାହିଁ | ଅନ୍ୟ ବିକଳ୍ପ ଦେଖିବାକୁ ଚାହୁଁଛନ୍ତି କି?',
  },
};

export function getErrorMessage(code: string, language: Language): string {
  return ErrorMessages[code]?.[language] || ErrorMessages[code]?.[Language.ENGLISH] || 'An error occurred';
}

export function createErrorResponse(error: JanSevaError, language: Language) {
  return {
    code: error.code,
    message: getErrorMessage(error.code, language),
    messageTranslations: ErrorMessages[error.code],
    details: error.details,
    retryable: error.retryable,
  };
}
