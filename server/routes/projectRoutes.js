const {bodyFields,listQuery}=require('../middleware/inputValidation');
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { requirePermission, requireProjectAccess } = require('../middleware/rbacMiddleware');
const projectController = require('../controllers/projectController');
const projectMemberController = require('../controllers/projectMemberController');

// All project routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/projects
 * @desc    List projects accessible to current user (scoped by role/membership)
 * @access  Private
 */
router.get('/', requirePermission('projects.view'), listQuery('projects'), projectController.getProjects);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private (Super Admin, Admin, Project Manager)
 */
router.post('/', requirePermission('projects.view'), requirePermission('projects.create'), bodyFields('name','description','status','start_date','end_date'), projectController.createProject);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project details with members
 * @access  Private (Owner, Assigned Member, or Admin)
 */
router.get('/:id', requireProjectAccess('view'), projectController.getProjectById);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project details
 * @access  Private (Project Manager owner or Admin)
 */
router.put('/:id', requireProjectAccess('manage'), bodyFields('name','description','status','start_date','end_date'), projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Project Manager owner or Admin)
 */
router.delete('/:id', requireProjectAccess('delete'), projectController.deleteProject);

/**
 * Project Members Sub-Routes
 */

/**
 * @route   GET /api/projects/:id/members
 * @desc    List members of a project
 * @access  Private (Owner, Member, or Admin)
 */
router.get('/:id/members', requireProjectAccess('view'), projectMemberController.getMembers);

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add member to a project
 * @access  Private (Project Manager owner or Admin)
 */
router.post('/:id/members', requireProjectAccess('members'), bodyFields('user_id'), projectMemberController.addMember);

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Remove member from a project
 * @access  Private (Project Manager owner or Admin)
 */
router.delete('/:id/members/:userId', requireProjectAccess('members'), projectMemberController.removeMember);

/**
 * Project Tasks Sub-Routes
 */

/**
 * @route   GET /api/projects/:id/tasks
 * @desc    List tasks belonging to a project
 * @access  Private (Owner, Member, or Admin)
 */
const taskController = require('../controllers/taskController');
router.get('/:id/tasks', requireProjectAccess('view'), requirePermission('tasks.view'), listQuery('tasks'), taskController.getProjectTasks);

module.exports = router;
