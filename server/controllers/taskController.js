const taskModel = require('../models/taskModel');
const projectModel = require('../models/projectModel');
const projectMemberModel = require('../models/projectMemberModel');
const userModel = require('../models/userModel');
const { logAuditEvent } = require('../services/auditService');
const { hasPermission } = require('../services/accessService');
const {
  validateTaskInput,
  VALID_TASK_STATUSES,
  VALID_TASK_PRIORITIES,
} = require('../utils/validation');
const notificationService = require('../services/notificationService');

/**
 * Controller for Task CRUD & Assignment Operations
 */

/**
 * Helper: Verify if an assignee is eligible for the project
 * Assignee must exist, be active, and either be project owner or in project_members
 */
const verifyEligibleAssignee = async (projectId, projectOwnerId, userId) => {
  if (userId !== null && userId !== undefined && (!Number.isSafeInteger(userId) || userId < 1)) return { eligible: false, message: 'Assignee must be a valid user ID.' };
  if (!userId) return { eligible: true }; // Unassigned is valid

  const user = await userModel.findById(userId);
  if (!user || !user.is_active) {
    return { eligible: false, message: 'Assignee user does not exist or is inactive' };
  }

  // Owner is eligible
  if (user.id === projectOwnerId) {
    return { eligible: true, user };
  }

  // Member must be in project_members
  const isMember = await projectMemberModel.isMember(projectId, user.id);
  if (!isMember) {
    return {
      eligible: false,
      message: 'Selected user is not a member of this project and cannot be assigned tasks',
    };
  }

  return { eligible: true, user };
};

/**
 * List tasks accessible to current user
 * GET /api/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      project_id,
      assigned_to,
      status,
      priority,
      search,
      sortBy,
      order,
    } = req.query;

    const tasks = await taskModel.getAccessibleTasks(req.user, {
      project_id,
      assigned_to,
      status,
      priority,
      search,
      sortBy,
      order,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List tasks for a specific project
 * GET /api/projects/:projectId/tasks
 */
