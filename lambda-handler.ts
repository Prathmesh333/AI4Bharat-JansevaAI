// Lambda handler for Express app
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Language, ConversationState, Message } from './src/types';
import { extractIntent } from './src/services/conversation/bedrock';
import { addMessageToContext, resetContext } from './src/services/conversation/stateManager';
import { checkEligibility } from './src/services/eligibility/matcher';
import { searchSchemesPaginated } from './src/services/schemes/search';
import { initializeDatabase, getSchemeCount, getAllCategories, getAllCategoriesWithCounts, getSchemeBySlug, searchSchemesByText, getAllSchemes, resolveSchemeByIdentifier } from './src/services/schemes/schemeDatabase';
import { generateAIResponse } from './server/gemini';
import { extractDocumentChecklist, generateDynamicTemplate } from './src/services/form/dynamicTemplate';
import { generatePrintableForm, FormData } from './src/services/form/pdfGenerator';
import { findNearestCSC } from './src/services/location/csc';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const sessions = new Map<string, any>();
let dbInitialized = false;

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

async function ensureDatabase() {
  if (dbInitialized) return;
  const csvPath = path.resolve(__dirname, 'dataset', 'updated_data.csv');
  await initializeDatabase(csvPath);
  dbInitialized = true;
}

app.get('/', (req, res) => res.json({ message: 'JanSeva AI API', version: '1.0.0' }));

app.get('/api/health', async (req, res) => {
  await ensureDatabase();
  res.json({ status: 'ok', schemesLoaded: getSchemeCount(), categories: getAllCategories().length });
});

app.get('/api/schemes/categories', async (req, res) => {
  await ensureDatabase();
  res.json({ success: true, data: { categories: getAllCategoriesWithCounts() } });
});

app.get('/api/schemes', async (req, res) => {
  await ensureDatabase();
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

app.get('/api/schemes/:slug', async (req, res) => {
  await ensureDatabase();
  const scheme = getSchemeBySlug(req.params.slug);
  if (!scheme) return res.status(404).json({ success: false, error: { message: 'Scheme not found' } });
  res.json({ success: true, data: { ...scheme, documentChecklist: extractDocumentChecklist(scheme) } });
});

app.post('/api/session', (req, res) => {
  const sessionId = `session-${Date.now()}`;
  sessions.set(sessionId, {
    sessionId,
    language: req.body.language || Language.ENGLISH,
    state: ConversationState.INITIATED,
    context: resetContext(),
    createdAt: Date.now(),
  });
  res.json({ success: true, data: sessions.get(sessionId) });
});

app.post('/api/message', async (req, res) => {
  await ensureDatabase();
  const { sessionId, message } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ success: false, error: { message: 'Session not found' } });

  try {
    let context = addMessageToContext(session.context, 'user', message, session.language);
    const intent = extractIntent(message);
    const matchedSchemes = searchSchemesByText(message, 5);
    console.log(`[DEBUG] Message: "${message}", Matched ${matchedSchemes.length} schemes:`, matchedSchemes.map(s => s.scheme_name));
    const conversationHistory = context.conversationHistory.map((msg: Message) => ({ role: msg.role, content: msg.content }));
    const response = await generateAIResponse(message, conversationHistory, session.language, matchedSchemes);
    
    context = addMessageToContext(context, 'assistant', response, session.language);
    session.context = context;
    sessions.set(sessionId, session);

    res.json({
      success: true,
      data: {
        message: response,
        intent,
        state: session.state,
        matchedSchemes: matchedSchemes.slice(0, 3).map(s => ({ name: s.scheme_name, slug: s.slug })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

app.post('/api/schemes/search', async (req, res) => {
  await ensureDatabase();
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
  res.json({ success: true, data: results.results, total: results.total, page: results.page, pages: results.pages });
});

app.post('/api/eligibility/check', async (req, res) => {
  await ensureDatabase();
  const { userProfile, category, level } = req.body;
  const discoveryQuery = [userProfile?.state, userProfile?.occupation, userProfile?.category].filter(Boolean).join(' ');
  const rankedResults = await searchSchemesPaginated({
    text: discoveryQuery,
    language: Language.ENGLISH,
    userProfile,
    category,
    level,
    page: 1,
    pageSize: 50,
  });
  const csvSchemes = rankedResults.results.map(r => getSchemeBySlug(r.slug)).filter(Boolean);
  const schemes = csvSchemes.map(s => ({
    schemeId: s!.slug,
    name: s!.scheme_name,
    description: s!.details,
    category: s!.schemeCategory,
    benefits: [s!.benefits],
    eligibilityCriteria: {},
    documents: extractDocumentChecklist(s!),
    applicationProcess: s!.application,
    officialUrl: s!.officialUrl,
    lastUpdated: Date.now(),
    rawEligibility: s!.eligibility,
  }));
  const results = await checkEligibility(userProfile, schemes as any);
  res.json({ success: true, data: { eligibleSchemes: results.filter(r => r.eligible).slice(0, 12) } });
});

app.post('/api/location/csc', async (req, res) => {
  try {
    const { state, district, pincode } = req.body;
    const results = await findNearestCSC({ state, district, pincode });
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

app.get('/api/schemes/form/print/:slug', async (req, res) => {
  await ensureDatabase();
  try {
    const scheme = resolveSchemeByIdentifier(req.params.slug);
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

    const html = generatePrintableForm(
      scheme,
      template,
      formData,
      (req.query.lang as Language) || Language.ENGLISH
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating form:', error);
    res.status(500).send('Error generating form');
  }
});

// Lambda handler
import * as awsServerlessExpress from 'aws-serverless-express';

let server: any;

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  if (!server) {
    await ensureDatabase();
    server = awsServerlessExpress.createServer(app);
  }
  return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
};
