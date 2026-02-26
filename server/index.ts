// Local development server for JanSeva AI
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Language, ConversationState, UserProfile, Message } from '../src/types';
import { extractIntent } from '../src/services/conversation/bedrock';
import { transitionState, addMessageToContext, getNextState, resetContext } from '../src/services/conversation/stateManager';
import { checkEligibility } from '../src/services/eligibility/matcher';
import { searchSchemes } from '../src/services/schemes/search';
import { detectLanguage } from '../src/services/voice/transcribe';
import { findNearestCSC } from '../src/services/location/csc';
import { getDocumentGuidance } from '../src/services/location/documents';
import { generateAIResponse } from './gemini';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('server/public'));

// In-memory session storage
const sessions = new Map<string, any>();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JanSeva AI Local Server Running' });
});

// Create session
app.post('/api/session', (req, res) => {
  const { language } = req.body;
  const sessionId = `session-${Date.now()}`;
  
  sessions.set(sessionId, {
    sessionId,
    language: language || Language.ENGLISH,
    state: ConversationState.INITIATED,
    context: resetContext(),
    createdAt: Date.now(),
  });
  
  res.json({
    success: true,
    data: sessions.get(sessionId),
  });
});

// Get session
app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  
  if (!session) {
    res.status(404).json({
      success: false,
      error: { message: 'Session not found' },
    });
    return;
  }
  
  res.json({ success: true, data: session });
});

// Send message
app.post('/api/message', async (req, res) => {
  const { sessionId, message } = req.body;
  const session = sessions.get(sessionId);
  
  if (!session) {
    res.status(404).json({
      success: false,
      error: { message: 'Session not found' },
    });
    return;
  }
  
  try {
    // Detect language if not set
    const detectedLang = detectLanguage(message);
    
    // Add user message to context
    let context = addMessageToContext(
      session.context,
      'user',
      message,
      session.language
    );
    
    // Extract intent
    const intent = extractIntent(message);
    context.currentIntent = intent;
    
    // Generate AI response using Gemini
    const conversationHistory = context.conversationHistory.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    const response = await generateAIResponse(
      message,
      conversationHistory,
      session.language
    );
    
    // Update state based on intent
    if (intent === 'discover_schemes' || intent === 'check_eligibility') {
      session.state = ConversationState.COLLECTING_PROFILE;
    } else if (intent === 'apply_for_scheme') {
      session.state = ConversationState.FILLING_FORM;
    } else if (intent === 'find_location') {
      session.state = ConversationState.PROVIDING_LOCATION;
    }
    
    // Add assistant response to context
    context = addMessageToContext(context, 'assistant', response, session.language);
    
    // Update session
    session.context = context;
    sessions.set(sessionId, session);
    
    res.json({
      success: true,
      data: {
        message: response,
        intent,
        state: session.state,
        detectedLanguage: detectedLang,
      },
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

// Search schemes
app.post('/api/schemes/search', async (req, res) => {
  try {
    const { query, language, userProfile } = req.body;
    
    const results = await searchSchemes({
      text: query,
      language: language || Language.ENGLISH,
      userProfile,
      limit: 10,
    });
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

// Check eligibility
app.post('/api/eligibility/check', async (req, res) => {
  try {
    const { userProfile } = req.body;
    
    // Get schemes
    const schemeResults = await searchSchemes({
      text: 'scheme',
      language: Language.ENGLISH,
      userProfile,
      limit: 5,
    });
    
    // Mock scheme data
    const schemes = schemeResults.map(s => ({
      schemeId: s.schemeId,
      name: s.schemeName,
      nameTranslations: {} as any,
      description: s.excerpt,
      descriptionTranslations: {} as any,
      ministry: 'Government',
      category: 'Welfare',
      benefits: ['Financial support'],
      eligibilityCriteria: {
        occupation: ['farmer'],
        landOwnership: true,
      },
      documents: ['Aadhaar', 'Income Certificate'],
      applicationProcess: 'Online',
      officialUrl: 'https://example.gov.in',
      lastUpdated: Date.now(),
    }));
    
    const results = await checkEligibility(userProfile, schemes);
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

// Find CSC
app.post('/api/location/csc', async (req, res) => {
  try {
    const { state, district, pincode } = req.body;
    
    const results = await findNearestCSC({
      state,
      district,
      pincode,
    });
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

// Get document guidance
app.get('/api/documents/:schemeId', (req, res) => {
  try {
    const mockScheme = {
      schemeId: req.params.schemeId,
      name: 'Sample Scheme',
      nameTranslations: {} as any,
      description: 'Sample scheme',
      descriptionTranslations: {} as any,
      ministry: 'Government',
      category: 'Welfare',
      benefits: ['Support'],
      eligibilityCriteria: {},
      documents: ['Aadhaar', 'Income Certificate', 'Bank account'],
      applicationProcess: 'Online',
      officialUrl: 'https://example.gov.in',
      lastUpdated: Date.now(),
    };
    
    const guidance = getDocumentGuidance(mockScheme, Language.ENGLISH);
    
    res.json({ success: true, data: guidance });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

// Detect language
app.post('/api/language/detect', (req, res) => {
  try {
    const { text } = req.body;
    const language = detectLanguage(text);
    
    res.json({ success: true, data: { language } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: (error as Error).message },
    });
  }
});

app.listen(PORT, () => {
  console.log('\n🎯 JanSeva AI - Local Development Server');
  console.log('Seva Har Samasya Ki (Service for Every Problem)\n');
  console.log('='.repeat(60));
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`\n📱 Open http://localhost:${PORT} in your browser`);
  console.log('\n📚 API Endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/session');
  console.log('  GET  /api/session/:sessionId');
  console.log('  POST /api/message');
  console.log('  POST /api/schemes/search');
  console.log('  POST /api/eligibility/check');
  console.log('  POST /api/location/csc');
  console.log('  GET  /api/documents/:schemeId');
  console.log('  POST /api/language/detect');
  console.log('\n' + '='.repeat(60));
  console.log('\nPress Ctrl+C to stop the server\n');
});
