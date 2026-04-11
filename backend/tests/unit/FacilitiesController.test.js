jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn(() => ({
    saveObject: jest.fn(),
    deleteObject: jest.fn()
  }))
}));

const { getFacilityById, getAllFacilities } = require('../../controllers/FacilitiesController');
const Facility = require('../../models/Facilities');

jest.mock('../../models/Facilities');

describe('FacilitiesController Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { _id: 'user123', role: 'user' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getFacilityById', () => {
    it('should return 200 and facility data if found', async () => {
      const mockFacility = { _id: 'fac123', name: 'Test Facility', owner: 'owner123' };
      req.params.id = 'fac123';
      
      Facility.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockFacility)
      });

      await getFacilityById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFacility
      });
    });

    it('should return 404 if facility not found', async () => {
      req.params.id = 'nonexistent';
      
      Facility.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await getFacilityById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Facility not found'
      }));
    });
  });

  describe('getAllFacilities', () => {
    it('should return all facilities with pagination', async () => {
      const mockFacilities = [{ name: 'F1' }, { name: 'F2' }];
      Facility.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockFacilities)
      });
      Facility.countDocuments = jest.fn().mockResolvedValue(2);

      await getAllFacilities(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total: 2,
        data: mockFacilities
      }));
    });
  });
});
