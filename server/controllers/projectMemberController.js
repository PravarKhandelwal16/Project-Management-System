const projectMemberModel = require('../models/projectMemberModel');
const userModel = require('../models/userModel');
const { pool } = require('../config/db');
const { createAuditLog } = require('../models/auditModel');

/**
 * Controller for Project Membership Management
 */

/**
 * List members of a project
 * GET /api/projects/:id/members
 */
const getMembers = async (req, res, next) => {
  try {
    const projectId = req.project.id;
    const members = await projectMemberModel.getMembersByProjectId(projectId);

    return res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a member to a project
 * POST /api/projects/:id/members
 */
const addMember = async (req, res, next) => {
  try {
    const projectId = req.project.id;
    const { user_id } = req.body;

    if (!Number.isSafeInteger(Number(user_id)) || Number(user_id) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID is required',
      });
    }

    const targetUserId = Number(user_id);

    // 1. Verify target user exists and is active
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User does not exist',
      });
    }

    if (!targetUser.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add deactivated user to project',
      });
    }

    // 2. Prevent adding project owner as member (owner already has ownership)
    if (req.project.user_id === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User is the project owner and cannot be added as a duplicate member',
      });
    }

    // 3. Check for existing membership
    const alreadyMember = await projectMemberModel.isMember(projectId, targetUserId);
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project',
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [activeUsers] = await connection.execute('SELECT id, is_active FROM users WHERE id = ? FOR UPDATE', [targetUserId]);
      if (!activeUsers[0]?.is_active) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'This account is no longer active.' });
      }
      await connection.execute('INSERT INTO project_members (project_id, user_id, added_by) VALUES (?, ?, ?)', [projectId, targetUserId, req.user.id]);
      await createAuditLog({ userId: req.user.id, action: 'PROJECT_MEMBER_ADDED', resourceType: 'PROJECT', resourceId: projectId,
        details: { addedUserId: targetUserId, addedUserEmail: targetUser.email, projectName: req.project.name, before: { member: null }, after: { member: targetUserId } } }, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'This user has already been added to the project.' });
      throw error;
    } finally { connection.release(); }

    const members = await projectMemberModel.getMembersByProjectId(projectId);

    return res.status(201).json({
      success: true,
      message: 'Member added to project successfully',
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a member from a project
 * DELETE /api/projects/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
  try {
    const projectId = req.project.id;
    const targetUserId = Number(req.params.userId);

    if (!Number.isSafeInteger(targetUserId) || targetUserId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    // Prevent removing project owner
    if (req.project.user_id === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project owner from the project',
      });
    }

    // Check if membership exists
    const membershipExists = await projectMemberModel.isMember(projectId, targetUserId);
    if (!membershipExists) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this project',
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('SELECT id FROM project_members WHERE project_id = ? AND user_id = ? FOR UPDATE', [projectId, targetUserId]);
      const [openTasks] = await connection.execute("SELECT id FROM tasks WHERE project_id = ? AND user_id = ? AND status != 'Completed' FOR UPDATE", [projectId, targetUserId]);
      if (openTasks.length) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Reassign or complete this member\'s open tasks before removing them.' });
      }
      await connection.execute('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserId]);
      await createAuditLog({ userId: req.user.id, action: 'PROJECT_MEMBER_REMOVED', resourceType: 'PROJECT', resourceId: projectId,
        details: { removedUserId: targetUserId, projectName: req.project.name, before: { member: targetUserId }, after: { member: null } } }, connection);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }

    const members = await projectMemberModel.getMembersByProjectId(projectId);

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully',
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMembers,
  addMember,
  removeMember,
};
