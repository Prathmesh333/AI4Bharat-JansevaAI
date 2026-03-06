// In-memory scheme database with search capabilities
// Loaded from CSV at server startup

import { CsvScheme, loadSchemesFromCSV } from './csvLoader';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SchemeDatabase');

// Singleton database instance
let schemes: CsvScheme[] = [];
let initialized = false;

// Pre-built indices for fast lookup
let slugIndex: Map<string, CsvScheme> = new Map();
let categoryIndex: Map<string, CsvScheme[]> = new Map();
let tagIndex: Map<string, CsvScheme[]> = new Map();
let allCategories: string[] = [];

/**
 * Initialize the scheme database from CSV file.
 * Should be called once at server startup.
 */
export async function initializeDatabase(csvPath: string): Promise<void> {
    if (initialized) {
        logger.info('Database already initialized', { schemeCount: schemes.length });
        return;
    }

    logger.info('Initializing scheme database...');
    schemes = await loadSchemesFromCSV(csvPath);

    // Build indices
    slugIndex = new Map();
    categoryIndex = new Map();
    tagIndex = new Map();
    const categorySet = new Set<string>();

    for (const scheme of schemes) {
        // Slug index
        if (scheme.slug) {
            slugIndex.set(scheme.slug.toLowerCase(), scheme);
        }

        // Category index
        for (const cat of scheme.categories) {
            const key = cat.toLowerCase();
            categorySet.add(cat);
            if (!categoryIndex.has(key)) {
                categoryIndex.set(key, []);
            }
            categoryIndex.get(key)!.push(scheme);
        }

        // Tag index
        for (const tag of scheme.tags) {
            const key = tag.toLowerCase();
            if (!tagIndex.has(key)) {
                tagIndex.set(key, []);
            }
            tagIndex.get(key)!.push(scheme);
        }
    }

    allCategories = Array.from(categorySet).sort();
    initialized = true;

    logger.info('Scheme database initialized', {
        totalSchemes: schemes.length,
        uniqueCategories: allCategories.length,
        uniqueTags: tagIndex.size,
        centralSchemes: schemes.filter(s => s.level === 'Central').length,
        stateSchemes: schemes.filter(s => s.level === 'State').length,
    });
}

/**
 * Check if database is initialized
 */
export function isInitialized(): boolean {
    return initialized;
}

/**
 * Get total scheme count
 */
export function getSchemeCount(): number {
    return schemes.length;
}

/**
 * Full-text search across scheme name, details, benefits, eligibility, tags
 */
export function searchSchemesByText(query: string, limit: number = 10): CsvScheme[] {
    if (!query.trim()) {
        return schemes.slice(0, limit);
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(Boolean);

    // Score each scheme by how well it matches the query
    const scored = schemes.map(scheme => {
        let score = 0;
        const nameLower = scheme.scheme_name.toLowerCase();
        const detailsLower = scheme.details.toLowerCase();
        const benefitsLower = scheme.benefits.toLowerCase();
        const eligibilityLower = scheme.eligibility.toLowerCase();
        const tagsLower = scheme.tags.join(' ').toLowerCase();
        const categoryLower = scheme.schemeCategory.toLowerCase();

        // Exact name match gets highest score
        if (nameLower.includes(queryLower)) {
            score += 100;
        }

        // Category match
        if (categoryLower.includes(queryLower)) {
            score += 50;
        }

        // Tag match
        if (tagsLower.includes(queryLower)) {
            score += 40;
        }

        // Per-term matching
        for (const term of queryTerms) {
            if (nameLower.includes(term)) score += 30;
            if (tagsLower.includes(term)) score += 15;
            if (benefitsLower.includes(term)) score += 10;
            if (eligibilityLower.includes(term)) score += 10;
            if (detailsLower.includes(term)) score += 5;
        }

        return { scheme, score };
    });

    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.scheme);
}

/**
 * Search schemes by category
 */
export function searchSchemesByCategory(category: string, limit: number = 20): CsvScheme[] {
    const key = category.toLowerCase();
    const results = categoryIndex.get(key) || [];
    return results.slice(0, limit);
}

/**
 * Search schemes by tag
 */
export function searchSchemesByTag(tag: string, limit: number = 20): CsvScheme[] {
    const key = tag.toLowerCase();
    const results = tagIndex.get(key) || [];
    return results.slice(0, limit);
}

/**
 * Search schemes by level (Central/State)
 */
export function searchSchemesByLevel(level: 'Central' | 'State', limit: number = 20): CsvScheme[] {
    return schemes.filter(s => s.level === level).slice(0, limit);
}

/**
 * Get scheme by slug
 */
export function getSchemeBySlug(slug: string): CsvScheme | null {
    return slugIndex.get(slug.toLowerCase()) || null;
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
    return allCategories;
}

/**
 * Get all schemes (paginated)
 */
export function getAllSchemes(page: number = 1, pageSize: number = 20): { schemes: CsvScheme[]; total: number; pages: number } {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
        schemes: schemes.slice(start, end),
        total: schemes.length,
        pages: Math.ceil(schemes.length / pageSize),
    };
}

/**
 * Advanced search with multiple filters
 */
export function advancedSearch(filters: {
    query?: string;
    category?: string;
    level?: 'Central' | 'State';
    tags?: string[];
    limit?: number;
}): CsvScheme[] {
    const limit = filters.limit || 20;
    let results = [...schemes];

    // Filter by level
    if (filters.level) {
        results = results.filter(s => s.level === filters.level);
    }

    // Filter by category
    if (filters.category) {
        const catLower = filters.category.toLowerCase();
        results = results.filter(s =>
            s.categories.some(c => c.toLowerCase().includes(catLower))
        );
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
        const tagLowers = filters.tags.map(t => t.toLowerCase());
        results = results.filter(s =>
            tagLowers.some(tag =>
                s.tags.some(t => t.toLowerCase().includes(tag))
            )
        );
    }

    // Text search within filtered results
    if (filters.query && filters.query.trim()) {
        const queryLower = filters.query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/).filter(Boolean);

        const scored = results.map(scheme => {
            let score = 0;
            const searchable = `${scheme.scheme_name} ${scheme.details} ${scheme.benefits} ${scheme.eligibility} ${scheme.tags.join(' ')}`.toLowerCase();

            for (const term of queryTerms) {
                if (searchable.includes(term)) score++;
            }
            return { scheme, score };
        });

        results = scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(s => s.scheme);
    }

    return results.slice(0, limit);
}
