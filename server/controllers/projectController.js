const { hasPermission } = require('../services/accessService');
const projectModel = require('../models/projectModel');
const projectMemberModel = require('../models/projectMemberModel');
const { logAuditEvent } = require('../services/auditService');
const { validateProjectInput } = require('../utils/validation');

/**
 * Controller for Project CRUD Operations
 */

/**
 * List projects accessible to current user
 * GET /api/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const { search, status, sortBy, sortOrder, page, limit } = req.query;
    const projects = await projectModel.getAccessibleProjects(req.user, {
      search,
      status,
      sortBy,
      sortOrder, page, limit,
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      ...(projects.pagination ? { pagination: projects.pagination } : {}),
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get project details and members
 * GET /api/projects/:id
 */
const getProjectById = async (req, res, next) => {
  try {
    // req.project is already verified and populated by requireProjectAccess('view')
    const projectId = req.project.id;
    const members = await projectMemberModel.getMembersByProjectId(projectId);
    const summary = hasPermission(req.user, 'tasks.view') ? await projectModel.getTaskSummary(projectId) : { total_tasks: null, completed_tasks: null, progress: null };

    return res.status(200).json({
      success: true,
      data: {
        ...req.project, ...summary,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new project
 * POST /api/projects
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;

    const validation = validateProjectInput({
      name,
      description,
      status,
      start_date,
      end_date,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const projectId = await projectModel.createProject({
      user_id: req.user.id,
      name,
      description,
      status: status || 'Not Started',
      start_date,
      end_date,
    });

    // Record audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      details: {
        name: name.trim(),
        status: status || 'Not Started',
        creatorRole: req.user.role,
      },
    });

    const newProject = await projectModel.getProjectById(projectId);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: newProject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing project
 * PUT /api/projects/:id
 */
const updateProject = async (req, res, next) => {
  try {
    // req.project is already verified by requireProjectAccess('manage')
    const projectId = req.project.id;
    const { name, description, status, start_date, end_date } = req.body;

    const validation = validateProjectInput({
      name: name !== undefined ? name : req.project.name,
      description,
      status: status !== undefined ? status : req.project.status,
      start_date: start_date !== undefined ? start_date : req.project.start_date,
      end_date: end_date !== undefined ? end_date : req.project.end_date,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    await projectModel.updateProject(projectId, {
      name: name !== undefined ? name : req.project.name,
      description: description !== undefined ? description : req.project.description,
      status: status !== undefined ? status : req.project.status,
      start_date: start_date !== undefined ? start_date : req.project.start_date,
      end_date: end_date !== undefined ? end_date : req.project.end_date,
    });

    // Record audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'PROJECT_UPDATED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      details: {
        before: Object.fromEntries(['name','description','status','start_date','end_date'].map(key => [key,req.project[key]])),
        after: { name: name ?? req.project.name, description: description !== undefined ? description : req.project.description, status: status ?? req.project.status, start_date: start_date !== undefined ? start_date : req.project.start_date, end_date: end_date !== undefined ? end_date : req.project.end_date },
      },
    });

    const updatedProject = await projectModel.getProjectById(projectId);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a project
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    // req.project is already verified by requireProjectAccess('manage')
    const projectId = req.project.id;

    await projectModel.deleteProject(projectId);

    // Record audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'PROJECT_DELETED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      details: {
        name: req.project.name,
        deletedBy: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
