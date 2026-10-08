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

router.get('/ready', async (req,res) => {
  try { await require('../config/db').pool.query('SELECT 1'); res.json({success:true,message:'API and database are ready'}); }
  catch { res.status(503).json({success:false,message:'Service temporarily unavailable'}); }
});
module.exports = router;
