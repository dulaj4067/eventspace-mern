// RatingController.js
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Facility = require('../models/Facilities');


// 1. CREATE RATING
const createRating = async (req, res) => {
    try {
        const { booking, facility, event, rating, title, comment, categories, images } = req.body;

        // user comes from verified token middleware
        const user = req.user.id;

        if (!booking || !rating) {
            return res.status(400).json({ success: false, message: 'Booking and rating are required' });
        }

        // Ensure booking exists and belongs to this user
        const bookingDoc = await Booking.findById(booking);
        if (!bookingDoc) return res.status(404).json({ success: false, message: 'Booking not found' });

        if (bookingDoc.user.toString() !== user) {
            return res.status(403).json({ success: false, message: 'You can only review your own bookings' });
        }

        // Optional: Ensure facility exists if provided
        if (facility) {
            const facilityDoc = await Facility.findById(facility);
            if (!facilityDoc) return res.status(404).json({ success: false, message: 'Facility not found' });
        }

        // Prevent duplicate review for same booking
        const existing = await Rating.findOne({ user, booking });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this booking' });
        }

        const newRating = new Rating({
            user,
            booking,
            facility: facility || null,
            event: event || null,
            rating,
            title,
            comment,
            categories: categories || {},
            images: images || [],
            status: 'approved', // auto-approve; change to 'pending' if you want moderation
        });

        const savedRating = await newRating.save();

        // Return populated data so frontend can display immediately
        const populated = await Rating.findById(savedRating._id)
            .populate('user', 'name email profileImage');

        res.status(201).json({ success: true, message: 'Rating submitted successfully', data: populated });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this booking' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};


// 2. GET RATINGS (generic — supports ?facilityId=, ?userId=, ?status=)
const getRatings = async (req, res) => {
    try {
        const { userId, facilityId, eventId, status } = req.query;

        const filter = {};
        if (userId) filter.user = userId;
        if (facilityId) filter.facility = facilityId;
        if (eventId) filter.event = eventId;
        if (status) filter.status = status;

        const ratings = await Rating.find(filter)
            .populate('user', 'name email profileImage')
            .populate('facility', 'name type')
            .populate('event', 'name')
            .populate('booking', 'date startTime endTime')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: ratings });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 3. GET RATINGS FOR A SPECIFIC FACILITY  (public — used by FacilityDetail page)
// GET /api/ratings/facility/:facilityId
const getFacilityRatings = async (req, res) => {
    try {
        const { facilityId } = req.params;

        const ratings = await Rating.find({ facility: facilityId, status: 'approved' })
            .populate('user', 'name email profileImage')
            .sort({ createdAt: -1 });

        // Compute summary stats
        const total = ratings.length;
        const average = total
            ? parseFloat((ratings.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1))
            : 0;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach((r) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

        res.status(200).json({
            success: true,
            data: {
                ratings,
                summary: { total, average, distribution },
            },
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 4. UPDATE RATING
const updateRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, comment, rating, categories, images } = req.body;

        const ratingDoc = await Rating.findById(id);
        if (!ratingDoc) return res.status(404).json({ success: false, message: 'Rating not found' });

        if (ratingDoc.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (title !== undefined) ratingDoc.title = title;
        if (comment !== undefined) ratingDoc.comment = comment;
        if (rating !== undefined) ratingDoc.rating = rating;
        if (categories !== undefined) ratingDoc.categories = categories;
        if (images !== undefined) ratingDoc.images = images;

        const updatedRating = await ratingDoc.save();
        res.status(200).json({ success: true, message: 'Rating updated successfully', data: updatedRating });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 5. DELETE RATING
const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;

        const ratingDoc = await Rating.findById(id);
        if (!ratingDoc) return res.status(404).json({ success: false, message: 'Rating not found' });

        if (ratingDoc.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await ratingDoc.deleteOne();
        res.status(200).json({ success: true, message: 'Rating deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 6. UPDATE RATING STATUS (Admin only)
const updateRatingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['pending', 'approved', 'rejected', 'flagged'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        const ratingDoc = await Rating.findById(id);
        if (!ratingDoc) return res.status(404).json({ success: false, message: 'Rating not found' });

        ratingDoc.status = status;
        const updatedRating = await ratingDoc.save();

        res.status(200).json({ success: true, message: 'Rating status updated', data: updatedRating });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = {
    createRating,
    getRatings,
    getFacilityRatings,
    updateRating,
    deleteRating,
    updateRatingStatus,
};