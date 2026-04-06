const { algoliasearch } = require('algoliasearch');
const mongoose = require('mongoose');
const Facility = require("../models/Facilities.js");
const FacilityOwner = require("../models/FacilityOwner.js");
const Booking = require("../models/Booking.js");
const Payment = require("../models/Payments.js");
const User = require("../models/User.js");

// Import helpers from Nominatimservice
const {
  geocodeAddress,
  reverseGeocodeCoordinates,
  findNearbyFacilities,
  getRouteDistance,
  searchNearbyPlaces,
  validateCoordinates,
  getAddressSuggestions
} = require('../services/Nominatimservice.js');

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);
const INDEX_NAME = 'facilities_index';

// GET FACILITY BY ID
const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id)
      .populate('owner', 'name email');

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: facility
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch facility",
      error: error.message
    });
  }
};

// CREATE FACILITY (User becomes owner)
const createFacility = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Must be logged in to create facility"
      });
    }

    let facilityOwner = await FacilityOwner.findOne({ user: req.user._id });

    if (!facilityOwner) {
      facilityOwner = await FacilityOwner.create({
        user: req.user._id,
        companyName: req.body.companyName || req.user.name,
        verified: false,
        statistics: {
          totalFacilities: 0,
          activeFacilities: 0,
          verifiedFacilities: 0
        }
      });
    }

    const facility = new Facility({
      ...req.body,
      owner: req.user._id,
      verified: false
    });

    const savedFacility = await facility.save();

    facilityOwner.facilities.push(savedFacility._id);
    facilityOwner.statistics.totalFacilities += 1;
    facilityOwner.statistics.activeFacilities += 1;
    await facilityOwner.save();

    if (req.user.role === 'user') {
      await User.findByIdAndUpdate(
        req.user._id,
        { role: 'facility_owner' }
      );
    }

    await client.saveObject({
      indexName: INDEX_NAME,
      body: {
        objectID: savedFacility._id.toString(),
        name: savedFacility.name,
        type: savedFacility.type,
        owner: savedFacility.owner.toString(),
        verified: false,
        isActive: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "Facility created successfully. FacilityOwner record created.",
      data: {
        facility: savedFacility,
        facilityOwner: {
          _id: facilityOwner._id,
          totalFacilities: facilityOwner.statistics.totalFacilities,
          verified: facilityOwner.verified
        }
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to create facility",
      error: error.message
    });
  }
};

// GET FACILITY OWNER PROFILE
const getFacilityOwnerProfile = async (req, res) => {
  try {
    const facilityOwner = await FacilityOwner.findOne({ user: req.user._id })
      .populate('user', 'name email phone')
      .populate('facilities', 'name type verified');

    if (!facilityOwner) {
      return res.status(404).json({
        success: false,
        message: "FacilityOwner profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: facilityOwner
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message
    });
  }
};

// GET ALL FACILITIES
const getAllFacilities = async (req, res) => {
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

// VERIFY FACILITY (Admin only)
const verifyFacility = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin only"
      });
    }

    const facility = await Facility.findByIdAndUpdate(
      req.params.id,
      {
        verified: true,
        verificationDate: new Date()
      },
      { new: true }
    );

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    const facilityOwner = await FacilityOwner.findOne({
      facilities: facility._id
    });

    if (facilityOwner) {
      facilityOwner.statistics.verifiedFacilities += 1;
      await facilityOwner.save();
    }

    await client.saveObject({
      indexName: INDEX_NAME,
      body: {
        objectID: facility._id.toString(),
        verified: true
      }
    });

    return res.status(200).json({
      success: true,
      message: "Facility verified successfully",
      data: facility
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to verify facility",
      error: error.message
    });
  }
};

// UPDATE FACILITY OWNER PROFILE
const updateFacilityOwnerProfile = async (req, res) => {
  try {
    const { companyName, bio, socialLinks, bankDetails, policies } = req.body;

    const facilityOwner = await FacilityOwner.findOneAndUpdate(
      { user: req.user._id },
      {
        companyName,
        bio,
        socialLinks,
        bankDetails,
        policies
      },
      { new: true, runValidators: true }
    );

    if (!facilityOwner) {
      return res.status(404).json({
        success: false,
        message: "FacilityOwner profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: facilityOwner
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

// GET OWNER'S FACILITIES
const getMyFacilities = async (req, res) => {
  try {
    const { page = 1, limit = 10, verified } = req.query;

    const filter = { owner: req.user._id };

    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [facilities, total] = await Promise.all([
      Facility.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Facility.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: facilities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch facilities",
      error: error.message
    });
  }
};

// UPDATE FACILITY (Owner only)
const updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    if (facility.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own facilities"
      });
    }

    const { owner, verified, verificationDate, ...allowedUpdates } = req.body;

    const updatedFacility = await Facility.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Facility updated successfully",
      data: updatedFacility
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to update facility",
      error: error.message
    });
  }
};

