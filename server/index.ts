// Local development server for JanSeva AI
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Language, ConversationState, UserProfile, Message } from '../src/types';
import { extractIntent } from '../src/services/conversation/bedrock';
import { transitionState, addMessageToContext, getNextState, resetContext } from '../src/services/conversation/stateManager';
import { checkEligibility } from '../src/services/eligibility/matcher';
import { searchSchemes } from '../src/services/schemes/search';
import { initializeDatabase, getSchemeCount, getAllCategories, getSchemeBySlug, searchSchemesByText, searchSchemesByCategory, searchSchemesByLevel, advancedSearch, getAllSchemes } from '../src/services/schemes/schemeDatabase';
import { detectLanguage } from '../src/services/voice/transcribe';
import { findNearestCSC } from '../src/services/location/csc';
import { getDocumentGuidance } from '../src/services/location/documents';
import { generateAIResponse, evaluateEligibilityRAG } from './gemini';
import { generateDynamicTemplate, extractDocumentChecklist } from '../src/services/form/dynamicTemplate';
import { generatePrintableForm, FormData } from '../src/services/form/pdfGenerator';
import { saveForm, getAllSavedForms, getSavedFormById, deleteSavedForm } from './formStorage';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('server/public'));

// In-memory session storage
const sessions = new Map<string, any>();

