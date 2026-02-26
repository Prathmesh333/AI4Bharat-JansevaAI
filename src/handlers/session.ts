// Lambda handler for session management endpoints

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createSession, getSession, deleteSession } from '../services/session/manager';
import { Language, APIResponse } from '../types';
import { createLogger } from '../utils/logger';
import { JanSevaError, createErrorResponse } from '../utils/errors';

const logger = createLogger('SessionHandler');

export async function handleCreateSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Create session request received');

    const body = JSON.parse(event.body || '{}');
    const { language, userId } = body;

    if (!language) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing language' },
        }),
      };
    }

    const session = await createSession(language as Language, userId);

    const response: APIResponse = {
      success: true,
      data: session,
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
    logger.error('Create session failed', error as Error);

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

export async function handleGetSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing sessionId' },
        }),
      };
    }

    const session = await getSession(sessionId);

    const response: APIResponse = {
      success: true,
      data: session,
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
    logger.error('Get session failed', error as Error);

    const janSevaError = error instanceof JanSevaError 
      ? error 
      : new JanSevaError('SYS_INTERNAL_ERROR', 'Internal server error', false);

    const response: APIResponse = {
      success: false,
      error: createErrorResponse(janSevaError, Language.ENGLISH),
      timestamp: Date.now(),
    };

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  }
}
