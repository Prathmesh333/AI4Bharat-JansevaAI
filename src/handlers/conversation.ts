// Lambda handler for conversation endpoints

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateResponse, extractIntent } from '../services/conversation';
import { getSession, updateSession } from '../services/session/manager';
import { addMessageToContext } from '../services/conversation/stateManager';
import { Language, APIResponse } from '../types';
import { createLogger } from '../utils/logger';
import { JanSevaError, createErrorResponse } from '../utils/errors';

const logger = createLogger('ConversationHandler');

export async function handleMessage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Conversation message received');

    const body = JSON.parse(event.body || '{}');
    const { sessionId, message, language } = body;

    if (!sessionId || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing sessionId or message' },
        }),
      };
    }

    // Get session
    const session = await getSession(sessionId);

    // Add user message to context
    let context = addMessageToContext(session.context, 'user', message, language || session.language);

    // Extract intent
    const intent = extractIntent(message);
    context.currentIntent = intent;

    // Generate response
    const assistantMessage = await generateResponse(message, context, session.language);

    // Add assistant message to context
    context = addMessageToContext(context, 'assistant', assistantMessage, session.language);

    // Update session
    await updateSession(sessionId, { context });

    const response: APIResponse = {
      success: true,
      data: {
        message: assistantMessage,
        intent,
        sessionId,
      },
      timestamp: Date.now(),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    logger.error('Conversation request failed', error as Error);

    const janSevaError = error instanceof JanSevaError 
      ? error 
      : new JanSevaError('SYS_INTERNAL_ERROR', 'Internal server error', false);

    const response: APIResponse = {
      success: false,
      error: createErrorResponse(janSevaError, Language.ENGLISH),
      timestamp: Date.now(),
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  }
}
