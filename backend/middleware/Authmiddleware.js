const jwt = require("jsonwebtoken");

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key_here");
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};

module.exports = { verifyToken, isAdmin };