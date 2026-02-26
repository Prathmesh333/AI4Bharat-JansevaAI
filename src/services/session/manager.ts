// Session management with DynamoDB

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Session, ConversationState, Language } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('SessionManager');
const dynamoClient = new DynamoDBClient({ region: config.aws.region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function createSession(language: Language, userId?: string): Promise<Session> {
  try {
    const now = Date.now();
    const session: Session = {
      sessionId: uuidv4(),
      userId,
      language,
      state: ConversationState.INITIATED,
      context: {
        conversationHistory: [],
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: Math.floor(now / 1000) + config.dynamodb.sessionTTL,
    };

    await docClient.send(new PutCommand({
      TableName: config.dynamodb.sessionTable,
      Item: session,
    }));

    logger.info('Session created', { sessionId: session.sessionId, language });
    return session;

  } catch (error) {
    logger.error('Failed to create session', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_DYNAMODB_ERROR,
      'Failed to create session',
      true,
      { originalError: (error as Error).message }
    );
  }
}

export async function getSession(sessionId: string): Promise<Session> {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: config.dynamodb.sessionTable,
      Key: { sessionId },
    }));

    if (!response.Item) {
      throw new JanSevaError(
        ErrorCodes.CONV_SESSION_NOT_FOUND,
        'Session not found',
        false,
        { sessionId }
      );
    }

    const session = response.Item as Session;

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt < now) {
      throw new JanSevaError(
        ErrorCodes.CONV_SESSION_EXPIRED,
        'Session has expired',
        false,
        { sessionId }
      );
    }

    logger.debug('Session retrieved', { sessionId });
    return session;

  } catch (error) {
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    logger.error('Failed to get session', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_DYNAMODB_ERROR,
      'Failed to retrieve session',
      true,
      { originalError: (error as Error).message }
    );
  }
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
  try {
    const now = Date.now();
    const updateExpression: string[] = ['updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now,
    };

    if (updates.state) {
      updateExpression.push('state = :state');
      expressionAttributeValues[':state'] = updates.state;
    }

    if (updates.context) {
      updateExpression.push('context = :context');
      expressionAttributeValues[':context'] = updates.context;
    }

    if (updates.language) {
      updateExpression.push('language = :language');
      expressionAttributeValues[':language'] = updates.language;
    }

    await docClient.send(new UpdateCommand({
      TableName: config.dynamodb.sessionTable,
      Key: { sessionId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    logger.info('Session updated', { sessionId, updates: Object.keys(updates) });
    
    // Return updated session
    return await getSession(sessionId);

  } catch (error) {
    logger.error('Failed to update session', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_DYNAMODB_ERROR,
      'Failed to update session',
      true,
      { originalError: (error as Error).message }
    );
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await docClient.send(new DeleteCommand({
      TableName: config.dynamodb.sessionTable,
      Key: { sessionId },
    }));

    logger.info('Session deleted', { sessionId });

  } catch (error) {
    logger.error('Failed to delete session', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_DYNAMODB_ERROR,
      'Failed to delete session',
      true,
      { originalError: (error as Error).message }
    );
  }
}

export async function extendSession(sessionId: string): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const newExpiresAt = now + config.dynamodb.sessionTTL;

    await docClient.send(new UpdateCommand({
      TableName: config.dynamodb.sessionTable,
      Key: { sessionId },
      UpdateExpression: 'SET expiresAt = :expiresAt',
      ExpressionAttributeValues: {
        ':expiresAt': newExpiresAt,
      },
    }));

    logger.debug('Session extended', { sessionId, newExpiresAt });

  } catch (error) {
    logger.error('Failed to extend session', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_DYNAMODB_ERROR,
      'Failed to extend session',
      true,
      { originalError: (error as Error).message }
    );
  }
}
