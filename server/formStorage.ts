// Saved form storage.
// Uses S3 when FORMS_BUCKET is configured, otherwise falls back to local JSON storage.

import fs from 'fs/promises';
import path from 'path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const STORAGE_FILE = path.resolve(__dirname, 'saved_forms.json');
const FORMS_BUCKET = process.env.FORMS_BUCKET || '';
const FORMS_KEY = process.env.SAVED_FORMS_KEY || 'saved-forms/forms.json';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const s3Client = FORMS_BUCKET ? new S3Client({ region: AWS_REGION }) : null;

export interface SavedForm {
    id: string;
    schemeSlug: string;
    schemeName: string;
    schemeLevel: string;
    schemeCategory: string;
    formData: Record<string, string | number | boolean>;
    createdAt: string;
    updatedAt: string;
}

async function loadFormsFromDisk(): Promise<SavedForm[]> {
    try {
        const data = await fs.readFile(STORAGE_FILE, 'utf-8');
        return JSON.parse(data) as SavedForm[];
    } catch (error: any) {
        if (error?.code !== 'ENOENT') {
            console.error('Error loading saved forms from disk:', error);
        }
        return [];
    }
}

async function saveFormsToDisk(forms: SavedForm[]): Promise<void> {
    try {
        await fs.writeFile(STORAGE_FILE, JSON.stringify(forms, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving forms to disk:', error);
    }
}

async function loadFormsFromS3(): Promise<SavedForm[]> {
    if (!s3Client || !FORMS_BUCKET) {
        return [];
    }

    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: FORMS_BUCKET,
            Key: FORMS_KEY,
        }));

        if (!response.Body) {
            return [];
        }

        const body = await response.Body.transformToString();
        return body ? JSON.parse(body) as SavedForm[] : [];
    } catch (error: any) {
        const code = error?.name || error?.Code;
        if (code === 'NoSuchKey' || code === 'NotFound') {
            return [];
        }
        console.error(`Error loading saved forms from S3 s3://${FORMS_BUCKET}/${FORMS_KEY}:`, error);
        return [];
    }
}

async function saveFormsToS3(forms: SavedForm[]): Promise<void> {
    if (!s3Client || !FORMS_BUCKET) {
        return;
    }

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: FORMS_BUCKET,
            Key: FORMS_KEY,
            Body: JSON.stringify(forms, null, 2),
            ContentType: 'application/json',
        }));
    } catch (error) {
        console.error(`Error saving forms to S3 s3://${FORMS_BUCKET}/${FORMS_KEY}:`, error);
    }
}

async function loadForms(): Promise<SavedForm[]> {
    if (s3Client && FORMS_BUCKET) {
        return loadFormsFromS3();
    }

    return loadFormsFromDisk();
}

async function saveForms(forms: SavedForm[]): Promise<void> {
    if (s3Client && FORMS_BUCKET) {
        await saveFormsToS3(forms);
        return;
    }

    await saveFormsToDisk(forms);
}

// Generate a unique ID
function generateId(): string {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

// Save a new form or update existing one for the same scheme+user
export async function saveForm(
    schemeSlug: string,
    schemeName: string,
    schemeLevel: string,
    schemeCategory: string,
    formData: Record<string, string | number | boolean>
): Promise<SavedForm> {
    const forms = await loadForms();
    const now = new Date().toISOString();

    // Check if a form already exists for this scheme (by slug and applicant name)
    const existingIndex = forms.findIndex(
        f => f.schemeSlug === schemeSlug && f.formData.full_name === formData.full_name
    );

    if (existingIndex >= 0) {
        // Update existing form
        forms[existingIndex].formData = formData;
        forms[existingIndex].updatedAt = now;
        await saveForms(forms);
        return forms[existingIndex];
    }

    // Create new form
    const savedForm: SavedForm = {
        id: generateId(),
        schemeSlug,
        schemeName,
        schemeLevel,
        schemeCategory,
        formData,
        createdAt: now,
        updatedAt: now,
    };

    forms.push(savedForm);
    await saveForms(forms);
    return savedForm;
}

// Get all saved forms
export async function getAllSavedForms(): Promise<SavedForm[]> {
    return loadForms();
}

// Get a saved form by ID
export async function getSavedFormById(id: string): Promise<SavedForm | undefined> {
    const forms = await loadForms();
    return forms.find(f => f.id === id);
}

// Delete a saved form by ID
export async function deleteSavedForm(id: string): Promise<boolean> {
    const forms = await loadForms();
    const index = forms.findIndex(f => f.id === id);
    if (index >= 0) {
        forms.splice(index, 1);
        await saveForms(forms);
        return true;
    }
    return false;
}

// Get forms by scheme slug
export async function getFormsByScheme(slug: string): Promise<SavedForm[]> {
    const forms = await loadForms();
    return forms.filter(f => f.schemeSlug === slug);
}
