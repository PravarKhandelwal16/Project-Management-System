const {test}=require('node:test'),assert=require('node:assert/strict');
const {request,createTask}=require('../helpers/fixtures');
test('dashboard totals include authorized work only for all eight roles',async()=>{
  await createTask(1,{status:'Completed'});await createTask(2,{status:'Completed'});await createTask(2,{due_date:'2020-01-01'});
  for(const role of ['member','viewer','team_lead','project_coordinator','project_manager']){
    const report=(await request(role,'/dashboard')).data.data;assert.equal(report.summary.totalProjects,1);assert.equal(report.summary.totalTasks,2);assert.equal(report.summary.completedTasks,1);assert.equal(report.summary.overdueTasks,1);
  }
  for(const role of ['admin','super_admin','portfolio_manager']){
    const report=(await request(role,'/dashboard')).data.data;assert.equal(report.summary.totalProjects,2);assert.equal(report.summary.totalTasks,4);assert.equal(report.summary.completedTasks,2);assert.equal(report.summary.overdueTasks,2);
  }
});
