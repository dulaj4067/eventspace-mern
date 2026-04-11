const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Import routes
const userRoutes = require("./routers/Userroutes");
const bookingRoutes = require("./routers/Bookingroutes");
//const adminRoutes = require("./routers/AdminRoutes.js");
const adminSettingsRoutes = require("./routers/AdminSettingsRoute.js");
const ratingRoutes = require('./routers/RatingRoutes');
const eventRoutes = require("./routers/EventRoutes.js");
const facilityRoutes = require("./routers/FacilitiesRoutes");
const searchRoutes = require("./routers/SearchRoute.js");
const paymentRoutes = require("./routers/PaymentRoutes");
const locationRoutes = require("./routers/LocationRoutes");
const communityCenterRoutes = require("./routers/CommunityCenterRoutes");
const uploadRoutes = require("./routers/UploadRoutes");
const communityRoutes = require("./routers/CommunityRoutes");

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://eventspace-mern.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow any vercel deployment URL dynamically or localhost
    if (
      origin.includes('vercel.app') || 
      origin.includes('localhost') ||
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve uploaded files (bank slips, images, etc.) as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/facilities", facilityRoutes);
app.use('/api/search', searchRoutes);
//app.use("/api/admins", adminRoutes);
app.use("/api/admin-settings", adminSettingsRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/community-centers", communityCenterRoutes);
app.use('/api/ratings', ratingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/community", communityRoutes);
//app.use("/api/payment-logs", paymentLogsRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
    // Set static folder
    app.use(express.static(path.join(__dirname, "../frontend/build")));

    app.get("/{*path}", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
    });
} else {
    // Home route for development
    app.get("/", (req, res) => {
        res.json({ message: "Welcome to Event Management System API" });
    });
}

// MongoDB connection
if (!process.env.MONGODB_URI) {
    console.error("CRITICAL ERROR: MONGODB_URI is not defined in environment variables.");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => console.log("MongoDB connection error:", err));

module.exports = app;