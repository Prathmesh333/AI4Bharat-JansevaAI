// Google Gemini AI integration
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CsvScheme } from '../src/services/schemes/csvLoader';

const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Using mock responses.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * Generate an AI response with scheme context awareness
 */
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  language: string,
  matchedSchemes?: CsvScheme[]
): Promise<string> {
  // If no API key, return mock response
  if (!genAI) {
    return getMockResponse(userMessage, matchedSchemes);
  }

  try {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi (हिंदी)',
      'te': 'Telugu (తెలుగు)',
      'ta': 'Tamil (தமிழ்)',
      'bn': 'Bengali (বাংলা)',
      'mr': 'Marathi (मराठी)'
    };
    const langName = languageNames[language] || 'English';

    let systemInstruction = `You are JanSeva AI, a warm, friendly, and conversational voice assistant that helps Indian citizens discover and apply for government welfare schemes.

PERSONALITY AND TONE:
- Talk like a helpful friend, NOT a robotic menu system
- NEVER use "Type 1 for X" or numbered menu options. This is a CONVERSATION, not a phone IVR system.
- Be warm, empathetic, and encouraging
- Keep responses concise since they will be read aloud by a voice agent
- Ask follow-up questions naturally, one or two at a time
- NEVER use emojis, emoticons, or special symbols (they get read aloud and sound unnatural)

CONVERSATION FLOW:
1. When the user first arrives, greet them warmly and ask what they need help with in a natural way
2. When they want to find schemes, ask for their details conversationally — one or two questions at a time (state, age, occupation, income, caste category). Do NOT dump all questions at once.
3. IMPORTANT: Early in the conversation, ask for the user's PIN code/pincode and district. This helps find their nearest Common Service Center and is needed for the form.
4. Once you have enough details and find matching schemes, present them with FULL information including:
   - Scheme name and what it offers
   - Required documents (complete list)
   - How to apply (step by step)
   - Official website link if available
   - Nearest CSC: Tell them to share their pincode if they haven't already, so you can help find the nearest office
5. After presenting a scheme, ALWAYS naturally offer to help them fill the application form for that scheme.
6. If they want a form, collect their details in this specific order (2-3 at a time, conversationally):
   ROUND 1: Full name (as per Aadhaar), father's or guardian's name
   ROUND 2: Date of birth, gender, mobile number
   ROUND 3: Full address (house no, street, village/city), district, state, PIN code
   ROUND 4: Aadhaar number, email address (if any)
   ROUND 5: Annual family income, occupation, educational qualification
   ROUND 6: Bank account number, IFSC code, bank name and branch
   
   If they already provided some of these details earlier in conversation (like state, income, occupation), do NOT ask again — just confirm and move on.

7. Once you have collected ALL or most details, generate the form by including this marker in your response:
   [FORM_DOWNLOAD:{scheme_slug}:{scheme_name}?full_name={value}&father_name={value}&dob={value}&gender={value}&mobile={value}&address={value}&district={value}&state={value}&pincode={value}&aadhaar={value}&email={value}&annual_income={value}&occupation={value}&education={value}&bank_account={value}&ifsc_code={value}&bank_name={value}]
   
   CRITICAL rules for the marker:
   - Use the EXACT field IDs shown above (full_name, father_name, dob, etc.)
   - Replace {value} with the actual data the user gave you
   - URL-encode spaces as %20 and special characters
   - If a field was not collected, omit it from the URL
   - This marker will be rendered as a clickable download button by the UI

RULES:
- NEVER invent or hallucinate schemes. Only use data from the SYSTEM CONTEXT below.
- You MUST respond ENTIRELY in ${langName} language. Do NOT use English unless the user's language is set to English.
- When presenting documents and application steps, be thorough — these are critical for the user.
- Always offer next steps naturally: "Would you like me to help you fill the form?" or "Shall I find the nearest office where you can apply?"
- When collecting details, be encouraging: "Great, just a few more details and your form will be ready!"
- If the user provides multiple details at once (like "My name is Raj, age 25, from Mumbai"), extract ALL of them and don't ask for those again.
`;

    if (matchedSchemes && matchedSchemes.length > 0) {
      systemInstruction += `\n\n[SYSTEM CONTEXT: REAL MATCHED GOVERNMENT SCHEMES DATA]\n`;
      systemInstruction += `Present the following schemes naturally in conversation. Include ALL details — documents, application process, and official links. Do NOT say you are searching a database.\n\n`;
      matchedSchemes.slice(0, 5).forEach((s, i) => {
        systemInstruction += `Scheme ${i + 1}: ${s.scheme_name} (${s.level})\n`;
        systemInstruction += `- Slug (for form link): ${s.slug}\n`;
        systemInstruction += `- Category: ${s.schemeCategory}\n`;
        systemInstruction += `- Benefits: ${s.benefits.substring(0, 500)}\n`;
        systemInstruction += `- Eligibility: ${s.eligibility.substring(0, 500)}\n`;
        systemInstruction += `- Required Documents: ${s.documents}\n`;
        systemInstruction += `- Application Process: ${s.application.substring(0, 500)}\n`;
        if (s.officialUrl) {
          systemInstruction += `- Official Portal: ${s.officialUrl}\n`;
        }
        systemInstruction += '\n';
      });
      systemInstruction += `\n[Remember: After presenting scheme details, naturally offer to help fill the application form and find the nearest Common Service Center.]\n`;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: systemInstruction,
    });

    // Map conversation history to Gemini API format ('user' and 'model')
    // We remove the last message because generateAIResponse receives userMessage as the last item in history
    const historyToPass = conversationHistory.slice(0, -1).slice(-10); // Keep last 10 turns

    const contents: any[] = historyToPass.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Append the current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.3, // Lower temperature to prevent hallucination
        maxOutputTokens: 8000,
      },
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return getMockResponse(userMessage, matchedSchemes);
  }
}

