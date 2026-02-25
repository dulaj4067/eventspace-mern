
// RatingRoutes.js


const express = require('express');
const router = express.Router();

// CONTROLLER
const {
    createRating,
    getRatings,
    updateRating,
    deleteRating,
    updateRatingStatus
} = require('../controllers/RatingController');

// MIDDLEWARE
const { verifyToken, isAdmin } = require('../middleware/Authmiddleware');


// ROUTES

//  Create a rating
// POST /api/ratings
// Authenticated users only
router.post(
    '/',
    verifyToken,
    createRating
);

//  Get ratings
// GET /api/ratings
// Optional query params: ?userId=&facilityId=&eventId=&status=
router.get(
    '/',
    verifyToken, // can make public if you want everyone to see ratings
    getRatings
);

// Update a rating (user can update their own rating)
// PATCH /api/ratings/:id
router.patch(
    '/:id',
    verifyToken,
    updateRating
);

// Delete a rating (user or admin)
router.delete(
    '/:id',
    verifyToken,
    deleteRating
);

// Admin: Update rating status (approve, reject, flagged)
// PATCH /api/ratings/:id/status
router.patch(
    '/:id/status',
    verifyToken,
    isAdmin,
    updateRatingStatus
);


// EXPORT ROUTER
module.exports = router;