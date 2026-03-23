const User = require("../models/User");   // 👈 was: import User from "../models/User.js"
const bcrypt = require("bcryptjs");        // 👈 was: import bcrypt from "bcryptjs"
const jwt = require("jsonwebtoken");       // 👈 was: import jwt from "jsonwebtoken"

// Register a new user
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "user"
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        return res.status(500).json({ message: "Error registering user", error: err.message });
    }
};

// Login user and generate JWT token
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    try {
        const existingUser = await User.findOne({ email }).select("+password");

        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: existingUser._id,
                email: existingUser.email,
                role: existingUser.role
            },
            process.env.JWT_SECRET || "your_jwt_secret_key_here",
            { expiresIn: "24h" }
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
                role: existingUser.role
            },
            token
        });

    } catch (err) {
        return res.status(500).json({ message: "Error logging in", error: err.message });
    }
};

// Fetch all users
const getAllUsers = async (_, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({ users });
    } catch (err) {
        return res.status(500).json({ message: "Error fetching users", error: err.message });
    }
};

// Fetch a single user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });

    } catch (err) {
        return res.status(500).json({ message: "Error fetching user", error: err.message });
    }
};

// Update user by ID
const updateUser = async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.password) {
            if (updateData.password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters long" });
            }
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });

    } catch (err) {
        return res.status(500).json({ message: "Error updating user", error: err.message });
    }
};

// Delete user by ID
const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });

    } catch (err) {
        return res.status(500).json({ message: "Error deleting user", error: err.message });
    }
};

// Create multiple users at once
const bulkCreateUsers = async (req, res) => {
    const users = req.body.users;

    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: "Users array is required" });
    }

    try {
        const formattedUsers = await Promise.all(
            users.map(async (user) => ({
                ...user,
                password: await bcrypt.hash(user.password, 10),
                role: user.role || "user"
            }))
        );

        const createdUsers = await User.insertMany(formattedUsers);

        res.status(201).json({
            message: "Users created successfully",
            count: createdUsers.length
        });

    } catch (err) {
        return res.status(500).json({ message: "Error creating users", error: err.message });
    }
};

// Update multiple users at once
const bulkUpdateUsers = async (req, res) => {
    const updates = req.body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Updates array is required" });
    }

    try {
        const bulkOps = await Promise.all(
            updates.map(async (item) => {
                if (item.data.password) {
                    item.data.password = await bcrypt.hash(item.data.password, 10);
                }
                return {
                    updateOne: {
                        filter: { _id: item.id },
                        update: item.data
                    }
                };
            })
        );

        const result = await User.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Users updated successfully",
            result
        });

    } catch (err) {
        return res.status(500).json({ message: "Error updating users", error: err.message });
    }
};

// Delete multiple users at once
const bulkDeleteUsers = async (req, res) => {
    const userIds = req.body.userIds;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs array is required" });
    }

    try {
        const result = await User.deleteMany({
            _id: { $in: userIds }
        });

        res.status(200).json({
            message: "Users deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (err) {
        return res.status(500).json({ message: "Error deleting users", error: err.message });
    }
};

// 👇 was: export { ... }
module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    bulkUpdateUsers,
    bulkDeleteUsers
};