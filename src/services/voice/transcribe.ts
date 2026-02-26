// Speech-to-text processing with Amazon Transcribe

import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { VoiceInput, TranscriptionResult, Language } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('TranscribeService');
const transcribeClient = new TranscribeClient({ region: config.aws.region });
const s3Client = new S3Client({ region: config.aws.region });

// Language code mapping
const languageCodeMap: Record<Language, string> = {
  [Language.HINDI]: 'hi-IN',
  [Language.ENGLISH]: 'en-IN',
  [Language.BENGALI]: 'bn-IN',
  [Language.TELUGU]: 'te-IN',
  [Language.MARATHI]: 'mr-IN',
  [Language.TAMIL]: 'ta-IN',
  [Language.GUJARATI]: 'gu-IN',
  [Language.KANNADA]: 'kn-IN',
  [Language.MALAYALAM]: 'ml-IN',
  [Language.PUNJABI]: 'pa-IN',
  [Language.ODIA]: 'or-IN',
};

export async function transcribeAudio(input: VoiceInput): Promise<TranscriptionResult> {
  try {
    logger.info('Starting audio transcription', { format: input.format, language: input.language });

    // Validate audio size (max 10MB)
    if (input.audioData.length > 10 * 1024 * 1024) {
      throw new JanSevaError(
        ErrorCodes.VOICE_AUDIO_TOO_LARGE,
        'Audio file too large',
        false,
        { size: input.audioData.length }
      );
    }

    // Upload audio to S3 for Transcribe
    const audioKey = `transcribe-input/${uuidv4()}.${input.format}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.schemeDocumentsBucket,
      Key: audioKey,
      Body: input.audioData,
      ContentType: `audio/${input.format}`,
    }));

    logger.debug('Audio uploaded to S3', { key: audioKey });

    // Start transcription job
    const jobName = `janseva-${uuidv4()}`;
    const languageCode = input.language ? languageCodeMap[input.language] as any : undefined;

    const startCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: languageCode,
      MediaFormat: input.format,
      Media: {
        MediaFileUri: `s3://${config.s3.schemeDocumentsBucket}/${audioKey}`,
      },
      Settings: {
        ShowSpeakerLabels: false,
        MaxSpeakerLabels: 1,
      },
      ...((!languageCode) && {
        IdentifyLanguage: true,
        LanguageOptions: config.transcribe.supportedLanguages as any,
      }),
    });

    await transcribeClient.send(startCommand);
    logger.info('Transcription job started', { jobName });

    // Poll for completion
    const result = await pollTranscriptionJob(jobName);
    
    logger.info('Transcription completed', { 
      jobName, 
      confidence: result.confidence,
      detectedLanguage: result.detectedLanguage 
    });

    return result;

  } catch (error) {
    logger.error('Transcription failed', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.VOICE_TRANSCRIPTION_FAILED,
      'Failed to transcribe audio',
      true,
      { originalError: (error as Error).message }
    );
  }
}

async function pollTranscriptionJob(jobName: string, maxAttempts = 30): Promise<TranscriptionResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const getCommand = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName,
    });

    const response = await transcribeClient.send(getCommand);
    const job = response.TranscriptionJob;

    if (job?.TranscriptionJobStatus === 'COMPLETED') {
      const transcriptUri = job.Transcript?.TranscriptFileUri;
      if (!transcriptUri) {
        throw new JanSevaError(
          ErrorCodes.VOICE_TRANSCRIPTION_FAILED,
          'Transcript URI not found',
          false
        );
      }

      // Fetch transcript
      const transcriptResponse = await fetch(transcriptUri);
      const transcriptData: any = await transcriptResponse.json();
      
      const text = transcriptData.results?.transcripts?.[0]?.transcript || '';
      const confidence = transcriptData.results?.items?.[0]?.alternatives?.[0]?.confidence || 0;
      const detectedLanguageCode = job.LanguageCode || 'en-IN';
      
      // Map back to Language enum
      const detectedLanguage = Object.entries(languageCodeMap).find(
        ([_, code]) => code === detectedLanguageCode
      )?.[0] as Language || Language.ENGLISH;

      return {
        text,
        confidence: parseFloat(confidence),
        detectedLanguage,
      };
    }

    if (job?.TranscriptionJobStatus === 'FAILED') {
      throw new JanSevaError(
        ErrorCodes.VOICE_TRANSCRIPTION_FAILED,
        'Transcription job failed',
        false,
        { failureReason: job.FailureReason }
      );
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new JanSevaError(
    ErrorCodes.SYS_TIMEOUT,
    'Transcription job timeout',
    true
  );
}

export function detectLanguage(text: string): Language {
  // Simple language detection based on character sets
  // In production, use a proper language detection library
  
  const devanagariPattern = /[\u0900-\u097F]/;
  const bengaliPattern = /[\u0980-\u09FF]/;
  const teluguPattern = /[\u0C00-\u0C7F]/;
  const tamilPattern = /[\u0B80-\u0BFF]/;
  const gujaratiPattern = /[\u0A80-\u0AFF]/;
  const kannadaPattern = /[\u0C80-\u0CFF]/;
  const malayalamPattern = /[\u0D00-\u0D7F]/;
  const gurmukhiPattern = /[\u0A00-\u0A7F]/;
  const odiaPattern = /[\u0B00-\u0B7F]/;

  if (devanagariPattern.test(text)) return Language.HINDI;
  if (bengaliPattern.test(text)) return Language.BENGALI;
  if (teluguPattern.test(text)) return Language.TELUGU;
  if (tamilPattern.test(text)) return Language.TAMIL;
  if (gujaratiPattern.test(text)) return Language.GUJARATI;
  if (kannadaPattern.test(text)) return Language.KANNADA;
  if (malayalamPattern.test(text)) return Language.MALAYALAM;
  if (gurmukhiPattern.test(text)) return Language.PUNJABI;
  if (odiaPattern.test(text)) return Language.ODIA;

  return Language.ENGLISH;
}
