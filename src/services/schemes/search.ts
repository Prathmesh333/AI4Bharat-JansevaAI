// Semantic search and retrieval for schemes
// Now powered by real CSV data instead of mock schemes

import { Scheme, UserProfile, Language } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';
import { CsvScheme } from './csvLoader';
import * as schemeDb from './schemeDatabase';

const logger = createLogger('SchemeSearch');

export interface SearchQuery {
  text: string;
  language: Language;
  userProfile?: UserProfile;
  limit?: number;
  category?: string;
  level?: 'Central' | 'State';
}

export interface SearchResult {
  schemeId: string;
  schemeName: string;
  slug: string;
  relevanceScore: number;
  excerpt: string;
  matchedCriteria: string[];
  category: string;
  level: string;
  benefits: string;
  documents: string;
  officialUrl: string;
}

/**
 * Convert CsvScheme to SearchResult with relevance scoring
 */
function csvSchemeToSearchResult(scheme: CsvScheme, query: SearchQuery, rank: number, totalResults: number): SearchResult {
  const relevanceScore = Math.max(0.1, 1.0 - (rank / Math.max(totalResults, 1)) * 0.8);

  return {
    schemeId: scheme.slug || scheme.scheme_name.toLowerCase().replace(/\s+/g, '-').substring(0, 30),
    schemeName: scheme.scheme_name,
    slug: scheme.slug,
    relevanceScore,
    excerpt: scheme.details.substring(0, 300) + (scheme.details.length > 300 ? '...' : ''),
    matchedCriteria: getMatchedCriteria(scheme, query.userProfile),
    category: scheme.schemeCategory,
    level: scheme.level,
    benefits: scheme.benefits.substring(0, 200) + (scheme.benefits.length > 200 ? '...' : ''),
    documents: scheme.documents.substring(0, 200) + (scheme.documents.length > 200 ? '...' : ''),
    officialUrl: scheme.officialUrl,
  };
}

export async function searchSchemes(query: SearchQuery): Promise<SearchResult[]> {
  try {
    logger.info('Searching schemes', {
      query: query.text,
      language: query.language,
      hasProfile: !!query.userProfile,
      category: query.category,
      level: query.level,
    });

    if (!schemeDb.isInitialized()) {
      logger.warn('Scheme database not initialized, returning empty results');
      return [];
    }

    let csvResults: CsvScheme[];

    // Use advanced search if filters are provided
    if (query.category || query.level || (query.userProfile && query.userProfile.occupation)) {
      csvResults = schemeDb.advancedSearch({
        query: query.text,
        category: query.category,
        level: query.level,
        tags: query.userProfile?.occupation ? [query.userProfile.occupation] : undefined,
        limit: query.limit || 10,
      });
    } else {
      csvResults = schemeDb.searchSchemesByText(query.text, query.limit || 10);
    }

    // Convert to SearchResult format with scoring
    const results = csvResults.map((scheme, index) =>
      csvSchemeToSearchResult(scheme, query, index, csvResults.length)
    );

    // Boost results matching user profile
    if (query.userProfile) {
      results.forEach(result => {
        const scheme = schemeDb.getSchemeBySlug(result.slug);
        if (scheme) {
          const boost = calculateProfileBoost(scheme, query.userProfile!);
          result.relevanceScore = Math.min(1.0, result.relevanceScore + boost);
        }
      });

      // Re-sort by boosted relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    logger.info('Search completed', { resultsCount: results.length });
    return results;

  } catch (error) {
    logger.error('Scheme search failed', error as Error);
    throw new JanSevaError(
      ErrorCodes.ELIG_SEARCH_FAILED,
      'Failed to search schemes',
      true,
      { originalError: (error as Error).message }
    );
  }
}

/**
 * Calculate a relevance boost based on user profile matching scheme eligibility text
 */
function calculateProfileBoost(scheme: CsvScheme, profile: UserProfile): number {
  let boost = 0;
  const eligibilityLower = scheme.eligibility.toLowerCase();
  const tagsLower = scheme.tags.join(' ').toLowerCase();

  // Occupation match
  if (profile.occupation) {
    if (eligibilityLower.includes(profile.occupation.toLowerCase()) ||
      tagsLower.includes(profile.occupation.toLowerCase())) {
      boost += 0.2;
    }
  }

  // Category match
  if (profile.category) {
    const categoryMap: Record<string, string[]> = {
      'sc': ['scheduled caste', 'sc'],
      'st': ['scheduled tribe', 'st'],
      'obc': ['other backward class', 'obc'],
      'ews': ['economically weaker', 'ews'],
      'general': ['general'],
    };
    const keywords = categoryMap[profile.category] || [];
    if (keywords.some(k => eligibilityLower.includes(k))) {
      boost += 0.15;
    }
  }

  // Gender match
  if (profile.gender) {
    if (eligibilityLower.includes(profile.gender)) {
      boost += 0.1;
    }
  }

  // BPL/ration card match
  if (profile.rationCard) {
    if (eligibilityLower.includes(profile.rationCard)) {
      boost += 0.1;
    }
  }

  return boost;
}

/**
 * Extract matched criteria from scheme eligibility text based on user profile
 */
function getMatchedCriteria(scheme: CsvScheme, profile?: UserProfile): string[] {
  if (!profile) return [];

  const matched: string[] = [];
  const eligibilityLower = scheme.eligibility.toLowerCase();
  const tagsLower = scheme.tags.join(' ').toLowerCase();

  if (profile.occupation && (eligibilityLower.includes(profile.occupation.toLowerCase()) || tagsLower.includes(profile.occupation.toLowerCase()))) {
    matched.push('occupation');
  }

  if (profile.category) {
    const catKeywords: Record<string, string[]> = {
      'sc': ['scheduled caste', 'sc '], 'st': ['scheduled tribe', 'st '],
      'obc': ['obc', 'backward class'], 'ews': ['ews', 'economically weaker'],
    };
    if ((catKeywords[profile.category] || []).some(k => eligibilityLower.includes(k))) {
      matched.push('category');
    }
  }

  if (profile.gender && eligibilityLower.includes(profile.gender)) {
    matched.push('gender');
  }

  if (profile.state && eligibilityLower.includes(profile.state.toLowerCase())) {
    matched.push('state');
  }

  return matched;
}

/**
 * Get full scheme details by slug
 */
export async function getSchemeDetails(schemeId: string, language: Language): Promise<CsvScheme | null> {
  try {
    return schemeDb.getSchemeBySlug(schemeId);
  } catch (error) {
    logger.error('Failed to get scheme details', error as Error);
    throw new JanSevaError(
      ErrorCodes.ELIG_SEARCH_FAILED,
      'Failed to retrieve scheme details',
      true,
      { schemeId, originalError: (error as Error).message }
    );
  }
}
