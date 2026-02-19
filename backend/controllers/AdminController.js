const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register a new admin
const registerAdmin = async (req, res) => {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            role: role || "admin",
            phone
        });

        res.status(201).json({
            message: "Admin registered successfully",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                phone: admin.phone
            }
        });

    } catch (err) {
        return res.status(500).json({ message: "Error registering admin", error: err.message });
    }
};

// Admin login
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    try {
        const existingAdmin = await Admin.findOne({ email }).select("+password");

        if (!existingAdmin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingAdmin.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: existingAdmin._id,
                email: existingAdmin.email,
                role: existingAdmin.role
            },
            process.env.JWT_SECRET || "your_jwt_secret_key_here",
            { expiresIn: "24h" }
        );

        res.status(200).json({
            message: "Login successful",
            admin: {
                id: existingAdmin._id,
                name: existingAdmin.name,
                email: existingAdmin.email,
                role: existingAdmin.role,
                phone: existingAdmin.phone
            },
            token
        });

    } catch (err) {
        return res.status(500).json({ message: "Error logging in admin", error: err.message });
    }
};

// Get all admins
const getAllAdmins = async (_, res) => {
    try {
        const admins = await Admin.find().select("-password");
        res.status(200).json({ admins });
    } catch (err) {
        return res.status(500).json({ message: "Error fetching admins", error: err.message });
    }
};

// Get admin by ID
const getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id).select("-password");
        if (!admin) return res.status(404).json({ message: "Admin not found" });
        res.status(200).json({ admin });
    } catch (err) {
        return res.status(500).json({ message: "Error fetching admin", error: err.message });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.password) {
            if (updateData.password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters long" });
            }
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

        res.status(200).json({ message: "Admin updated successfully", admin: updatedAdmin });
    } catch (err) {
        return res.status(500).json({ message: "Error updating admin", error: err.message });
    }
};

// Delete admin
const deleteAdmin = async (req, res) => {
    try {
        const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);
        if (!deletedAdmin) return res.status(404).json({ message: "Admin not found" });

        res.status(200).json({ message: "Admin deleted successfully" });
    } catch (err) {
        return res.status(500).json({ message: "Error deleting admin", error: err.message });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin
};
