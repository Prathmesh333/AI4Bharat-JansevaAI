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
  page?: number;
  pageSize?: number;
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

export interface SearchResultsPage {
  results: SearchResult[];
  total: number;
  page: number;
  pages: number;
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
  const paginatedResults = await searchSchemesPaginated(query);
  return paginatedResults.results;
}

export async function searchSchemesPaginated(query: SearchQuery): Promise<SearchResultsPage> {
  try {
    logger.info('Searching schemes', {
      query: query.text,
      language: query.language,
      hasProfile: !!query.userProfile,
      category: query.category,
      level: query.level,
      page: query.page,
      pageSize: query.pageSize || query.limit,
    });

    if (!schemeDb.isInitialized()) {
      logger.warn('Scheme database not initialized, returning empty results');
      return { results: [], total: 0, page: 1, pages: 1 };
    }

    const pageSize = Math.max(1, query.pageSize || query.limit || 10);
    const page = Math.max(1, query.page || 1);
    let csvResults: CsvScheme[];
    let total = 0;
    let pages = 1;
    let currentPage = page;

    if (query.userProfile) {
      // Profile-based boosting needs the full candidate set before paging.
      if (query.category || query.level || query.userProfile.occupation) {
        csvResults = schemeDb.advancedSearch({
          query: query.text,
          category: query.category,
          level: query.level,
          tags: query.userProfile.occupation ? [query.userProfile.occupation] : undefined,
          limit: schemeDb.getSchemeCount(),
        });
      } else {
        csvResults = schemeDb.searchSchemesByText(query.text, schemeDb.getSchemeCount());
      }

      let results = csvResults.map((scheme, index) =>
        csvSchemeToSearchResult(scheme, query, index, csvResults.length)
      );

      results.forEach(result => {
        const scheme = schemeDb.getSchemeBySlug(result.slug);
        if (scheme) {
          const boost = calculateProfileBoost(scheme, query.userProfile!);
          result.relevanceScore = Math.min(1.0, result.relevanceScore + boost);
        }
      });

      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      total = results.length;
      pages = Math.max(1, Math.ceil(total / pageSize));
      currentPage = Math.min(page, pages);
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;

      logger.info('Search completed', { resultsCount: results.length, page: currentPage, total });
      return {
        results: results.slice(start, end),
        total,
        page: currentPage,
        pages,
      };
    }

    // Use paginated search directly when no profile boosting is required.
    if (query.category || query.level) {
      const paginated = schemeDb.advancedSearchPaginated({
        query: query.text,
        category: query.category,
        level: query.level,
        page,
        pageSize,
      });
      csvResults = paginated.schemes;
      total = paginated.total;
      pages = paginated.pages;
      currentPage = paginated.page;
    } else {
      const paginated = schemeDb.searchSchemesByTextPaginated(query.text, page, pageSize);
      csvResults = paginated.schemes;
      total = paginated.total;
      pages = paginated.pages;
      currentPage = paginated.page;
    }

    const results = csvResults.map((scheme, index) =>
      csvSchemeToSearchResult(scheme, query, index, total || csvResults.length)
    );

    logger.info('Search completed', { resultsCount: results.length, page: currentPage, total });
    return { results, total, page: currentPage, pages };

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
