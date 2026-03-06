// Local storage for saved pre-filled forms
// Stores form data as JSON on disk so users can access their forms later

import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.resolve(__dirname, 'saved_forms.json');

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

// Load all saved forms from disk
function loadForms(): SavedForm[] {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading saved forms:', error);
    }
    return [];
}

// Save forms to disk
function saveForms(forms: SavedForm[]): void {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(forms, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving forms:', error);
    }
}

// Generate a unique ID
function generateId(): string {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
}

// Save a new form or update existing one for the same scheme+user
export function saveForm(
    schemeSlug: string,
    schemeName: string,
    schemeLevel: string,
    schemeCategory: string,
    formData: Record<string, string | number | boolean>
): SavedForm {
    const forms = loadForms();
    const now = new Date().toISOString();

    // Check if a form already exists for this scheme (by slug and applicant name)
    const existingIndex = forms.findIndex(
        f => f.schemeSlug === schemeSlug && f.formData.full_name === formData.full_name
    );

    if (existingIndex >= 0) {
        // Update existing form
        forms[existingIndex].formData = formData;
        forms[existingIndex].updatedAt = now;
        saveForms(forms);
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
    saveForms(forms);
    return savedForm;
}

// Get all saved forms
export function getAllSavedForms(): SavedForm[] {
    return loadForms();
}

// Get a saved form by ID
export function getSavedFormById(id: string): SavedForm | undefined {
    return loadForms().find(f => f.id === id);
}

// Delete a saved form by ID
export function deleteSavedForm(id: string): boolean {
    const forms = loadForms();
    const index = forms.findIndex(f => f.id === id);
    if (index >= 0) {
        forms.splice(index, 1);
        saveForms(forms);
        return true;
    }
    return false;
}

// Get forms by scheme slug
export function getFormsByScheme(slug: string): SavedForm[] {
    return loadForms().filter(f => f.schemeSlug === slug);
}