/**
 * Use Gemini to extract form fields from scheme text (for AI-powered form generation)
 */
export async function generateFormFields(scheme: CsvScheme): Promise<any[] | null> {
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const prompt = `Analyze this Indian government scheme and extract the form fields needed for application.

Scheme: ${scheme.scheme_name}
Application Process: ${scheme.application.substring(0, 800)}
Required Documents: ${scheme.documents.substring(0, 500)}
Eligibility: ${scheme.eligibility.substring(0, 500)}

Return a JSON array of form fields. Each field should have:
- fieldId: camelCase identifier
- fieldName: human-readable label
- fieldType: one of "text", "number", "date", "select"
- required: true/false
- options: array of options (only for select type)

Return ONLY the JSON array, no other text. Example:
[{"fieldId":"fullName","fieldName":"Full Name","fieldType":"text","required":true}]`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
    });

    const text = result.response.text();
    // Try to parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Gemini form field extraction failed:', error);
    return null;
  }
}

function getMockResponse(userMessage: string, schemes?: CsvScheme[]): string {
  const lowerMessage = userMessage.toLowerCase().trim();

  // Handle requests to find schemes / discover
  if (lowerMessage.includes('discover') || lowerMessage.includes('find scheme') || lowerMessage.includes('eligible') || lowerMessage === '1') {
    return "I'd love to help you find schemes you're eligible for! Let's start with a couple of questions. Which state do you live in, and what do you do for a living?";
  }

  if (lowerMessage.includes('check eligib') || lowerMessage === '2') {
    return "Sure, let's check what you're eligible for. Could you tell me your occupation and which state you're from?";
  }

  if (lowerMessage.includes('generate form') || lowerMessage.includes('pre-fill') || lowerMessage.includes('fill form') || lowerMessage === '3') {
    return "I can help you with that! Which scheme would you like me to generate the application form for? Just tell me the scheme name or describe what you're looking for.";
  }

  if (lowerMessage.includes('nearby') || lowerMessage.includes('office') || lowerMessage.includes('center') || lowerMessage.includes('csc') || lowerMessage.includes('location') || lowerMessage === '4') {
    return "I'll help you find the nearest Common Service Center. Could you tell me your state and district?";
  }

  if (lowerMessage.includes('document') || lowerMessage === '5') {
    return "Happy to help with document guidance! Which scheme do you need the document list for? You can tell me the name or just describe what kind of scheme you're looking for.";
  }

  // If we have matched schemes, provide real scheme information conversationally
  if (schemes && schemes.length > 0) {
    const scheme = schemes[0];

    // User is providing profile details or asking about schemes
    if (lowerMessage.includes('scheme') || lowerMessage.includes('benefit') || lowerMessage.match(/\b(\d{2}|farmer|student|labour|business|telangana|maharashtra|up|bihar|karnataka|delhi|open|general|sc|st|obc|ews)\b/)) {
      let response = `Great news! Based on what you've told me, I found a scheme that could work for you.\n\n`;
      response += `**${scheme.scheme_name}** (${scheme.level})\n\n`;
      response += `${scheme.benefits.substring(0, 250)}\n\n`;
      response += `Required Documents:\n${scheme.documents.substring(0, 500)}\n\n`;
      response += `How to Apply:\n${scheme.application.substring(0, 400)}`;
      if (scheme.officialUrl) {
        response += `\n\nOfficial Website: ${scheme.officialUrl}`;
      }
      response += `\n\nWould you like me to help you fill the application form for this scheme? I'll just need a few personal details from you. Or shall I find the nearest Common Service Center where you can get in-person help?`;
      return response;
    }

    if (lowerMessage.includes('yes') || lowerMessage.includes('fill') || lowerMessage.includes('form') || lowerMessage.includes('apply')) {
      return `Perfect! Let's fill out your application for **${scheme.scheme_name}**. I'll need a few details from you.\n\nCould you start by telling me your full name and your father's or guardian's name?`;
    }

    if (lowerMessage.includes('document')) {
      return `For **${scheme.scheme_name}**, here's the complete list of documents you'll need:\n\n${scheme.documents.substring(0, 600)}\n\nWould you like me to help you fill the application form? I just need a few personal details from you.`;
    }
  }

  if (lowerMessage.includes('scheme') || lowerMessage.includes('benefit')) {
    return "I'd love to help you find the right schemes! Could you tell me which state you're from and what you do for a living? That'll help me narrow things down for you.";
  }

  if (lowerMessage.includes('eligib')) {
    return "Let's check what you're eligible for. To start, could you tell me your state and occupation?";
  }

  if (lowerMessage.includes('apply') || lowerMessage.includes('form')) {
    return "I can help you apply for schemes and generate a pre-filled form. Which scheme are you interested in? Just tell me the name or describe what you need.";
  }

  if (lowerMessage.includes('explain') || lowerMessage === 'yes' || lowerMessage === 'yeah' || lowerMessage.includes('tell me')) {
    return "Sure! Could you tell me a bit more about what you'd like to know? For example, are you looking for a specific type of scheme like education, farming, or housing?";
  }

  // Default greeting — conversational, no numbered menu
  return "Hello! I'm JanSeva AI, your friendly assistant for government welfare schemes. I have access to information on over 3,400 government schemes across India.\n\nI can help you discover schemes you're eligible for, check your eligibility, fill application forms, find nearby offices, or guide you on required documents.\n\nWhat would you like help with today?";
}

