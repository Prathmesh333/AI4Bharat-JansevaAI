// Common Service Center location services

import { CSCLocation } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('CSCService');
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
const fetchImpl = (globalThis as any).fetch as
  | ((input: string, init?: any) => Promise<any>)
  | undefined;

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

    const googlePlacesResults = await searchCSCsViaGooglePlaces(query);
    if (googlePlacesResults && googlePlacesResults.length > 0) {
      logger.info('CSC search completed via Google Places', { resultsCount: googlePlacesResults.length });
      return googlePlacesResults;
    }

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
      return [buildMapsSearchFallback(query)];
    }

    logger.info('CSC search completed', { resultsCount: results.length });
    return results
      .slice(0, 10)
      .map(csc => enrichCSCWithMapsLinks(csc, 'catalog'));

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
  
  return enrichCSCWithMapsLinks(csc, 'catalog');
}

function enrichCSCWithMapsLinks(
  csc: CSCLocation,
  source: CSCLocation['source']
): CSCLocation {
  const locationString = buildLocationString({
    address: csc.address,
    district: csc.district,
    state: csc.state,
    pincode: csc.pincode,
  });

  return {
    ...csc,
    mapsUrl: csc.mapsUrl || buildGoogleMapsSearchUrl(locationString),
    directionsUrl: csc.directionsUrl || buildGoogleDirectionsUrl(locationString),
    source,
  };
}

function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function buildLocationString(input: {
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
}): string {
  return [
    input.address,
    input.district,
    input.state,
    input.pincode,
    'India',
  ]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(', ');
}

function buildAreaQuery(query: LocationQuery): string {
  const area = [
    'Common Service Center',
    query.district || '',
    query.state || '',
    query.pincode || '',
    'India',
  ]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(' ');

  return area || 'Common Service Center India';
}

function buildMapsSearchFallback(query: LocationQuery): CSCLocation {
  const searchQuery = buildAreaQuery(query);
  const locationLabel = [query.district, query.state, query.pincode]
    .map(part => (part || '').trim())
    .filter(Boolean)
    .join(', ');

  const displayArea = locationLabel || 'your area';

  return {
    cscId: `CSC-SEARCH-${(query.pincode || query.district || query.state || 'IND').replace(/\s+/g, '-').toUpperCase()}`,
    name: `CSC search near ${displayArea}`,
    address: `Open Google Maps results for Common Service Centers near ${displayArea}.`,
    state: query.state || 'Unknown',
    district: query.district || 'Unknown',
    pincode: query.pincode || '',
    latitude: 0,
    longitude: 0,
    contactNumber: 'CSC Helpline: 1800-121-3468',
    operatingHours: 'Please verify timings with the selected center before visiting.',
    servicesOffered: ['Government Schemes', 'Assisted Application', 'Document Support'],
    mapsUrl: buildGoogleMapsSearchUrl(searchQuery),
    directionsUrl: buildGoogleMapsSearchUrl(searchQuery),
    source: 'maps_search',
    note: 'Exact CSC listing is not available locally, so this opens nearby CSC results directly in Google Maps.',
  };
}

async function searchCSCsViaGooglePlaces(query: LocationQuery): Promise<CSCLocation[] | null> {
  if (!googleMapsApiKey || !fetchImpl) {
    return null;
  }

  const textQuery = buildAreaQuery(query);

  try {
    const response = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.nationalPhoneNumber',
          'places.googleMapsUri',
          'places.regularOpeningHours',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 5,
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Google Places CSC lookup failed', { status: response.status, errorText });
      return null;
    }

    const payload = await response.json();
    const places = Array.isArray(payload?.places) ? payload.places : [];

    if (places.length === 0) {
      return null;
    }

    return places.map((place: any, index: number) => {
      const address = String(place?.formattedAddress || '').trim();
      const locationString = buildLocationString({
        address,
        district: query.district,
        state: query.state,
        pincode: query.pincode,
      });

      return {
        cscId: place?.id || `GOOGLE-CSC-${index + 1}`,
        name: place?.displayName?.text || place?.displayName || `CSC ${index + 1}`,
        address: address || `CSC near ${query.pincode || query.district || query.state || 'your area'}`,
        state: query.state || '',
        district: query.district || '',
        pincode: query.pincode || '',
        latitude: Number(place?.location?.latitude || 0),
        longitude: Number(place?.location?.longitude || 0),
        contactNumber: place?.nationalPhoneNumber || 'Call center directly from Google Maps listing',
        operatingHours: formatGoogleOpeningHours(place?.regularOpeningHours),
        servicesOffered: ['Government Schemes', 'CSC Assisted Services'],
        mapsUrl: place?.googleMapsUri || buildGoogleMapsSearchUrl(locationString),
        directionsUrl: buildGoogleDirectionsUrl(locationString),
        source: 'google_places',
        note: 'Powered by Google Maps place search.',
      } as CSCLocation;
    });
  } catch (error) {
    logger.warn('Google Places CSC lookup error', { message: (error as Error).message });
    return null;
  }
}

function formatGoogleOpeningHours(regularOpeningHours: any): string {
  const weekdayDescriptions = regularOpeningHours?.weekdayDescriptions;
  if (Array.isArray(weekdayDescriptions) && weekdayDescriptions.length > 0) {
    return weekdayDescriptions[0];
  }

  return 'Please confirm timings before visiting.';
}
