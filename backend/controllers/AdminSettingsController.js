const AdminSettings = require("../models/AdminSettings");

// Create or initialize admin settings (only one document recommended)
const createAdminSettings = async (req, res) => {
    try {
        const existing = await AdminSettings.findOne();
        if (existing) {
            return res.status(400).json({ message: "Admin settings already exist" });
        }

        const settings = await AdminSettings.create(req.body);
        res.status(201).json({ message: "Admin settings created", settings });
    } catch (err) {
        return res.status(500).json({ message: "Error creating admin settings", error: err.message });
    }
};

// Get admin settings
const getAdminSettings = async (req, res) => {
    try {
        const settings = await AdminSettings.findOne();
        if (!settings) {
            return res.status(404).json({ message: "Admin settings not found" });
        }
        res.status(200).json({ settings });
    } catch (err) {
        return res.status(500).json({ message: "Error fetching admin settings", error: err.message });
    }
};

// Update admin settings by id
const updateAdminSettings = async (req, res) => {
    try {
        const updatedSettings = await AdminSettings.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedSettings) {
            return res.status(404).json({ message: "Admin settings not found" });
        }

        res.status(200).json({ message: "Admin settings updated", settings: updatedSettings });
    } catch (err) {
        return res.status(500).json({ message: "Error updating admin settings", error: err.message });
    }
};

// Delete admin settings by id
const deleteAdminSettings = async (req, res) => {
    try {
        const deleted = await AdminSettings.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Admin settings not found" });
        }
        res.status(200).json({ message: "Admin settings deleted" });
    } catch (err) {
        return res.status(500).json({ message: "Error deleting admin settings", error: err.message });
    }
};

module.exports = {
    createAdminSettings,
    getAdminSettings,
    updateAdminSettings,
    deleteAdminSettings
};
