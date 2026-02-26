// Semantic search and retrieval for schemes

import { Scheme, UserProfile, Language } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('SchemeSearch');

export interface SearchQuery {
  text: string;
  language: Language;
  userProfile?: UserProfile;
  limit?: number;
}

export interface SearchResult {
  schemeId: string;
  schemeName: string;
  relevanceScore: number;
  excerpt: string;
  matchedCriteria: string[];
}

// Mock scheme database (in production, this would query OpenSearch)
const mockSchemes: Scheme[] = [
  {
    schemeId: 'PM-KISAN',
    name: 'PM-KISAN',
    nameTranslations: {
      [Language.HINDI]: 'प्रधानमंत्री किसान सम्मान निधि',
      [Language.ENGLISH]: 'PM Kisan Samman Nidhi',
      [Language.BENGALI]: 'পিএম কিষাণ সম্মান নিধি',
      [Language.TELUGU]: 'పిఎం కిసాన్ సమ్మాన్ నిధి',
      [Language.MARATHI]: 'पीएम किसान सन्मान निधी',
      [Language.TAMIL]: 'பிஎம் கிசான் சம்மான் நிதி',
      [Language.GUJARATI]: 'પીએમ કિસાન સમ્માન નિધિ',
      [Language.KANNADA]: 'ಪಿಎಂ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ',
      [Language.MALAYALAM]: 'പിഎം കിസാൻ സമ്മാൻ നിധി',
      [Language.PUNJABI]: 'ਪੀਐਮ ਕਿਸਾਨ ਸਮਾਨ ਨਿਧੀ',
      [Language.ODIA]: 'ପିଏମ୍ କିଷାଣ ସମ୍ମାନ ନିଧି',
    },
    description: 'Income support to farmers',
    descriptionTranslations: {} as any,
    ministry: 'Ministry of Agriculture',
    category: 'Agriculture',
    benefits: ['₹6000 per year in 3 installments'],
    eligibilityCriteria: {
      occupation: ['farmer'],
      landOwnership: true,
    },
    documents: ['Land records', 'Aadhaar', 'Bank account'],
    applicationProcess: 'Online through PM-KISAN portal',
    officialUrl: 'https://pmkisan.gov.in',
    lastUpdated: Date.now(),
  },
];

export async function searchSchemes(query: SearchQuery): Promise<SearchResult[]> {
  try {
    logger.info('Searching schemes', { 
      query: query.text, 
      language: query.language,
      hasProfile: !!query.userProfile 
    });

    // In production, this would:
    // 1. Generate embedding for query using Cohere
    // 2. Search OpenSearch vector index
    // 3. Apply user profile filters
    // 4. Rank results by relevance

    // Mock implementation
    const results: SearchResult[] = mockSchemes
      .filter(scheme => matchesQuery(scheme, query))
      .map(scheme => ({
        schemeId: scheme.schemeId,
        schemeName: scheme.nameTranslations[query.language] || scheme.name,
        relevanceScore: calculateRelevance(scheme, query),
        excerpt: scheme.description,
        matchedCriteria: getMatchedCriteria(scheme, query.userProfile),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.limit || 10);

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

function matchesQuery(scheme: Scheme, query: SearchQuery): boolean {
  const searchText = query.text.toLowerCase();
  const schemeName = scheme.name.toLowerCase();
  const schemeDesc = scheme.description.toLowerCase();
  
  return schemeName.includes(searchText) || 
         schemeDesc.includes(searchText) ||
         scheme.category.toLowerCase().includes(searchText);
}

function calculateRelevance(scheme: Scheme, query: SearchQuery): number {
  let score = 0.5; // Base score
  
  // Boost if user profile matches eligibility
  if (query.userProfile) {
    const criteria = scheme.eligibilityCriteria;
    
    if (criteria.occupation && query.userProfile.occupation) {
      if (criteria.occupation.includes(query.userProfile.occupation)) {
        score += 0.3;
      }
    }
    
    if (criteria.landOwnership !== undefined && query.userProfile.landOwnership !== undefined) {
      if (criteria.landOwnership === query.userProfile.landOwnership) {
        score += 0.2;
      }
    }
  }
  
  return Math.min(score, 1.0);
}

function getMatchedCriteria(scheme: Scheme, profile?: UserProfile): string[] {
  if (!profile) return [];
  
  const matched: string[] = [];
  const criteria = scheme.eligibilityCriteria;
  
  if (criteria.occupation && profile.occupation && criteria.occupation.includes(profile.occupation)) {
    matched.push('occupation');
  }
  
  if (criteria.landOwnership !== undefined && profile.landOwnership === criteria.landOwnership) {
    matched.push('landOwnership');
  }
  
  if (criteria.states && profile.state && criteria.states.includes(profile.state)) {
    matched.push('state');
  }
  
  return matched;
}

export async function getSchemeDetails(schemeId: string, language: Language): Promise<Scheme | null> {
  try {
    const scheme = mockSchemes.find(s => s.schemeId === schemeId);
    return scheme || null;
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
