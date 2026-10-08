const {bodyFields,listQuery,taskIds}=require('../middleware/inputValidation');
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requireTaskAccess, requireProjectAccess, requirePermission } = require('../middleware/rbacMiddleware');
const taskController = require('../controllers/taskController');

// All task routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/tasks
 * @desc    Get all accessible tasks (supports project_id, status, priority, assigned_to, search, sort, pagination)
 * @access  Private
 */
router.get('/', requirePermission('tasks.view'), listQuery('tasks'), taskController.getTasks);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task in a project
 * @access  Private (Project Manager owner, Super Admin, Admin)
 */
router.post('/', requirePermission('tasks.view'), requireProjectAccess('tasks'), bodyFields('project_id','name','description','status','priority','due_date','assigned_to'), taskIds, taskController.createTask);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task details by ID
 * @access  Private (Owner, Project Member, Assignee, Admin)
 */
router.get('/:id', requireTaskAccess('view'), taskController.getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Full update of task (name, description, priority, status, due_date, assigned_to)
 * @access  Private (Project Manager owner, Super Admin, Admin)
 */
router.put('/:id', requireTaskAccess('edit'), bodyFields('name','description','status','priority','due_date','assigned_to'), taskIds, taskController.updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status only
 * @access  Private (Project Manager owner, Admin, or Assigned Member)
 */
router.patch('/:id/status', requireTaskAccess('status'), bodyFields('status'), taskController.updateStatus);

/**
 * @route   PATCH /api/tasks/:id/priority
 * @desc    Update task priority only
 * @access  Private (Project Manager owner, Admin)
 */
router.patch('/:id/priority', requireTaskAccess('edit'), bodyFields('priority'), taskController.updatePriority);

/**
 * @route   PATCH /api/tasks/:id/assign
 * @desc    Assign or reassign task
 * @access  Private (Project Manager owner, Admin)
 */
router.patch('/:id/assign', requireTaskAccess('assign'), bodyFields('assigned_to'), taskIds, taskController.assignTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private (Project Manager owner, Admin)
 */
router.delete('/:id', requireTaskAccess('delete'), taskController.deleteTask);

module.exports = router;
