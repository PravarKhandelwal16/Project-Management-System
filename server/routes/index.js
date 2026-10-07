const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');

// API Routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

module.exports = router;
