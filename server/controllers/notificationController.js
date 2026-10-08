const notificationService = require('../services/notificationService');
const { updatePreferencesSchema } = require('../../shared/validation/notificationSchemas');

const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const notifications = await notificationService.getUserNotifications(req.user.id, limit, offset);
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(req.user.id, req.params.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPreferences = async (req, res) => {
  try {
    const prefs = await notificationService.getPreferences(req.user.id);
    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updatePreferences = async (req, res) => {
  try {
    // Validate request
    const validatedData = updatePreferencesSchema.parse(req.body);
    
    await notificationService.updatePreferences(req.user.id, validatedData);
    
    res.json({ success: true, message: 'Preferences updated successfully' });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences
};
