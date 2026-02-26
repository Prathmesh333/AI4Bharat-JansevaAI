// Conversation management with Amazon Bedrock (Claude 3.5 Sonnet)

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Language, Message, ConversationContext } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('BedrockService');
const bedrockClient = new BedrockRuntimeClient({ region: config.bedrock.region });

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  anthropic_version: string;
  max_tokens: number;
  temperature: number;
  messages: ClaudeMessage[];
  system?: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function generateResponse(
  userMessage: string,
  context: ConversationContext,
  language: Language
): Promise<string> {
  try {
    logger.info('Generating response', { language, messageLength: userMessage.length });

    // Build conversation history
    const messages: ClaudeMessage[] = context.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(language, context);

    const request: ClaudeRequest = {
      anthropic_version: '2023-06-01',
      max_tokens: config.bedrock.maxTokens,
      temperature: config.bedrock.temperature,
      messages,
      system: systemPrompt,
    };

    const command = new InvokeModelCommand({
      modelId: config.bedrock.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(request),
    });

    const response = await bedrockClient.send(command);
    
    if (!response.body) {
      throw new JanSevaError(
        ErrorCodes.CONV_BEDROCK_ERROR,
        'No response body from Bedrock',
        false
      );
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as ClaudeResponse;
    const assistantMessage = responseBody.content[0]?.text || '';

    logger.info('Response generated', {
      language,
      responseLength: assistantMessage.length,
      inputTokens: responseBody.usage.input_tokens,
      outputTokens: responseBody.usage.output_tokens,
    });

    return assistantMessage;

  } catch (error) {
    logger.error('Failed to generate response', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.CONV_BEDROCK_ERROR,
      'Failed to generate response from Bedrock',
      true,
      { originalError: (error as Error).message }
    );
  }
}

function buildSystemPrompt(language: Language, context: ConversationContext): string {
  const languageNames: Record<Language, string> = {
    [Language.HINDI]: 'Hindi',
    [Language.ENGLISH]: 'English',
    [Language.BENGALI]: 'Bengali',
    [Language.TELUGU]: 'Telugu',
    [Language.MARATHI]: 'Marathi',
    [Language.TAMIL]: 'Tamil',
    [Language.GUJARATI]: 'Gujarati',
    [Language.KANNADA]: 'Kannada',
    [Language.MALAYALAM]: 'Malayalam',
    [Language.PUNJABI]: 'Punjabi',
    [Language.ODIA]: 'Odia',
  };

  let prompt = `You are JanSeva AI, a helpful voice assistant that helps Indian citizens discover and apply for government welfare schemes.

Language: Respond in ${languageNames[language]} language.

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

`;

  // Add context-specific instructions
  if (context.currentIntent) {
    prompt += `\nCurrent task: ${context.currentIntent}\n`;
  }

  if (context.userProfile) {
    prompt += `\nUser profile information available: ${JSON.stringify(context.userProfile)}\n`;
  }

  if (context.selectedSchemes && context.selectedSchemes.length > 0) {
    prompt += `\nSchemes being discussed: ${context.selectedSchemes.join(', ')}\n`;
  }

  return prompt;
}

export function extractIntent(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Intent patterns
  if (message.includes('scheme') || message.includes('योजना') || message.includes('প্রকল্প')) {
    return 'discover_schemes';
  }
  
  if (message.includes('apply') || message.includes('आवेदन') || message.includes('আবেদন')) {
    return 'apply_for_scheme';
  }
  
  if (message.includes('form') || message.includes('फॉर्म') || message.includes('ফর্ম')) {
    return 'fill_form';
  }
  
  if (message.includes('eligible') || message.includes('पात्र') || message.includes('যোগ্য')) {
    return 'check_eligibility';
  }
  
  if (message.includes('document') || message.includes('दस्तावेज') || message.includes('নথি')) {
    return 'document_guidance';
  }
  
  if (message.includes('office') || message.includes('center') || message.includes('कार्यालय')) {
    return 'find_location';
  }
  
  return 'general_inquiry';
}

export function validateContextSize(context: ConversationContext): void {
  const historySize = JSON.stringify(context.conversationHistory).length;
  const maxSize = 100000; // 100KB limit
  
  if (historySize > maxSize) {
    throw new JanSevaError(
      ErrorCodes.CONV_CONTEXT_TOO_LARGE,
      'Conversation context too large',
      false,
      { size: historySize, maxSize }
    );
  }
}
