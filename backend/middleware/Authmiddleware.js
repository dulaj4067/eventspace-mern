const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT token
const verifyToken = async (req, res, next) => { // 2. Add 'async'
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key_here");
        
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = user; 
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Optional JWT — sets req.user when a valid token is sent; otherwise continues
const optionalVerifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key_here");
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
            req.user = user;
        }
    } catch {
        // ignore invalid tokens for optional auth
    }
    next();
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    // 4. Ensure req.user exists before checking role
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};

module.exports = { verifyToken, optionalVerifyToken, isAdmin };