// DELETE FACILITY (Owner only)
const deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    if (facility.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own facilities"
      });
    }

    await Facility.findByIdAndDelete(req.params.id);

    const facilityOwner = await FacilityOwner.findOne({
      user: facility.owner
    });

    if (facilityOwner) {
      facilityOwner.facilities = facilityOwner.facilities.filter(
        f => f.toString() !== req.params.id
      );
      facilityOwner.statistics.totalFacilities -= 1;
      if (facility.verified) {
        facilityOwner.statistics.verifiedFacilities -= 1;
      }
      await facilityOwner.save();
    }

    await client.deleteObject({
      indexName: INDEX_NAME,
      objectID: req.params.id.toString()
    });

    return res.status(200).json({
      success: true,
      message: "Facility deleted successfully"
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to delete facility",
      error: error.message
    });
  }
};

// GET NEARBY FACILITIES (GEOSPATIAL)
const getNearbyFacilities = async (req, res) => {
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
const geocodeLocation = async (req, res) => {
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
const reverseGeocodeLocation = async (req, res) => {
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
const searchFacilitiesByAddress = async (req, res) => {
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
const getRouteInfo = async (req, res) => {
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
const searchNearbyPlacesEndpoint = async (req, res) => {
  try {
    const { latitude, longitude, searchTerm, radius = 5000 } = req.query;
    const places = await searchNearbyPlaces(latitude, longitude, searchTerm, parseInt(radius));

    return res.status(200).json({ success: true, total: places.length, data: places });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Place search failed", error: error.message });
  }
};

// GET ADDRESS AUTOCOMPLETE SUGGESTIONS
const getAddressAutocomplete = async (req, res) => {
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
const getFacilityTypes = async (req, res) => {
  const types = [
    'Conference Room', 
    'Meeting Room', 
    'Auditorium', 
    'Studio', 
    'Fitness Center', 
    'Dining Hall', 
    'Kitchen', 
    'Outdoor Space', 
    'Sports Facility', 
    'Multipurpose Hall', 
    'Other'
  ];
  return res.status(200).json({ success: true, data: types });
};

// GET FACILITY ANALYTICS/STATS
const getFacilityStats = async (req, res) => {
  try {
    const total = await Facility.countDocuments({ isActive: true });
    const byType = await Facility.aggregate([
      { $match: { isActive: true } }, 
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return res.status(200).json({ success: true, data: { totalFacilities: total, byType } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET DETAILED FACILITY REPORT
const getFacilityReport = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = await Facility.findById(id).populate('owner', 'name email');
    if (!facility) {
      return res.status(404).json({ success: false, message: "Facility not found" });
    }

    const isOwner = facility.owner?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to access this report" });
    }

    const bookings = await Booking.find({ facility: id }).populate('user', 'name email').sort({ date: -1 });
    const bookingIds = bookings.map(b => b._id);
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const revenueByMonth = await Payment.aggregate([
      { 
        $match: { 
          bookingId: { $in: bookingIds }, 
          paymentStatus: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const statusDistribution = await Booking.aggregate([
      { $match: { facility: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const dayOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayDistributionRaw = await Booking.aggregate([
      { $match: { facility: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: { $dayOfWeek: "$date" }, count: { $sum: 1 } } }
    ]);
    
    const weekdayDistribution = weekdayDistributionRaw.map(d => ({
      name: dayOfWeekNames[d._id - 1],
      count: d.count
    })).sort((a, b) => dayOfWeekNames.indexOf(a.name) - dayOfWeekNames.indexOf(b.name));

    const hourlyDistribution = await Booking.aggregate([
      { $match: { facility: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$startTime", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        facility,
        summary: {
          totalBookings: bookings.length,
          totalRevenue: payments.filter(p => p.paymentStatus === 'completed').reduce((sum, p) => sum + p.amount, 0),
          averageRating: facility.rating?.average || 0,
          verified: facility.verified
        },
        bookings: bookings.map(b => ({
          _id: b._id,
          userName: b.user?.name,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          total: b.pricing?.total
        })),
        payments: payments.map(p => ({
          _id: p._id,
          amount: p.amount,
          status: p.paymentStatus,
          method: p.paymentMethod,
          date: p.createdAt
        })),
        analytics: {
          revenueByMonth,
          statusDistribution,
          weekdayDistribution,
          hourlyDistribution
        }
      }
    });

  } catch (error) {
    console.error("Report Generation Error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate report", error: error.message });
  }
};

module.exports = {
  getFacilityById,
  createFacility,
  getFacilityOwnerProfile,
  getAllFacilities,
  verifyFacility,
  updateFacilityOwnerProfile,
  getMyFacilities,
  updateFacility,
  deleteFacility,
  getNearbyFacilities,
  geocodeLocation,
  reverseGeocodeLocation,
  searchFacilitiesByAddress,
  getRouteInfo,
  searchNearbyPlacesEndpoint,
  getAddressAutocomplete,
  getFacilityTypes,
  getFacilityStats,
  getFacilityReport
};