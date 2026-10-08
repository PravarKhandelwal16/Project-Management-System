const router = require('express').Router();
const authenticate = require('../middleware/authMiddleware');
const { requirePermission, requireProjectAccess } = require('../middleware/rbacMiddleware');
const controller = require('../controllers/teamController');
router.use(authenticate, requirePermission('team.view'));
router.get('/projects/:id', requireProjectAccess('view'), controller.roster);
router.get('/projects/:id/candidates', requireProjectAccess('members'), controller.candidates);
module.exports = router;
