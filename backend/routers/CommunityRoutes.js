const express = require("express");
const router = express.Router();
const controller = require("../controllers/CommunityController");
const { verifyToken } = require("../middleware/Authmiddleware");

// Get all community members
router.get("/members", verifyToken, controller.getCommunityMembers);

// Get available chats (facilities and events user is part of)
router.get("/chats", verifyToken, controller.getAvailableChats);

// Get messages for a community or direct chat
router.get("/messages/:communityId", verifyToken, controller.getMessages);

// Send a message
router.post("/messages", verifyToken, controller.sendMessage);

// Update a message
router.put("/messages/:id", verifyToken, controller.updateMessage);

// Delete a message
router.delete("/messages/:id", verifyToken, controller.deleteMessage);

module.exports = router;
