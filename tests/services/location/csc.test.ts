// Tests for CSC location service

import { calculateDistance, findNearestCSC } from '../../../src/services/location/csc';

describe('CSC Service', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Mumbai to Delhi (approx 1400 km)
      const distance = calculateDistance(19.0760, 72.8777, 28.7041, 77.1025);
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1500);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(19.0760, 72.8777, 19.0760, 72.8777);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      expect(distance).toBeGreaterThan(0);
    });

    it('should return positive distance', () => {
      const distance = calculateDistance(0, 0, 10, 10);
      expect(distance).toBeGreaterThan(0);
    });

    it('should be symmetric', () => {
      const d1 = calculateDistance(19.0760, 72.8777, 28.7041, 77.1025);
      const d2 = calculateDistance(28.7041, 77.1025, 19.0760, 72.8777);
      expect(d1).toBe(d2);
    });
  });

  describe('findNearestCSC', () => {
    it('should find CSCs by state', async () => {
      const results = await findNearestCSC({ state: 'Maharashtra' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(csc => {
        expect(csc.state).toBe('Maharashtra');
      });
    });

    it('should find CSCs by district', async () => {
      const results = await findNearestCSC({ 
        state: 'Maharashtra',
        district: 'Mumbai' 
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find CSCs by pincode', async () => {
      const results = await findNearestCSC({ pincode: '400001' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(csc => {
        expect(csc.pincode).toBe('400001');
      });
    });

    it('should limit results to 10', async () => {
      const results = await findNearestCSC({ state: 'Maharashtra' });
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should include required CSC fields', async () => {
      const results = await findNearestCSC({ state: 'Maharashtra' });
      
      if (results.length > 0) {
        const csc = results[0];
        expect(csc.cscId).toBeDefined();
        expect(csc.name).toBeDefined();
        expect(csc.address).toBeDefined();
        expect(csc.contactNumber).toBeDefined();
        expect(csc.operatingHours).toBeDefined();
        expect(Array.isArray(csc.servicesOffered)).toBe(true);
      }
    });
  });
});
