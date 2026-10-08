const projectMemberModel = require('../models/projectMemberModel');
const userModel = require('../models/userModel');
const { logAuditEvent } = require('../services/auditService');

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

    if (!user_id || isNaN(Number(user_id))) {
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

    // 4. Add member
    await projectMemberModel.addMember({
      projectId,
      userId: targetUserId,
      addedBy: req.user.id,
    });

    // 5. Audit log
    await logAuditEvent({
      userId: req.user.id,
      action: 'PROJECT_MEMBER_ADDED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      details: {
        addedUserId: targetUserId,
        addedUserEmail: targetUser.email,
        projectName: req.project.name,
      },
    });

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

    if (!targetUserId || isNaN(targetUserId)) {
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

    // Remove member
    await projectMemberModel.removeMember(projectId, targetUserId);

    // Audit log
    await logAuditEvent({
      userId: req.user.id,
      action: 'PROJECT_MEMBER_REMOVED',
      resourceType: 'PROJECT',
      resourceId: projectId,
      details: {
        removedUserId: targetUserId,
        projectName: req.project.name,
      },
    });

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
