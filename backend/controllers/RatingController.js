// RatingController.js
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Facility = require('../models/Facilities');


// 1. CREATE RATING
const createRating = async (req, res) => {
    try {
        // ID- user/booking/facility
        const { user, booking, facility, event, rating, title, comment, categories, images } = req.body;

        //  validation now uses correct field names
        if (!user || !booking || !rating) {
            return res.status(400).json({ success: false, message: 'User, booking, and rating are required' });
        }

        // Ensure user exists
        const userDoc = await User.findById(user);
        if (!userDoc) return res.status(404).json({ success: false, message: 'User not found' });

        // Ensure booking exists
        const bookingDoc = await Booking.findById(booking);
        if (!bookingDoc) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Optional: Ensure facility exists if provided
        if (facility) {
            const facilityDoc = await Facility.findById(facility);
            if (!facilityDoc) return res.status(404).json({ success: false, message: 'Facility not found' });
        }

        // create rating using correct field names
        const newRating = new Rating({
            user,
            booking,
            facility: facility || null,
            event: event || null,
            rating,
            title,
            comment,
            categories: categories || {},
            images: images || []
        });

        const savedRating = await newRating.save();
        res.status(201).json({ success: true, message: 'Rating submitted successfully', data: savedRating });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 2. GET RATINGS
const getRatings = async (req, res) => {
    try {
        const { userId, facilityId, eventId, status } = req.query;

        const filter = {};
        if (userId) filter.user = userId;
        if (facilityId) filter.facility = facilityId;
        if (eventId) filter.event = eventId; 
        if (status) filter.status = status;

        const ratings = await Rating.find(filter)
            .populate('user', 'name email')
            .populate('facility', 'name type')
            .populate('event', 'name') 
            .populate('booking', 'date startTime endTime');

        res.status(200).json({ success: true, data: ratings });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 3. UPDATE RATING
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


// 4. DELETE RATING
const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;

        const ratingDoc = await Rating.findById(id);
        if (!ratingDoc) return res.status(404).json({ success: false, message: 'Rating not found' });

        if (ratingDoc.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await ratingDoc.deleteOne(); // .remove() is deprecated, use .deleteOne()
        res.status(200).json({ success: true, message: 'Rating deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 5. UPDATE RATING STATUS (Admin only)
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
    updateRating,
    deleteRating,
    updateRatingStatus
};