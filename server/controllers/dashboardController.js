const { pool } = require('../config/db');
const { projectScope, hasPermission } = require('../services/accessService');
const { format, subDays, startOfWeek, addDays } = require('date-fns');

/**
 * Get Dashboard Data
 * GET /api/dashboard
 */
const getDashboardData = async (req, res, next) => {
  try {
    const user = req.user;
    
    const scope = projectScope(user);
    const projectWhere = `id IN (SELECT p.id FROM projects p WHERE ${scope.sql})`;
    const projectParams = scope.params;
    const taskWhere = hasPermission(user, 'tasks.view') ? `project_id IN (SELECT p.id FROM projects p WHERE ${scope.sql})` : '0=1';
    const taskParams = hasPermission(user, 'tasks.view') ? [...scope.params] : [];
    const isMember = !hasPermission(user, 'tasks.status');

    // 1. Project Summary & Status
    const [projectRows] = await pool.query(
      `SELECT status, COUNT(*) as count FROM projects WHERE ${projectWhere} GROUP BY status`,
      projectParams
    );
    
    let totalProjects = 0;
    let projectsInProgress = 0;
    let completedProjects = 0;
    let notStartedProjects = 0;
    
    const projectStatus = [
      { status: 'Not Started', count: 0 },
      { status: 'In Progress', count: 0 },
      { status: 'Completed', count: 0 }
    ];

    projectRows.forEach(row => {
      const c = Number(row.count);
      totalProjects += c;
      if (row.status === 'In Progress') { projectsInProgress += c; projectStatus[1].count = c; }
      else if (row.status === 'Completed') { completedProjects += c; projectStatus[2].count = c; }
      else if (row.status === 'Not Started') { notStartedProjects += c; projectStatus[0].count = c; }
    });

    // 2. Task Summary & Status
    const [taskRows] = await pool.query(
      `SELECT status, COUNT(*) as count FROM tasks WHERE ${taskWhere} GROUP BY status`,
      taskParams
    );
    
    let totalTasks = 0;
    let pendingTasks = 0;
    let inProgressTasks = 0;
    let completedTasks = 0;
    
    const taskStatus = [
      { status: 'Pending', count: 0 },
      { status: 'In Progress', count: 0 },
      { status: 'Completed', count: 0 }
    ];

    taskRows.forEach(row => {
      const c = Number(row.count);
      totalTasks += c;
      if (row.status === 'Pending') { pendingTasks += c; taskStatus[0].count = c; }
      else if (row.status === 'In Progress') { inProgressTasks += c; taskStatus[1].count = c; }
      else if (row.status === 'Completed') { completedTasks += c; taskStatus[2].count = c; }
    });

    // Overdue tasks
    let overdueWhere = taskWhere + ` AND status != 'Completed' AND due_date < CURDATE()`;
    let overdueParams = [...taskParams];
    if (isMember) {
      overdueWhere += ` AND user_id = ?`;
      overdueParams.push(user.id);
    }
    const [overdueRows] = await pool.query(`SELECT COUNT(*) as count FROM tasks WHERE ${overdueWhere}`, overdueParams);
    const overdueTasksCount = Number(overdueRows[0].count);

    // 3. Task Activity (last 7 days)
    const auditScope = projectScope(user);
    const auditWhere = hasPermission(user, 'tasks.view') ? `resource_type = 'TASK' AND resource_id IN (SELECT t.id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE ${auditScope.sql})` : '0=1';
    const auditParams = hasPermission(user, 'tasks.view') ? auditScope.params : [];

    const [activityRows] = await pool.query(`
      SELECT DATE(created_at) as date, action, COUNT(*) as count 
      FROM audit_logs 
      WHERE resource_type = 'TASK' 
        AND action IN ('TASK_CREATED', 'TASK_COMPLETED')
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND ${auditWhere}
      GROUP BY DATE(created_at), action
    `, auditParams);

    const taskActivityMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      taskActivityMap[d] = { date: d, created: 0, completed: 0 };
    }
    
    activityRows.forEach(row => {
      const dateStr = format(row.date, 'yyyy-MM-dd');
      if (taskActivityMap[dateStr]) {
        if (row.action === 'TASK_CREATED') taskActivityMap[dateStr].created += Number(row.count);
        if (row.action === 'TASK_COMPLETED') taskActivityMap[dateStr].completed += Number(row.count);
      }
    });
    
    const taskActivity = Object.values(taskActivityMap);

    // 4. Weekly Productivity
    const startOfWk = startOfWeek(new Date());
    const weeklyProductivityMap = {};
    const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysArr.forEach((day, idx) => {
      weeklyProductivityMap[format(addDays(startOfWk, idx), 'yyyy-MM-dd')] = { day, count: 0 };
    });

    const [weeklyRows] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM audit_logs 
      WHERE resource_type = 'TASK' 
        AND action = 'TASK_COMPLETED'
        AND created_at >= ?
        AND ${auditWhere}
      GROUP BY DATE(created_at)
    `, [format(startOfWk, 'yyyy-MM-dd'), ...auditParams]);

    weeklyRows.forEach(row => {
      const dateStr = format(row.date, 'yyyy-MM-dd');
      if (weeklyProductivityMap[dateStr]) {
        weeklyProductivityMap[dateStr].count += Number(row.count);
      }
    });

    const weeklyProductivity = Object.values(weeklyProductivityMap);

    // 5. Active Projects (Progress)
    const [activeProjectsRows] = await pool.query(`
      SELECT p.id, p.name, p.status, p.end_date,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_project_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Completed') as completed_project_tasks
      FROM projects p
      WHERE p.${projectWhere}
      ORDER BY p.updated_at DESC
      LIMIT 5
    `, projectParams);

    const activeProjects = activeProjectsRows.map(p => {
      const total = Number(p.total_project_tasks);
      const comp = Number(p.completed_project_tasks);
      const progress = total === 0 ? 0 : Math.round((comp / total) * 100);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        end_date: p.end_date,
        progress
      };
    });

    // 6. Upcoming Tasks
    let upcomingWhere = taskWhere + ` AND status != 'Completed' AND due_date >= CURDATE()`;
    let upcomingParams = [...taskParams];
    if (isMember) {
      upcomingWhere += ` AND user_id = ?`;
      upcomingParams.push(user.id);
    }
    const [upcomingTasksRows] = await pool.query(`
      SELECT t.id, t.name, t.priority, t.status, t.due_date, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE ${upcomingWhere.replace(/^project_id/, 't.project_id').replace(/ AND user_id/g, ' AND t.user_id').replace(/ AND status/g, ' AND t.status').replace(/ AND due_date/g, ' AND t.due_date')}
      ORDER BY t.due_date ASC
      LIMIT 5
    `, upcomingParams);

    // 7. Overdue Tasks Details
    const [overdueTasksDetails] = await pool.query(`
      SELECT t.id, t.name, t.priority, t.status, t.due_date, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE ${overdueWhere.replace(/^project_id/, 't.project_id').replace(/ AND user_id/g, ' AND t.user_id').replace(/ AND due_date/g, ' AND t.due_date').replace(/ AND status/g, ' AND t.status')}
      ORDER BY t.due_date ASC
      LIMIT 5
    `, overdueParams);

    // 8. Recent Activity
    const [recentActivityRows] = await pool.query(`
      SELECT a.id, a.action, a.created_at, u.full_name as user_name
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE ${auditWhere.replace('resource_type', 'a.resource_type').replace('resource_id', 'a.resource_id')}
      ORDER BY a.created_at DESC
      LIMIT 5
    `, auditParams);


    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProjects,
          projectsInProgress,
          completedProjects,
          notStartedProjects,
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks: overdueTasksCount
        },
        projectStatus,
        taskStatus,
        taskActivity,
        weeklyProductivity,
        activeProjects,
        upcomingTasks: upcomingTasksRows,
        overdueTasks: overdueTasksDetails,
        recentActivity: recentActivityRows
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData
};
