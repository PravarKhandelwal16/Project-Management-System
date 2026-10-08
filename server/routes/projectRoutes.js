const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles, requireProjectAccess } = require('../middleware/rbacMiddleware');
const { PROJECT_CREATOR_ROLES } = require('../utils/roles');
const projectController = require('../controllers/projectController');
const projectMemberController = require('../controllers/projectMemberController');

// All project routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/projects
 * @desc    List projects accessible to current user (scoped by role/membership)
 * @access  Private
 */
router.get('/', projectController.getProjects);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private (Super Admin, Admin, Project Manager)
 */
router.post('/', authorizeRoles(...PROJECT_CREATOR_ROLES), projectController.createProject);

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
router.put('/:id', requireProjectAccess('manage'), projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Project Manager owner or Admin)
 */
router.delete('/:id', requireProjectAccess('manage'), projectController.deleteProject);

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
router.post('/:id/members', requireProjectAccess('manage'), projectMemberController.addMember);

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Remove member from a project
 * @access  Private (Project Manager owner or Admin)
 */
router.delete('/:id/members/:userId', requireProjectAccess('manage'), projectMemberController.removeMember);

/**
 * Project Tasks Sub-Routes
 */

/**
 * @route   GET /api/projects/:id/tasks
 * @desc    List tasks belonging to a project
 * @access  Private (Owner, Member, or Admin)
 */
const taskController = require('../controllers/taskController');
router.get('/:id/tasks', requireProjectAccess('view'), taskController.getProjectTasks);

module.exports = router;
