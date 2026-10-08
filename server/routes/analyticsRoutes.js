const router=require('express').Router();
const {requirePermission}=require('../middleware/rbacMiddleware');
router.use(require('../middleware/authMiddleware'),requirePermission('analytics.view'),requirePermission('projects.view'),requirePermission('tasks.view'));
router.get('/',require('../controllers/analyticsController').analytics);
module.exports=router;
