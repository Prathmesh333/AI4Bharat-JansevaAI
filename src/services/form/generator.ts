// Form generation and PDF creation

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { FormTemplate, GeneratedForm, Language } from '../../types';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('FormGenerator');
const s3Client = new S3Client({ region: config.aws.region });

export async function generateForm(
  schemeId: string,
  userId: string,
  formData: Record<string, any>,
  template: FormTemplate
): Promise<GeneratedForm> {
  try {
    logger.info('Generating form', { schemeId, userId });

    // Validate form data against template
    validateFormData(formData, template);

    // Calculate completion percentage
    const completionPercentage = calculateCompletion(formData, template);

    // Generate unique reference number
    const referenceNumber = generateReferenceNumber(schemeId);

    const form: GeneratedForm = {
      formId: uuidv4(),
      schemeId,
      userId,
      referenceNumber,
      fields: formData,
      completionPercentage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Generate PDF if form is complete
    if (completionPercentage === 100) {
      const pdfUrl = await generatePDF(form, template);
      form.pdfUrl = pdfUrl;
    }

    // Store form in S3
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.formsBucket,
      Key: `forms/${form.formId}.json`,
      Body: JSON.stringify(form),
      ContentType: 'application/json',
    }));

    logger.info('Form generated successfully', { 
      formId: form.formId,
      referenceNumber: form.referenceNumber,
      completion: completionPercentage 
    });

    return form;

  } catch (error) {
    logger.error('Form generation failed', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.FORM_GENERATION_FAILED,
      'Failed to generate form',
      true,
      { schemeId, originalError: (error as Error).message }
    );
  }
}

function validateFormData(data: Record<string, any>, template: FormTemplate): void {
  const requiredFields = template.fields.filter(f => f.required);
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!data[field.fieldId] || data[field.fieldId] === '') {
      missingFields.push(field.fieldName);
    }
  }

  if (missingFields.length > 0) {
    throw new JanSevaError(
      ErrorCodes.FORM_INVALID_DATA,
      'Missing required fields',
      false,
      { missingFields }
    );
  }
}

function calculateCompletion(data: Record<string, any>, template: FormTemplate): number {
  const totalFields = template.fields.length;
  const filledFields = template.fields.filter(f => 
    data[f.fieldId] && data[f.fieldId] !== ''
  ).length;

  return Math.round((filledFields / totalFields) * 100);
}

export function generateReferenceNumber(schemeId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const schemePrefix = schemeId.substring(0, 3).toUpperCase();
  
  return `${schemePrefix}-${timestamp}-${random}`;
}

async function generatePDF(form: GeneratedForm, template: FormTemplate): Promise<string> {
  try {
    // In production, use a PDF generation library like PDFKit or puppeteer
    // For now, create a simple text representation
    const pdfContent = createPDFContent(form, template);
    
    const pdfKey = `pdfs/${form.formId}.pdf`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.formsBucket,
      Key: pdfKey,
      Body: pdfContent,
      ContentType: 'application/pdf',
    }));

    return `s3://${config.s3.formsBucket}/${pdfKey}`;

  } catch (error) {
    logger.error('PDF generation failed', error as Error);
    throw new JanSevaError(
      ErrorCodes.FORM_PDF_GENERATION_FAILED,
      'Failed to generate PDF',
      true,
      { formId: form.formId, originalError: (error as Error).message }
    );
  }
}

function createPDFContent(form: GeneratedForm, template: FormTemplate): string {
  // Simplified PDF content (in production, use proper PDF library)
  let content = `Application Form\n`;
  content += `Scheme: ${template.formName}\n`;
  content += `Reference Number: ${form.referenceNumber}\n`;
  content += `Date: ${new Date(form.createdAt).toLocaleDateString()}\n\n`;
  
  template.fields.forEach(field => {
    const value = form.fields[field.fieldId] || '';
    content += `${field.fieldName}: ${value}\n`;
  });
  
  return content;
}

export async function getForm(formId: string): Promise<GeneratedForm> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3.formsBucket,
      Key: `forms/${formId}.json`,
    }));

    if (!response.Body) {
      throw new JanSevaError(
        ErrorCodes.FORM_TEMPLATE_NOT_FOUND,
        'Form not found',
        false,
        { formId }
      );
    }

    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString) as GeneratedForm;

  } catch (error) {
    logger.error('Failed to get form', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.DATA_S3_ERROR,
      'Failed to retrieve form',
      true,
      { formId, originalError: (error as Error).message }
    );
  }
}
