// Google Gemini AI integration
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Using mock responses.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  language: string
): Promise<string> {
  // If no API key, return mock response
  if (!genAI) {
    return getMockResponse(userMessage);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build system prompt
    const systemPrompt = `You are JanSeva AI, a helpful voice assistant that helps Indian citizens discover and apply for government welfare schemes.

Your role:
- Help users understand which government schemes they are eligible for
- Guide them through the application process
- Explain scheme benefits in simple terms
- Ask clarifying questions to determine eligibility
- Be empathetic and patient, especially with users who may have limited digital literacy

Guidelines:
- Keep responses concise (2-3 sentences) as this is a voice interface
- Use simple, everyday language
- Ask one question at a time
- Confirm understanding before moving forward
- Be culturally sensitive and respectful
- Never store or ask for Aadhaar numbers directly
- Focus on helping users access their entitled benefits
- Respond in ${language} language when appropriate

Current conversation context:
${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${userMessage}`;

    // Build conversation history for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
    ];

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    return getMockResponse(userMessage);
  }
}

function getMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('scheme') || lowerMessage.includes('benefit')) {
    return 'I can help you discover government schemes. Let me ask you a few questions to find the best schemes for you. What is your age?';
  }
  
  if (lowerMessage.includes('eligib')) {
    return "I'll check your eligibility for schemes. First, I need some information. What state do you live in?";
  }
  
  if (lowerMessage.includes('apply')) {
    return 'I can help you apply for schemes. Which scheme are you interested in?';
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('office') || lowerMessage.includes('center')) {
    return 'I can help you find the nearest Common Service Center. What is your location?';
  }
  
  if (lowerMessage.includes('document')) {
    return 'I can guide you on required documents. Which scheme do you need documents for?';
  }
  
  return "Hello! I'm JanSeva AI, your assistant for government welfare schemes. I can help you:\n\n1. Discover schemes you're eligible for\n2. Check eligibility\n3. Apply for schemes\n4. Find nearby offices\n5. Get document guidance\n\nHow can I help you today?";
}