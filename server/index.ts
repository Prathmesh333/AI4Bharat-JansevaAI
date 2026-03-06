// Local development server for JanSeva AI
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Language, ConversationState, UserProfile, Message } from '../src/types';
import { extractIntent } from '../src/services/conversation/bedrock';
import { transitionState, addMessageToContext, getNextState, resetContext } from '../src/services/conversation/stateManager';
import { checkEligibility } from '../src/services/eligibility/matcher';
import { searchSchemesPaginated } from '../src/services/schemes/search';
import { initializeDatabase, getSchemeCount, getAllCategories, getAllCategoriesWithCounts, getSchemeBySlug, searchSchemesByText, searchSchemesByCategory, searchSchemesByLevel, advancedSearch, getAllSchemes } from '../src/services/schemes/schemeDatabase';
import { detectLanguage } from '../src/services/voice/transcribe';
import { findNearestCSC } from '../src/services/location/csc';
import { getDocumentGuidance } from '../src/services/location/documents';
import { generateAIResponse, evaluateEligibilityRAG } from './gemini';
import { generateDynamicTemplate, extractDocumentChecklist } from '../src/services/form/dynamicTemplate';
import { generatePrintableForm, FormData } from '../src/services/form/pdfGenerator';
import { saveForm, getAllSavedForms, getSavedFormById, deleteSavedForm } from './formStorage';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = path.resolve(__dirname, 'public');
const rawCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = rawCorsOrigins.length > 0
  ? {
      origin: (origin, callback) => {
        if (!origin || rawCorsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
    }
  : {
      origin: true,
    };

const FORM_FIELD_ALIASES: Record<string, string> = {
  applicant_name: 'full_name',
  name: 'full_name',
  guardian_name: 'father_name',
  husband_name: 'father_name',
  dob: 'date_of_birth',
  dateOfBirth: 'date_of_birth',
  aadhaar: 'aadhaar_number',
  aadhaar_no: 'aadhaar_number',
  aadhaarNo: 'aadhaar_number',
  mobile: 'mobile_number',
  phone: 'mobile_number',
  mobileNo: 'mobile_number',
  mobile_no: 'mobile_number',
  pin: 'pincode',
  pin_code: 'pincode',
  caste: 'caste_category',
  education: 'education_level',
  educational_qualification: 'education_level',
  qualification: 'education_level',
  institution: 'institution_name',
  institution_school_college: 'institution_name',
  course: 'course_name',
  course_program: 'course_name',
  course_program_name: 'course_name',
  spouse: 'spouse_name',
  bank_account_number: 'bank_account',
  ifsc: 'ifsc_code',
  bank_name_branch: 'bank_name',
};

function normalizeFormData(rawData: Record<string, unknown> = {}): FormData {
  const normalized: FormData = {};

  for (const [rawKey, rawValue] of Object.entries(rawData)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    const key = rawKey.trim();
    const canonicalKey = FORM_FIELD_ALIASES[key] || key;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const cleanedValue = typeof value === 'string' ? value.trim() : value;

    if (cleanedValue === '') {
      continue;
    }

    const shouldOverride =
      canonicalKey === key ||
      normalized[canonicalKey] === undefined ||
      normalized[canonicalKey] === '';

    if (shouldOverride) {
      normalized[canonicalKey] = cleanedValue as string | number | boolean;
    }
  }

  return normalized;
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(STATIC_DIR));

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
      const { query, language, userProfile, category, level, limit, page, pageSize } = req.body;

      const results = await searchSchemesPaginated({
        text: query || '',
        language: language || Language.ENGLISH,
        userProfile,
        category,
        level,
        limit: limit || pageSize || 10,
        page: page || 1,
        pageSize: pageSize || limit || 10,
      });

      res.json({
        success: true,
        data: results.results,
        total: results.total,
        page: results.page,
        pages: results.pages,
      });
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
    const categories = getAllCategoriesWithCounts();
    res.json({
      success: true,
      data: {
        categories
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
      const formData: FormData = normalizeFormData(userData || {});
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
  app.get('/api/schemes/form/print/:slug', async (req, res) => {
    try {
      const scheme = getSchemeBySlug(req.params.slug);
      if (!scheme) {
        res.status(404).send('Scheme not found');
        return;
      }

      const template = generateDynamicTemplate(scheme);

      // Parse query params as form data
      const rawFormData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'lang') {
          rawFormData[key] = value;
        }
      }
      const formData = normalizeFormData(rawFormData);

      // Auto-save the form if it has any user data
      const hasUserData = Object.keys(formData).length > 0;
      if (hasUserData) {
        try {
          const saved = await saveForm(
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
  app.get('/api/forms/saved', async (req, res) => {
    try {
      const forms = await getAllSavedForms();
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
  app.get('/api/forms/saved/:id', async (req, res) => {
    try {
      const form = await getSavedFormById(req.params.id);
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
  app.delete('/api/forms/saved/:id', async (req, res) => {
    try {
      const deleted = await deleteSavedForm(req.params.id);
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
      const { userProfile, category, level, slug } = req.body;

      // Search for relevant schemes using advanced search
      // Search for a broad set of schemes so the matcher has enough data
      let csvSchemes;
      if (slug) {
        const targetedScheme = getSchemeBySlug(slug);
        if (!targetedScheme) {
          res.status(404).json({
            success: false,
            error: { message: 'Scheme not found for eligibility check' },
          });
          return;
        }
        csvSchemes = [targetedScheme];
      } else {
        csvSchemes = advancedSearch({
          category,
          level,
          limit: 40, // Reduced to 40 to prevent Gemini token truncation error
        });
      }

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
      let results = await evaluateEligibilityRAG(userProfile, schemes as any);
      if (slug && results.length === 0) {
        // For single-scheme checks, fall back to the deterministic matcher so the UI still gets a result.
        results = await checkEligibility(userProfile, schemes as any);
      }

      res.json({
        success: true,
        data: {
          eligibleSchemes: results,
          ineligibleSchemes: slug ? results.filter(r => !r.eligible) : []
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