// ========================================
// Initialize Database on Startup
// ========================================
async function startServer() {
  try {
    // Load CSV dataset
    const csvPath = path.resolve(__dirname, '..', 'dataset', 'updated_data.csv');
    console.log('\n Loading government schemes dataset...');
    await initializeDatabase(csvPath);
    console.log(` Loaded ${getSchemeCount()} government schemes`);
    console.log(` ${getAllCategories().length} unique categories`);
  } catch (error) {
    console.error('  Failed to load dataset:', (error as Error).message);
    console.error('   Server will start but scheme search won\'t work.');
  }

  // ========================================
  // Health check
  // ========================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'JanSeva AI Local Server Running',
      schemesLoaded: getSchemeCount(),
      categories: getAllCategories().length,
    });
  });

  // ========================================
  // Session Management
  // ========================================
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

  // ========================================
  // Chat Message — Now with real scheme context
  // ========================================
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

      // Search for relevant schemes based on conversation context (RAG)
      let matchedSchemes: any[] = [];
      const trimmedMessage = message.trim();
      const isJustNumber = /^\d+$/.test(trimmedMessage);

      // We form a search query from the last few user turns to ensure all context (age, state, etc.) is included
      const recentUserMessages = context.conversationHistory
        .filter((msg: Message) => msg.role === 'user')
        .slice(-5)
        .map((msg: Message) => msg.content)
        .join(' ');

      const searchQuery = (recentUserMessages + ' ' + trimmedMessage).trim();

      // We search if the combined query is meaningful, or if the user explicitly typed a command that isn't just a navigation number
      if (searchQuery.length > 5) {
        matchedSchemes = searchSchemesByText(searchQuery, 10);
      }

      // Generate AI response using Gemini — now with scheme context
      const conversationHistory = context.conversationHistory.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await generateAIResponse(
        message,
        conversationHistory,
        session.language,
        matchedSchemes
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
          matchedSchemes: matchedSchemes.slice(0, 3).map(s => ({
            name: s.scheme_name,
            slug: s.slug,
            category: s.schemeCategory,
            level: s.level,
          })),
        },
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Scheme Search — Now using real CSV data
  // ========================================
  app.post('/api/schemes/search', async (req, res) => {
    try {
      const { query, language, userProfile, category, level, limit } = req.body;

      const results = await searchSchemes({
        text: query || '',
        language: language || Language.ENGLISH,
        userProfile,
        category,
        level,
        limit: limit || 10,
      });

      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Get all categories
  // ========================================
  app.get('/api/schemes/categories', (req, res) => {
    const categories = getAllCategories();
    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({ category: cat, count: '100+' }))
      }
    });
  });

  // ========================================
  // Get all schemes (paginated)
  // ========================================
  app.get('/api/schemes', (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = getAllSchemes(page, pageSize);

    res.json({
      success: true,
      data: result.schemes.map(s => ({
        scheme_name: s.scheme_name,
        slug: s.slug,
        category: s.schemeCategory,
        level: s.level,
        tags: s.tags,
        excerpt: s.details.substring(0, 200),
        officialUrl: s.officialUrl,
      })),
      total: result.total,
      page,
      pages: result.pages,
    });
  });

  // ========================================
  // Get scheme details by slug
  // ========================================
  app.get('/api/schemes/:slug', (req, res) => {
    const scheme = getSchemeBySlug(req.params.slug);

    if (!scheme) {
      res.status(404).json({
        success: false,
        error: { message: 'Scheme not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...scheme,
        documentChecklist: extractDocumentChecklist(scheme),
      },
    });
  });

  // ========================================
  // Generate dynamic form template for a scheme
  // ========================================
  app.post('/api/schemes/form/generate', (req, res) => {
    try {
      const { slug } = req.body;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: { message: 'Scheme slug is required' },
        });
        return;
      }

      const scheme = getSchemeBySlug(slug);
      if (!scheme) {
        res.status(404).json({
          success: false,
          error: { message: 'Scheme not found' },
        });
        return;
      }

      const template = generateDynamicTemplate(scheme);

      res.json({
        success: true,
        data: {
          template,
          scheme: {
            name: scheme.scheme_name,
            slug: scheme.slug,
            category: scheme.schemeCategory,
            level: scheme.level,
          },
          documentChecklist: extractDocumentChecklist(scheme),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Fill form and generate printable HTML
  // ========================================
  app.post('/api/schemes/form/fill', (req, res) => {
    try {
      const { slug, userData, language } = req.body;

      if (!slug) {
        res.status(400).json({
          success: false,
          error: { message: 'Scheme slug is required' },
        });
        return;
      }

      const scheme = getSchemeBySlug(slug);
      if (!scheme) {
        res.status(404).json({
          success: false,
          error: { message: 'Scheme not found' },
        });
        return;
      }

      const template = generateDynamicTemplate(scheme);
      const formData: FormData = userData || {};
      const printableHtml = generatePrintableForm(
        scheme,
        template,
        formData,
        language || Language.ENGLISH
      );

      res.json({
        success: true,
        data: {
          html: printableHtml,
          template,
          scheme: {
            name: scheme.scheme_name,
            slug: scheme.slug,
            category: scheme.schemeCategory,
            level: scheme.level,
            officialUrl: scheme.officialUrl,
          },
          documentChecklist: extractDocumentChecklist(scheme),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Serve printable form as HTML page
  // ========================================
  app.get('/api/schemes/form/print/:slug', (req, res) => {
    try {
      const scheme = getSchemeBySlug(req.params.slug);
      if (!scheme) {
        res.status(404).send('Scheme not found');
        return;
      }

      const template = generateDynamicTemplate(scheme);

      // Parse query params as form data
      const formData: FormData = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'lang') {
          formData[key] = value as string;
        }
      }

      // Auto-save the form if it has any user data
      const hasUserData = Object.keys(formData).length > 0;
      if (hasUserData) {
        try {
          const saved = saveForm(
            req.params.slug,
            scheme.scheme_name,
            scheme.level,
            scheme.schemeCategory || 'General',
            formData
          );
          console.log(`Form saved: ${saved.id} for scheme ${scheme.scheme_name}`);
        } catch (err) {
          console.error('Failed to save form:', err);
        }
      }

      const html = generatePrintableForm(
        scheme,
        template,
        formData,
        (req.query.lang as Language) || Language.ENGLISH
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).send('Error generating form');
    }
  });

  // ========================================
  // Saved Forms — Local Storage CRUD
  // ========================================

  // List all saved forms
  app.get('/api/forms/saved', (req, res) => {
    try {
      const forms = getAllSavedForms();
      res.json({
        success: true,
        data: {
          forms,
          total: forms.length,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: (error as Error).message } });
    }
  });

  // Get a saved form by ID
  app.get('/api/forms/saved/:id', (req, res) => {
    try {
      const form = getSavedFormById(req.params.id);
      if (!form) {
        res.status(404).json({ success: false, error: { message: 'Saved form not found' } });
        return;
      }
      res.json({ success: true, data: form });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: (error as Error).message } });
    }
  });

  // Delete a saved form
  app.delete('/api/forms/saved/:id', (req, res) => {
    try {
      const deleted = deleteSavedForm(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: { message: 'Saved form not found' } });
        return;
      }
      res.json({ success: true, message: 'Form deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: (error as Error).message } });
    }
  });

  // ========================================
  // Check eligibility — Now with real scheme data
  // ========================================
  app.post('/api/eligibility/check', async (req, res) => {
    try {
      const { userProfile, category, level } = req.body;

      // Search for relevant schemes using advanced search
      // Search for a broad set of schemes so the matcher has enough data
      const csvSchemes = advancedSearch({
        category,
        level,
        limit: 40, // Reduced to 40 to prevent Gemini token truncation error
      });

      // Convert to Scheme format for the eligibility matcher
      const schemes = csvSchemes.map(s => ({
        schemeId: s.slug || s.scheme_name.toLowerCase().replace(/\s+/g, '-').substring(0, 30),
        name: s.scheme_name,
        nameTranslations: {} as any,
        description: s.details,
        descriptionTranslations: {} as any,
        ministry: 'Government',
        category: s.schemeCategory,
        benefits: [s.benefits.substring(0, 200)],
        eligibilityCriteria: {
          occupation: s.tags.filter(t =>
            ['farmer', 'student', 'labour', 'worker', 'fisherman', 'artisan'].includes(t.toLowerCase())
          ),
          // Extract basic numbers from text to give the matcher something to work with
          minAge: s.eligibility.match(/\b(1[0-9]|2[0-9]|3[0-9])\s*(years|yrs)\b/i) ? parseInt(s.eligibility.match(/\b(1[0-9]|2[0-9]|3[0-9])\s*(years|yrs)\b/i)![1]) : undefined,
          states: s.level === 'State' ? [s.tags.find(t => ['maharashtra', 'delhi', 'uttar pradesh', 'karnataka', 'tamil nadu', 'gujarat', 'west bengal', 'telangana', 'rajasthan'].includes(t.toLowerCase())) || ''] : undefined,
          gender: s.eligibility.toLowerCase().includes('women') || s.eligibility.toLowerCase().includes('female') || s.tags.includes('Women') ? ['female'] : undefined,
          category: s.tags.filter(t => ['sc', 'st', 'obc', 'general'].includes(t.toLowerCase()))
        },
        documents: extractDocumentChecklist(s),
        applicationProcess: s.application.substring(0, 300),
        officialUrl: s.officialUrl,
        lastUpdated: Date.now(),
        rawEligibility: s.eligibility, // Required for RAG
      }));

      // Use the RAG AI evaluator instead of the hardcoded logic
      const results = await evaluateEligibilityRAG(userProfile, schemes as any);

      res.json({
        success: true,
        data: {
          eligibleSchemes: results,
          ineligibleSchemes: []
        },
        totalSchemesSearched: csvSchemes.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Find CSC
  // ========================================
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

  // ========================================
  // Get document guidance
  // ========================================
  app.get('/api/documents/:schemeSlug', (req, res) => {
    try {
      const scheme = getSchemeBySlug(req.params.schemeSlug);

      if (scheme) {
        // Use real scheme data
        const checklist = extractDocumentChecklist(scheme);
        res.json({
          success: true,
          data: {
            schemeName: scheme.scheme_name,
            documents: checklist,
            applicationProcess: scheme.application,
            officialUrl: scheme.officialUrl,
          },
        });
      } else {
        // Fallback to mock
        const mockScheme = {
          schemeId: req.params.schemeSlug,
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
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  });

  // ========================================
  // Detect language
  // ========================================
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

  // ========================================
  // Start server
  // ========================================
  app.listen(PORT, () => {
    console.log('\n JanSeva AI - Local Development Server');
    console.log('Seva Har Samasya Ki (Service for Every Problem)\n');
    console.log('='.repeat(60));
    console.log(`\n Server running at http://localhost:${PORT}`);
    console.log(`\n Open http://localhost:${PORT} in your browser`);
    console.log('\n API Endpoints:');
    console.log('  GET  /api/health');
    console.log('  POST /api/session');
    console.log('  GET  /api/session/:sessionId');
    console.log('  POST /api/message');
    console.log('  ── Schemes ──');
    console.log('  POST /api/schemes/search');
    console.log('  GET  /api/schemes/categories');
    console.log('  GET  /api/schemes?page=1&pageSize=20');
    console.log('  GET  /api/schemes/:slug');
    console.log('  ── Forms ──');
    console.log('  POST /api/schemes/form/generate');
    console.log('  POST /api/schemes/form/fill');
    console.log('  GET  /api/schemes/form/print/:slug');
    console.log('  ── Eligibility & Location ──');
    console.log('  POST /api/eligibility/check');
    console.log('  POST /api/location/csc');
    console.log('  GET  /api/documents/:schemeSlug');
    console.log('  POST /api/language/detect');
    console.log('\n' + '='.repeat(60));
    console.log('\nPress Ctrl+C to stop the server\n');
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
