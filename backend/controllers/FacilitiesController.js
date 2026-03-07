import Facility from "../models/Facilities.js";
import {
  findNearbyFacilities,
  validateCoordinates,
  geocodeAddress,
  reverseGeocodeCoordinates,
  searchNearbyPlaces,
  getRouteDistance,
  getAddressSuggestions
} from "../services/Nominatimservice.js";

// CREATE SINGLE FACILITY
export const createFacility = async (req, res) => {
  try {
    const facility = new Facility(req.body);
    const savedFacility = await facility.save();

    return res.status(201).json({
      success: true,
      message: "Facility created successfully",
      data: savedFacility,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to create facility",
      error: error.message,
    });
  }
};

// CREATE BULK FACILITIES
export const createFacilitiesBulk = async (req, res) => {
  try {
    const facilities = await Facility.insertMany(req.body);

    return res.status(201).json({
      success: true,
      message: "Facilities created successfully",
      count: facilities.length,
      data: facilities,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Bulk creation failed",
      error: error.message,
    });
  }
};

// GET ALL FACILITIES
export const getAllFacilities = async (req, res) => {
  try {
    const {
      type,
      status,
      minCapacity,
      maxCapacity,
      minRate,
      maxRate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { isActive: true };

    if (type) filter.type = type;
    if (status) filter["availability.status"] = status;
    if (minCapacity) filter.capacity = { ...filter.capacity, $gte: Number(minCapacity) };
    if (maxCapacity) filter.capacity = { ...filter.capacity, $lte: Number(maxCapacity) };
    if (minRate) filter.hourlyRate = { ...filter.hourlyRate, $gte: Number(minRate) };
    if (maxRate) filter.hourlyRate = { ...filter.hourlyRate, $lte: Number(maxRate) };

    const facilities = await Facility.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Facility.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: facilities,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch facilities",
      error: error.message,
    });
  }
};

// GET SINGLE FACILITY
export const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility || !facility.isActive) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: facility,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid facility ID",
      error: error.message,
    });
  }
};

// UPDATE SINGLE FACILITY
export const updateFacility = async (req, res) => {
  try {
    const updatedFacility = await Facility.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedFacility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Facility updated successfully",
      data: updatedFacility,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Update failed",
      error: error.message,
    });
  }
};

// UPDATE BULK FACILITIES
export const updateFacilitiesBulk = async (req, res) => {
  try {
    const { ids, updateData } = req.body;

    const result = await Facility.updateMany(
      { _id: { $in: ids } },
      { $set: updateData },
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bulk update successful",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Bulk update failed",
      error: error.message,
    });
  }
};

// DELETE SINGLE FACILITY (SOFT DELETE)
export const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Facility deactivated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Delete failed",
      error: error.message,
    });
  }
};

// DELETE BULK FACILITIES (SOFT DELETE)
export const deleteFacilitiesBulk = async (req, res) => {
  try {
    const { ids } = req.body;

    const result = await Facility.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false } }
    );

    return res.status(200).json({
      success: true,
      message: "Bulk delete successful",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Bulk delete failed",
      error: error.message,
    });
  }
};

// GET NEARBY FACILITIES (GEOSPATIAL)
export const getNearbyFacilities = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 5 } = req.query;

    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const facilities = await Facility.find({ 
      isActive: true, 
      'location.coordinates': { $exists: true } 
    });

    const nearby = findNearbyFacilities(validation.lat, validation.lon, facilities, parseFloat(radiusKm));

    return res.status(200).json({
      success: true,
      message: `Found ${nearby.length} facilities within ${radiusKm}km`,
      userLocation: { latitude: validation.lat, longitude: validation.lon },
      total: nearby.length,
      data: nearby,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Nearby search failed", error: error.message });
  }
};

// ADDRESS TO COORDINATES (GEOCODING)
export const geocodeLocation = async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ success: false, message: "Address is required" });

    const coordinates = await geocodeAddress(address);
    if (!coordinates) return res.status(404).json({ success: false, message: "Address not found" });

    return res.status(200).json({ success: true, data: coordinates });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Geocoding failed", error: error.message });
  }
};

// COORDINATES TO ADDRESS (REVERSE GEOCODING)
export const reverseGeocodeLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) return res.status(400).json({ success: false, message: validation.message });

    const address = await reverseGeocodeCoordinates(validation.lat, validation.lon);
    if (!address) return res.status(404).json({ success: false, message: "Address not found" });

    return res.status(200).json({ success: true, data: { latitude: validation.lat, longitude: validation.lon, address } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Reverse geocoding failed", error: error.message });
  }
};

// SEARCH NEARBY BY ADDRESS STRING
export const searchFacilitiesByAddress = async (req, res) => {
  try {
    const { address, radiusKm = 5 } = req.body;
    if (!address) return res.status(400).json({ success: false, message: "Address is required" });

    const coords = await geocodeAddress(address);
    if (!coords) return res.status(404).json({ success: false, message: "Address not found" });

    const facilities = await Facility.find({ isActive: true });
    const nearby = findNearbyFacilities(coords.latitude, coords.longitude, facilities, parseFloat(radiusKm));

    return res.status(200).json({
      success: true,
      address: coords.displayName,
      userLocation: { latitude: coords.latitude, longitude: coords.longitude },
      total: nearby.length,
      data: nearby,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
};

// GET ROUTE DISTANCE AND DURATION
export const getRouteInfo = async (req, res) => {
  try {
    const { startLatitude, startLongitude, endLatitude, endLongitude } = req.query;
    const routeInfo = await getRouteDistance(startLatitude, startLongitude, endLatitude, endLongitude);

    if (!routeInfo) return res.status(404).json({ success: false, message: "Route not found" });

    return res.status(200).json({ success: true, data: routeInfo });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Routing failed", error: error.message });
  }
};

// SEARCH EXTERNAL PLACES (POI)
export const searchNearbyPlacesEndpoint = async (req, res) => {
  try {
    const { latitude, longitude, searchTerm, radius = 5000 } = req.query;
    const places = await searchNearbyPlaces(latitude, longitude, searchTerm, parseInt(radius));

    return res.status(200).json({ success: true, total: places.length, data: places });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Place search failed", error: error.message });
  }
};

// GET ADDRESS AUTOCOMPLETE SUGGESTIONS
export const getAddressAutocomplete = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 3) return res.status(400).json({ success: false, message: "Query too short" });

    const suggestions = await getAddressSuggestions(query);
    return res.status(200).json({ success: true, total: suggestions.length, data: suggestions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Autocomplete failed", error: error.message });
  }
};

// GET FACILITY TYPES LIST
export const getFacilityTypes = async (req, res) => {
  const types = ['Conference Room', 'Meeting Room', 'Auditorium', 'Studio', 'Sports Facility', 'Multipurpose Hall'];
  return res.status(200).json({ success: true, data: types });
};

// GET FACILITY ANALYTICS/STATS
export const getFacilityStats = async (req, res) => {
  try {
    const total = await Facility.countDocuments({ isActive: true });
    const byType = await Facility.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$type', count: { $sum: 1 } } }]);

    return res.status(200).json({ success: true, data: { totalFacilities: total, byType } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};