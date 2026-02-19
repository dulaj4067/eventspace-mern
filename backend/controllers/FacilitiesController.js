import Facility from "../models/Facility.js";

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

        if (!facility) {
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
