const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/push-devices', require('express-rate-limit').rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false}), notificationController.registerPushDevice);
router.delete('/push-devices', notificationController.removePushDevice);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

module.exports = router;