const getProjectTasks = async (req, res, next) => {
  try {
    const projectId = req.project.id;
    const { status, priority, search, sortBy, order } = req.query;

    const tasks = await taskModel.getAccessibleTasks(req.user, {
      project_id: projectId,
      status,
      priority,
      search,
      sortBy,
      order,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task details by ID
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    // req.task is attached by requireTaskAccess('view')
    return res.status(200).json({
      success: true,
      data: req.task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new task
 * POST /api/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const {
      project_id,
      name,
      description,
      priority = 'Medium',
      status = 'Pending',
      due_date,
      assigned_to,
    } = req.body;

    if (!project_id || isNaN(Number(project_id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required',
      });
    }

    // 1. Fetch project to verify existence and check user permissions
    const project = await projectModel.getProjectById(project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const user = req.user;
    if (assigned_to && !hasPermission(user, 'tasks.assign')) return res.status(403).json({ success: false, message: 'Task assignment permission is required.' });
    // 2. Validate input fields
    const validation = validateTaskInput({
      name,
      priority,
      status,
      due_date,
    }, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // 3. Validate assignee if provided
    if (assigned_to) {
      const eligibility = await verifyEligibleAssignee(project.id, project.user_id, Number(assigned_to));
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.message,
        });
      }
    }

    // 4. Create task
    const taskId = await taskModel.createTask({
      project_id: project.id,
      assigned_to: assigned_to ? Number(assigned_to) : null,
      created_by: user.id,
      name: name.trim(),
      description,
      priority: priority || 'Medium',
      status: status || 'Pending',
      due_date: due_date || null,
    });

    // 5. Audit log
    await logAuditEvent({
      userId: user.id,
      action: 'TASK_CREATED',
      resourceType: 'TASK',
      resourceId: taskId,
      details: {
        name: name.trim(),
        projectId: project.id,
        projectName: project.name,
        assignedTo: assigned_to || null,
        priority: priority || 'Medium',
        status: status || 'Pending',
      },
    });

    const newTask = await taskModel.getTaskById(taskId);
    if (assigned_to) {
      await logAuditEvent({
        userId: user.id,
        action: 'TASK_ASSIGNED',
        resourceType: 'TASK',
        resourceId: taskId,
        details: {
          assignedTo: Number(assigned_to),
          projectId: project.id,
        },
      });
      const eligibility = await verifyEligibleAssignee(project.id, project.user_id, Number(assigned_to));
      if (eligibility.user) {
        await notificationService.notifyTaskAssigned(newTask, project, eligibility.user, false);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit task details (Full edit: name, description, priority, status, due_date, assigned_to)
 * PUT /api/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    // req.task is verified by requireTaskAccess('edit')
    const currentTask = req.task;
    const {
      name,
      description,
      priority,
      status,
      due_date,
      assigned_to,
    } = req.body;

    // Validate inputs
    const validation = validateTaskInput({
      name: name !== undefined ? name : currentTask.name,
      priority: priority !== undefined ? priority : currentTask.priority,
      status: status !== undefined ? status : currentTask.status,
      due_date: due_date !== undefined ? due_date : currentTask.due_date,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    if (assigned_to !== undefined && Number(assigned_to || 0) !== Number(currentTask.assigned_to || 0) && !hasPermission(req.user, 'tasks.assign')) return res.status(403).json({ success: false, message: 'Task assignment permission is required.' });
    if (status !== undefined && status !== currentTask.status && !hasPermission(req.user, 'tasks.status') && !(currentTask.assigned_to === req.user.id && hasPermission(req.user, 'tasks.status_assigned'))) return res.status(403).json({ success: false, message: 'Task status permission is required.' });
    // Validate assignee if changed
    const targetAssignee = assigned_to !== undefined ? (assigned_to ? Number(assigned_to) : null) : currentTask.assigned_to;
    if (targetAssignee && targetAssignee !== currentTask.assigned_to) {
      const eligibility = await verifyEligibleAssignee(
        currentTask.project_id,
        currentTask.project_owner_id,
        targetAssignee
      );
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.message,
        });
      }
    }

    await taskModel.updateTask(currentTask.id, {
      name: name !== undefined ? name : currentTask.name,
      description: description !== undefined ? description : currentTask.description,
      priority: priority !== undefined ? priority : currentTask.priority,
      status: status !== undefined ? status : currentTask.status,
      due_date: due_date !== undefined ? due_date : currentTask.due_date,
      assigned_to: targetAssignee,
    });

    // Audit logs
    await logAuditEvent({
      userId: req.user.id,
      action: 'TASK_UPDATED',
      resourceType: 'TASK',
      resourceId: currentTask.id,
      details: {
        projectId: currentTask.project_id,
        before: Object.fromEntries(['name','description','priority','status','due_date','assigned_to'].map(key => [key,currentTask[key]])),
        after: { name: name ?? currentTask.name, description: description !== undefined ? description : currentTask.description, priority: priority ?? currentTask.priority, status: status ?? currentTask.status, due_date: due_date !== undefined ? due_date : currentTask.due_date, assigned_to: targetAssignee },
      },
    });

    if (assigned_to !== undefined && targetAssignee !== currentTask.assigned_to) {
      await logAuditEvent({
        userId: req.user.id,
        action: currentTask.assigned_to ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED',
        resourceType: 'TASK',
        resourceId: currentTask.id,
        details: {
          previousAssignee: currentTask.assigned_to,
          newAssignee: targetAssignee,
          projectId: currentTask.project_id,
        },
      });

      if (targetAssignee) {
        const eligibility = await verifyEligibleAssignee(currentTask.project_id, currentTask.project_owner_id, targetAssignee);
        const project = await projectModel.getProjectById(currentTask.project_id);
        if (eligibility.user && project) {
          await notificationService.notifyTaskAssigned(currentTask, project, eligibility.user, !!currentTask.assigned_to);
        }
      }
    }

    if (status && status !== currentTask.status) {
      await logAuditEvent({
        userId: req.user.id,
        action: status === 'Completed' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
        resourceType: 'TASK',
        resourceId: currentTask.id,
        details: {
          previousStatus: currentTask.status,
          newStatus: status,
        },
      });
    }

    if (priority && priority !== currentTask.priority) {
      await logAuditEvent({
        userId: req.user.id,
        action: 'TASK_PRIORITY_CHANGED',
        resourceType: 'TASK',
        resourceId: currentTask.id,
        details: {
          previousPriority: currentTask.priority,
          newPriority: priority,
        },
      });
    }

    const updatedTask = await taskModel.getTaskById(currentTask.id);

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task status
 * PATCH /api/tasks/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    // req.task is verified by requireTaskAccess('status')
    const currentTask = req.task;
    const { status } = req.body;

    if (!status || !VALID_TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task status. Must be one of: ${VALID_TASK_STATUSES.join(', ')}`,
      });
    }

    await taskModel.updateTaskStatus(currentTask.id, status);

    await logAuditEvent({
      userId: req.user.id,
      action: status === 'Completed' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      resourceType: 'TASK',
      resourceId: currentTask.id,
      details: {
        previousStatus: currentTask.status,
        newStatus: status,
        projectId: currentTask.project_id,
      },
    });

    const updated = await taskModel.getTaskById(currentTask.id);

    return res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task priority
 * PATCH /api/tasks/:id/priority
 */
const updatePriority = async (req, res, next) => {
  try {
    // Checked by requireTaskAccess('edit')
    const currentTask = req.task;
    const { priority } = req.body;

    if (!priority || !VALID_TASK_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task priority. Must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`,
      });
    }

    await taskModel.updateTaskPriority(currentTask.id, priority);

    await logAuditEvent({
      userId: req.user.id,
      action: 'TASK_PRIORITY_CHANGED',
      resourceType: 'TASK',
      resourceId: currentTask.id,
      details: {
        previousPriority: currentTask.priority,
        newPriority: priority,
        projectId: currentTask.project_id,
      },
    });

    const updated = await taskModel.getTaskById(currentTask.id);

    return res.status(200).json({
      success: true,
      message: `Task priority updated to ${priority}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign task to a user
 * PATCH /api/tasks/:id/assign
 */
const assignTask = async (req, res, next) => {
  try {
    // Checked by requireTaskAccess('edit')
    const currentTask = req.task;
    const { assigned_to } = req.body;

    const targetUserId = assigned_to ? Number(assigned_to) : null;

    if (assigned_to !== null && assigned_to !== undefined && assigned_to !== '') {
      const eligibility = await verifyEligibleAssignee(
        currentTask.project_id,
        currentTask.project_owner_id,
        targetUserId
      );
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.message,
        });
      }
    }

    await taskModel.updateTaskAssignee(currentTask.id, targetUserId);

    await logAuditEvent({
      userId: req.user.id,
      action: currentTask.assigned_to ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED',
      resourceType: 'TASK',
      resourceId: currentTask.id,
      details: {
        previousAssignee: currentTask.assigned_to,
        newAssignee: targetUserId,
        projectId: currentTask.project_id,
      },
    });

    if (assigned_to !== null && assigned_to !== undefined && assigned_to !== '') {
      const eligibility = await verifyEligibleAssignee(currentTask.project_id, currentTask.project_owner_id, targetUserId);
      const project = await projectModel.getProjectById(currentTask.project_id);
      if (eligibility.user && project) {
        await notificationService.notifyTaskAssigned(currentTask, project, eligibility.user, !!currentTask.assigned_to);
      }
    }

    const updated = await taskModel.getTaskById(currentTask.id);

    return res.status(200).json({
      success: true,
      message: targetUserId ? 'Task assigned successfully' : 'Task unassigned successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    // Checked by requireTaskAccess('delete')
    const currentTask = req.task;

    await taskModel.deleteTask(currentTask.id);

    await logAuditEvent({
      userId: req.user.id,
      action: 'TASK_DELETED',
      resourceType: 'TASK',
      resourceId: currentTask.id,
      details: {
        taskName: currentTask.name,
        projectId: currentTask.project_id,
        deletedBy: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  updateStatus,
  updatePriority,
  assignTask,
  deleteTask,
};
