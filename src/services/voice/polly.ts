// Text-to-speech processing with Amazon Polly

import { PollyClient, SynthesizeSpeechCommand, Engine, OutputFormat, VoiceId } from '@aws-sdk/client-polly';
import { Language, VoiceOutput } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('PollyService');
const pollyClient = new PollyClient({ region: config.aws.region });

// Voice ID mapping for Indian languages
const voiceIdMap: Record<Language, VoiceId> = {
  [Language.HINDI]: 'Aditi',
  [Language.ENGLISH]: 'Kajal',
  [Language.BENGALI]: 'Aditi', // Fallback to Hindi voice
  [Language.TELUGU]: 'Aditi',
  [Language.MARATHI]: 'Aditi',
  [Language.TAMIL]: 'Aditi',
  [Language.GUJARATI]: 'Aditi',
  [Language.KANNADA]: 'Aditi',
  [Language.MALAYALAM]: 'Aditi',
  [Language.PUNJABI]: 'Aditi',
  [Language.ODIA]: 'Aditi',
};

export async function synthesizeSpeech(text: string, language: Language): Promise<VoiceOutput> {
  try {
    logger.info('Starting speech synthesis', { language, textLength: text.length });

    // Validate text length
    if (text.length > 3000) {
      logger.warn('Text too long, truncating', { originalLength: text.length });
      text = text.substring(0, 3000);
    }

    const voiceId = voiceIdMap[language] || voiceIdMap[Language.ENGLISH];

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: config.polly.outputFormat as OutputFormat,
      VoiceId: voiceId,
      Engine: Engine.NEURAL,
      SampleRate: '16000', // Optimized for 2G networks
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new JanSevaError(
        ErrorCodes.VOICE_SYNTHESIS_FAILED,
        'No audio stream returned',
        false
      );
    }

    // Convert stream to buffer
    const audioData = await streamToBuffer(response.AudioStream);

    logger.info('Speech synthesis completed', { 
      language, 
      audioSize: audioData.length 
    });

    return {
      text,
      audioData,
      format: 'mp3',
      language,
    };

  } catch (error) {
    logger.error('Speech synthesis failed', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.VOICE_SYNTHESIS_FAILED,
      'Failed to synthesize speech',
      true,
      { originalError: (error as Error).message }
    );
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

export async function optimizeAudioForLowBandwidth(audioData: Buffer): Promise<Buffer> {
  // In production, implement audio compression/optimization
  // For now, return as-is since we're already using 16kHz sample rate
  logger.debug('Audio optimization for low bandwidth', { originalSize: audioData.length });
  return audioData;
}
