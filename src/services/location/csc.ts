// Common Service Center location services

import { CSCLocation } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('CSCService');

// Mock CSC database (in production, query from database)
const mockCSCs: CSCLocation[] = [
  {
    cscId: 'CSC-MH-001',
    name: 'Mumbai CSC Center',
    address: '123 Main Street, Mumbai',
    state: 'Maharashtra',
    district: 'Mumbai',
    pincode: '400001',
    latitude: 19.0760,
    longitude: 72.8777,
    contactNumber: '+91-22-12345678',
    email: 'mumbai@csc.gov.in',
    operatingHours: 'Mon-Sat: 9:00 AM - 6:00 PM',
    servicesOffered: ['Aadhaar', 'PAN', 'Passport', 'Government Schemes'],
  },
];

export interface LocationQuery {
  latitude?: number;
  longitude?: number;
  state?: string;
  district?: string;
  pincode?: string;
  maxDistance?: number; // in kilometers
}

export async function findNearestCSC(query: LocationQuery): Promise<CSCLocation[]> {
  try {
    logger.info('Finding nearest CSC', query);

    let results = [...mockCSCs];

    // Filter by state
    if (query.state) {
      results = results.filter(csc => 
        csc.state.toLowerCase() === query.state!.toLowerCase()
      );
    }

    // Filter by district
    if (query.district) {
      results = results.filter(csc => 
        csc.district.toLowerCase() === query.district!.toLowerCase()
      );
    }

    // Filter by pincode
    if (query.pincode) {
      results = results.filter(csc => csc.pincode === query.pincode);
    }

    // Sort by distance if coordinates provided
    if (query.latitude && query.longitude) {
      results = results.map(csc => ({
        ...csc,
        distance: calculateDistance(
          query.latitude!,
          query.longitude!,
          csc.latitude,
          csc.longitude
        ),
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      // Filter by max distance
      if (query.maxDistance) {
        results = results.filter(csc => 
          (csc as any).distance <= query.maxDistance!
        );
      }
    }

    if (results.length === 0) {
      throw new JanSevaError(
        ErrorCodes.LOC_CSC_NOT_FOUND,
        'No CSC centers found matching criteria',
        false,
        { query }
      );
    }

    logger.info('CSC search completed', { resultsCount: results.length });
    return results.slice(0, 10); // Return top 10

  } catch (error) {
    logger.error('CSC search failed', error as Error);
    
    if (error instanceof JanSevaError) {
      throw error;
    }
    
    throw new JanSevaError(
      ErrorCodes.LOC_CSC_NOT_FOUND,
      'Failed to find CSC centers',
      true,
      { originalError: (error as Error).message }
    );
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function getCSCDetails(cscId: string): Promise<CSCLocation> {
  const csc = mockCSCs.find(c => c.cscId === cscId);
  
  if (!csc) {
    throw new JanSevaError(
      ErrorCodes.LOC_CSC_NOT_FOUND,
      'CSC center not found',
      false,
      { cscId }
    );
  }
  
  return csc;
}
