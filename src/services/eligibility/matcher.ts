// Eligibility matching algorithm

import { UserProfile, Scheme, EligibilityResult, EligibilityCriteria } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('EligibilityMatcher');

export async function checkEligibility(
  userProfile: UserProfile,
  schemes: Scheme[]
): Promise<EligibilityResult[]> {
  try {
    logger.info('Checking eligibility', {
      profileState: userProfile.state,
      schemesCount: schemes.length
    });

    if (!userProfile.age || !userProfile.state) {
      throw new JanSevaError(
        ErrorCodes.ELIG_INSUFFICIENT_DATA,
        'Insufficient user profile data',
        false,
        { missingFields: ['age', 'state'].filter(f => !userProfile[f as keyof UserProfile]) }
      );
    }

    const results: EligibilityResult[] = schemes.map(scheme =>
      evaluateSchemeEligibility(userProfile, scheme)
    );

    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);

    logger.info('Eligibility check completed', {
      totalSchemes: schemes.length,
      eligibleSchemes: results.filter(r => r.eligible).length
    });

    return results;

  } catch (error) {
    logger.error('Eligibility check failed', error as Error);

    if (error instanceof JanSevaError) {
      throw error;
    }

    throw new JanSevaError(
      ErrorCodes.ELIG_SEARCH_FAILED,
      'Failed to check eligibility',
      true,
      { originalError: (error as Error).message }
    );
  }
}

function evaluateSchemeEligibility(
  profile: UserProfile,
  scheme: Scheme
): EligibilityResult {
  const criteria = scheme.eligibilityCriteria;
  const missingCriteria: string[] = [];
  let matchScore = 0;
  let totalCriteria = 0;

  // Age check
  if (criteria.minAge !== undefined || criteria.maxAge !== undefined) {
    totalCriteria++;
    if (profile.age) {
      const ageMatch = checkAge(profile.age, criteria.minAge, criteria.maxAge);
      if (ageMatch) {
        matchScore++;
      } else {
        missingCriteria.push(`Age must be between ${criteria.minAge || 0} and ${criteria.maxAge || 100}`);
      }
    } else {
      missingCriteria.push('Age information required');
    }
  }

  // Gender check
  if (criteria.gender && criteria.gender.length > 0) {
    totalCriteria++;
    if (profile.gender && criteria.gender.includes(profile.gender.toLowerCase())) {
      matchScore++;
    } else {
      missingCriteria.push(`Gender must be ${criteria.gender.join(' or ')}`);
    }
  }

  // State check
  if (criteria.states && criteria.states.length > 0 && criteria.states[0] !== '') {
    totalCriteria++;
    if (profile.state && criteria.states.some(s => s.toLowerCase() === profile.state.toLowerCase())) {
      matchScore++;
    } else {
      missingCriteria.push(`Must be resident of ${criteria.states.join(', ')}`);
    }
  }

  // Income check
  if (criteria.income && (criteria.income.min !== undefined || criteria.income.max !== undefined)) {
    totalCriteria++;
    if (profile.income !== undefined) {
      const incomeMatch = checkIncome(profile.income, criteria.income);
      if (incomeMatch) {
        matchScore++;
      } else {
        missingCriteria.push(`Income must be within specified range`);
      }
    } else {
      missingCriteria.push('Income information required');
    }
  }

  // Category check
  if (criteria.category && criteria.category.length > 0) {
    totalCriteria++;
    if (profile.category && criteria.category.some(c => c.toLowerCase() === profile.category?.toLowerCase())) {
      matchScore++;
    } else {
      missingCriteria.push(`Category must be ${criteria.category.join(', ')}`);
    }
  }

  // Occupation check
  if (criteria.occupation && criteria.occupation.length > 0) {
    totalCriteria++;
    if (profile.occupation && criteria.occupation.some(o => o.toLowerCase() === profile.occupation?.toLowerCase())) {
      matchScore++;
    } else {
      missingCriteria.push(`Occupation must be ${criteria.occupation.join(', ')}`);
    }
  }

  // If the scheme has literally zero structured criteria defined in the CSV tags (totalCriteria = 0),
  // we treat it as a broad scheme and give it a base score so it isn't disqualified. 
  // We'll give it a 0.5 score.
  let finalScore = 0;
  if (totalCriteria === 0) {
    finalScore = 0.5;
  } else {
    finalScore = matchScore / totalCriteria;
  }

  // Lowered threshold from 0.7 to 0.4 to be more lenient with unstructured DB data
  const eligible = finalScore >= 0.4;

  return {
    schemeId: scheme.schemeId,
    schemeName: scheme.name,
    eligible,
    matchScore: finalScore,
    estimatedBenefit: eligible ? scheme.benefits[0] : undefined,
    missingCriteria: missingCriteria.length > 0 ? missingCriteria : undefined,
    requiredDocuments: scheme.documents,
  };
}

function checkAge(age: number, minAge?: number, maxAge?: number): boolean {
  if (minAge !== undefined && age < minAge) return false;
  if (maxAge !== undefined && age > maxAge) return false;
  return true;
}

function checkIncome(income: number, criteria: { min?: number; max?: number }): boolean {
  if (criteria.min !== undefined && income < criteria.min) return false;
  if (criteria.max !== undefined && income > criteria.max) return false;
  return true;
}

export function suggestAlternativeSchemes(
  userProfile: UserProfile,
  allSchemes: Scheme[]
): EligibilityResult[] {
  // Find schemes with partial match (40-69% match score)
  const results = allSchemes.map(scheme =>
    evaluateSchemeEligibility(userProfile, scheme)
  );

  return results
    .filter(r => r.matchScore >= 0.4 && r.matchScore < 0.7)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}
