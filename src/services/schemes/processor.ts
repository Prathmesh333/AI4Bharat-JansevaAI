// Scheme document processing and ingestion

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Scheme, Language } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('SchemeProcessor');
const s3Client = new S3Client({ region: config.aws.region });

export interface SchemeDocument {
  schemeId: string;
  content: string;
  metadata: {
    ministry: string;
    category: string;
    lastUpdated: number;
  };
}

export async function ingestSchemeDocument(document: SchemeDocument): Promise<void> {
  try {
    logger.info('Ingesting scheme document', { schemeId: document.schemeId });

    // Store raw document in S3
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.schemeDocumentsBucket,
      Key: `schemes/${document.schemeId}.json`,
      Body: JSON.stringify(document),
      ContentType: 'application/json',
    }));

    // Process document into chunks for embedding
    const chunks = chunkDocument(document.content, 500);
    
    logger.info('Document chunked', { 
      schemeId: document.schemeId, 
      chunks: chunks.length 
    });

    // Store chunks for vector embedding (to be processed by OpenSearch)
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.schemeDocumentsBucket,
      Key: `chunks/${document.schemeId}.json`,
      Body: JSON.stringify({
        schemeId: document.schemeId,
        chunks,
        metadata: document.metadata,
      }),
      ContentType: 'application/json',
    }));

    logger.info('Scheme document ingested successfully', { schemeId: document.schemeId });

  } catch (error) {
    logger.error('Failed to ingest scheme document', error as Error);
    throw new JanSevaError(
      ErrorCodes.DATA_S3_ERROR,
      'Failed to ingest scheme document',
      true,
      { schemeId: document.schemeId, originalError: (error as Error).message }
    );
  }
}

export function chunkDocument(content: string, maxChunkSize: number): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if ((currentChunk + trimmedSentence).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function getSchemeDocument(schemeId: string): Promise<SchemeDocument> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3.schemeDocumentsBucket,
      Key: `schemes/${schemeId}.json`,
    }));

    if (!response.Body) {
      throw new JanSevaError(
        ErrorCodes.DATA_S3_ERROR,
        'Scheme document not found',
        false,
        { schemeId }
      );
    }

    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString) as SchemeDocument;

  } catch (error) {
    logger.error('Failed to get scheme document', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.DATA_S3_ERROR,
      'Failed to retrieve scheme document',
      true,
      { schemeId, originalError: (error as Error).message }
    );
  }
}