import { UserProfile, EligibilityResult, Scheme } from '../src/types';

/**
 * Use Gemini to evaluate a user profile against a set of raw schemes
 */
export async function evaluateEligibilityRAG(
  userProfile: UserProfile,
  schemes: Scheme[]
): Promise<EligibilityResult[]> {
  if (!genAI || schemes.length === 0) {
    return []; // Return empty if no AI or no schemes
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    // Format user profile
    const profileText = Object.entries(userProfile)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');

    // Format schemes context
    let schemesContext = '';
    schemes.forEach((s, index) => {
      // We only pass essential fields to save context window
      schemesContext += `\n--- Scheme ${index + 1} ---\n`;
      schemesContext += `ID: ${s.schemeId}\n`;
      schemesContext += `Name: ${s.name}\n`;
      schemesContext += `Description: ${s.description.substring(0, 300)}\n`;
      schemesContext += `Benefits: ${s.benefits[0]?.substring(0, 300) || ''}\n`;
      schemesContext += `Required Documents: ${s.documents.join(', ')}\n`;
      // include raw eligibility info since it's just strings. We'll find it via description if we passed it in, but
      // actually index.ts passes `documents` and `description` which incorporates the raw CSV details. 
      // We need raw eligibility. We'll modify `schemes` in `index.ts` to include `rawEligibility: s.eligibility`!
      schemesContext += `Raw Eligibility Rules: ${(s as any).rawEligibility || ''}\n`;
    });

    const prompt = `You are an expert government scheme eligibility evaluator. You are given a user profile and a list of schemes with their eligibility rules.

USER PROFILE:
${profileText}

SCHEMES TO EVALUATE:
${schemesContext}

INSTRUCTIONS:
Evaluate the user profile against EACH scheme's rules. Determine if the user is eligible. Be relatively lenient: if a scheme rule doesn't strictly exclude the user (e.g., if income isn't specified in the user profile or rules don't mandate a concrete income cap), consider it a potential match.

Return ONLY a JSON array of results for schemes where the user IS eligible or potentially eligible (matchScore >= 0.4). Do NOT include rejected schemes in your response. Each result should match this interface:
{
  "schemeId": "string",
  "schemeName": "string",
  "eligible": boolean,
  "matchScore": number (0.0 to 1.0, where 1.0 is a perfect match, and >0.4 is eligible),
  "estimatedBenefit": "string (brief summary of the primary benefit)",
  "missingCriteria": ["string"] (array of missing or failed criteria if not 1.0 match, empty array if none),
  "requiredDocuments": ["string"]
}

OUTPUT FORMAT:
Return ONLY the raw JSON array without markdown formatting, backticks, or outside text.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temp for analytical task 
        maxOutputTokens: 8000
      },
    });

    const text = result.response.text();

    console.log("--- GEMINI RAW TEXT ---");
    console.log(text);
    console.log("-----------------------");

    // Parse JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const results: EligibilityResult[] = JSON.parse(jsonMatch[0]);
      // Filter out only the eligible ones
      return results.filter(r => r.eligible || r.matchScore >= 0.4).sort((a, b) => b.matchScore - a.matchScore);
    }

    return [];

  } catch (error) {
    console.error('Gemini RAG evaluation failed:', error);
    return [];
  }
}
