const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check route confirming API is active
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
  });
});

module.exports = router;
