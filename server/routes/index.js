const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');

// API Routes
router.use('/', healthRoutes);

module.exports = router;
