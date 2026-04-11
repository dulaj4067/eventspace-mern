const User = require("../models/User");
const Event = require("../models/Event");
const Facility = require("../models/Facilities");
const Message = require("../models/Message");

// Get all community members and unread counts for the user
const getCommunityMembers = async (req, res) => {
  const currentUserId = req.user.id;
  try {
    const users = await User.find().select("-password");
    const facilities = await Facility.find();
    const events = await Event.find();

    const unreadCounts = await Message.aggregate([
      { $match: { recipient: currentUserId, isRead: false, isDirect: true } },
      { $group: { _id: "$sender", count: { $sum: 1 } } }
    ]);

    // Only count received messages for community notifications
    const communityUnreadTotal = await Message.countDocuments({
      isDirect: false,
      isRead: false,
      sender: { $ne: currentUserId }
    });

    const members = users.map(user => {
      const userObj = user.toObject();
      let association = null;

      if (user.role === 'admin') {
      } else if (user.role === 'owner') {
        const userFacility = facilities.find(f => f.owner?.toString() === user._id.toString());
        association = userFacility ? userFacility.name : null;
      } else if (user.role === 'organizer') {
        const userEvent = events.find(e => e.organizer?.toString() === user._id.toString());
        association = userEvent ? userEvent.name : null;
      }

      const unreadData = unreadCounts.find(u => u._id.toString() === user._id.toString());
      
      // Online status heuristic: active in the last 15 minutes
      const isOnline = user.updatedAt && (new Date() - new Date(user.updatedAt) < 15 * 60 * 1000);

      return {
        ...userObj,
        association,
        unreadCount: unreadData ? unreadData.count : 0,
        isOnline: isOnline || user._id.toString() === currentUserId.toString()
      };
    });

    res.status(200).json({ 
      members, 
      totalUnreadDMs: unreadCounts.reduce((acc, curr) => acc + curr.count, 0),
      totalCommunityUnread: communityUnreadTotal 
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching community members", error: err.message });
  }
};

// Get facilities and events the user part of (for chats)
const getAvailableChats = async (req, res) => {
  const currentUserId = req.user.id;
  const userRole = req.user.role;

  try {
    const facilities = await Facility.find().populate('owner', 'name');
    const events = await Event.find().populate('organizer', 'name').populate('facility');

    const availableFacilityChats = facilities.filter(f => {
      if (userRole === 'admin') return true;
      if (f.owner?._id.toString() === currentUserId) return true;
      return true; // Facility general chat for everyone
    });

    const availableEventChats = events.filter(e => {
      if (userRole === 'admin') return true;
      if (e.organizer?._id.toString() === currentUserId) return true;
      if (e.facility?.owner?.toString() === currentUserId) return true;
      const isRegistered = e.attendance?.registrations.some(r => r.user.toString() === currentUserId);
      return isRegistered;
    });

    res.status(200).json({
      facilities: availableFacilityChats,
      events: availableEventChats
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching chats", error: err.message });
  }
};

// Get messages (with load balancing/pagination)
const getMessages = async (req, res) => {
  const { communityId } = req.params;
  const { isDirect, recipientId, limit = 100 } = req.query;
  const currentUserId = req.user.id;

  try {
    let query = { communityId };

    if (isDirect === 'true') {
      query = {
        isDirect: true,
        $or: [
          { sender: currentUserId, recipient: recipientId },
          { sender: recipientId, recipient: currentUserId }
        ]
      };
      await Message.updateMany(
        { sender: recipientId, recipient: currentUserId, isRead: false },
        { $set: { isRead: true } }
      );
    } else {
      // Mark community messages as read when viewed (limitation: marks as read for all users)
      await Message.updateMany(
        { communityId, sender: { $ne: currentUserId }, isRead: false },
        { $set: { isRead: true } }
      );
    }

    // Load balancing: Limit number of messages
    const messages = await Message.find(query)
      .populate('sender', 'name profileImage role')
      .populate('recipient', 'name profileImage role')
      .sort({ createdAt: -1 }) // Sort by newest first for slicing
      .limit(parseInt(limit))
      .then(res => res.reverse()); // Then reverse back to chronological

    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  const { content, communityId, isDirect, recipient, fileUrl, fileName, facilityId, eventId } = req.body;
  const senderId = req.user.id;

  try {
    const newMessage = await Message.create({
      sender: senderId,
      content: content || 'Sent a file',
      communityId: communityId || 'general',
      isDirect: isDirect || false,
      recipient: isDirect ? recipient : undefined,
      fileUrl,
      fileName,
      facilityId,
      eventId
    });

    // Update user's updatedAt to signal they are "online"
    await User.findByIdAndUpdate(senderId, { updatedAt: new Date() });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name profileImage role')
      .populate('recipient', 'name profileImage role');

    res.status(201).json({ message: populatedMessage });
  } catch (err) {
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
};

// Update message
const updateMessage = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId) return res.status(403).json({ message: "Unauthorized" });

    message.content = content;
    await message.save();

    res.status(200).json({ message });
  } catch (err) {
    res.status(500).json({ message: "Error updating message", error: err.message });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.findByIdAndDelete(id);
    res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting message", error: err.message });
  }
};

module.exports = {
  getCommunityMembers,
  getAvailableChats,
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage
};
