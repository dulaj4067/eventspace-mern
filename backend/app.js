const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Import routes
const userRoutes = require("./routers/userRoutes");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to Event Management System API" });
});

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