// Lambda handler for voice processing endpoints

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { transcribeAudio } from '../services/voice/transcribe';
import { synthesizeSpeech } from '../services/voice/polly';
import { Language, VoiceInput, APIResponse } from '../types';
import { createLogger } from '../utils/logger';
import { JanSevaError, createErrorResponse } from '../utils/errors';

const logger = createLogger('VoiceHandler');

export async function handleTranscribe(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Transcribe request received');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { audioData, format, language } = body;

    if (!audioData || !format) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: audioData, format',
          },
        }),
      };
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');

    const input: VoiceInput = {
      audioData: audioBuffer,
      format,
      language: language as Language,
    };

    const result = await transcribeAudio(input);

    const response: APIResponse = {
      success: true,
      data: result,
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
    logger.error('Transcribe request failed', error as Error);

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

export async function handleSynthesize(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Synthesize request received');

    const body = JSON.parse(event.body || '{}');
    const { text, language } = body;

    if (!text || !language) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: text, language',
          },
        }),
      };
    }

    const result = await synthesizeSpeech(text, language as Language);

    // Convert audio buffer to base64 for JSON response
    const audioBase64 = result.audioData.toString('base64');

    const response: APIResponse = {
      success: true,
      data: {
        text: result.text,
        audioData: audioBase64,
        format: result.format,
        language: result.language,
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
    logger.error('Synthesize request failed', error as Error);

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
