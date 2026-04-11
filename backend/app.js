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
//const paymentLogsRoutes = require("./routers/paymentLogsRoutes");
const locationRoutes = require("./routers/LocationRoutes");
const communityCenterRoutes = require("./routers/CommunityCenterRoutes");
const uploadRoutes = require("./routers/UploadRoutes");
//const path = require("path");

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:3000',
  'https://medicate-git-main-dewmi-disanayakes-projects.vercel.app', // Adding user's likely vercel domain if known, but keeping it generic is better
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      // In production, we should be stricter, but for now we allow any if FRONTEND_URL is not set
      if (process.env.FRONTEND_URL) {
        return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      }
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve uploaded files (bank slips, images, etc.) as static
// Files are accessible at: http://localhost:5000/uploads/bank-slips/<filename>
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
//app.use("/api/payment-logs", paymentLogsRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
    // Set static folder
    app.use(express.static(path.join(__dirname, "../frontend/build")));

    app.get("(.*)", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
    });
} else {
    // Home route for development
    app.get("/", (req, res) => {
        res.json({ message: "Welcome to Event Management System API" });
    });
}

// MongoDB connection
mongoose.connect(
    process.env.MONGODB_URI || "mongodb+srv://admin:U4QUAjyNc3bfNRKx@cluster0.sjyibwg.mongodb.net/eventspace?retryWrites=true&w=majority"
)
    .then(() => console.log("Connected to MongoDB"))
    .then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => console.log("MongoDB connection error:", err));

module.exports = app;