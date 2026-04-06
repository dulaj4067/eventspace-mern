// RatingRoutes.js
const express = require('express');
const router = express.Router();

const {
    createRating,
    getRatings,
    getFacilityRatings,
    updateRating,
    deleteRating,
    updateRatingStatus,
} = require('../controllers/RatingController');

const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');


// ── Public routes ────────────────────────────────────────────────────────────

// GET /api/ratings/facility/:facilityId
// Anyone can view approved ratings for a facility
router.get('/facility/:facilityId', getFacilityRatings);


// ── Authenticated routes ─────────────────────────────────────────────────────

// POST /api/ratings  — submit a new rating (must have a completed booking)
router.post('/', verifyToken, createRating);

// GET /api/ratings   — query ratings (?userId=&facilityId=&eventId=&status=)
router.get('/', verifyToken, getRatings);

// PATCH /api/ratings/:id  — user edits their own rating
router.patch('/:id', verifyToken, updateRating);

// DELETE /api/ratings/:id
router.delete('/:id', verifyToken, deleteRating);


// ── Admin routes ─────────────────────────────────────────────────────────────

// PATCH /api/ratings/:id/status
router.patch('/:id/status', verifyToken, isAdmin, updateRatingStatus);


module.exports = router;