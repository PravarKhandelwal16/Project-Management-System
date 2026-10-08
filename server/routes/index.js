const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const adminRoutes = require('./adminRoutes');

// API Routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
