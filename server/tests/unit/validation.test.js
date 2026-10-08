const {test}=require('node:test'),assert=require('node:assert/strict');
const v=require('../../utils/validation');
test('auth names, email, password strength and bcrypt byte limit',()=>{
  for(const email of ['',null,'invalid','a@b','x'.repeat(250)+'@example.test'])assert.equal(v.validateEmail(email).isValid,false);
  assert.equal(v.validateEmail(' name@example.test ').isValid,true);
  for(const password of ['short1','abcdefgh','12345678','A1'+'x'.repeat(71),'\u00e9'.repeat(36)+'A1'])assert.equal(v.validatePassword(password).isValid,false);
  assert.equal(v.validatePassword('Strong123!').isValid,true);
  assert.equal(v.validateFullName(' ').isValid,false);
  assert.equal(v.validateRegisterInput({email:'a@example.test',password:'Strong123!'}).isValid,false);
});
test('project/task enums, descriptions, real dates and sort allowlists',()=>{
  for(const date of ['2025-02-29','2026-02-30','10/08/2026','2026-01-01T10:00:00Z',42,{}])assert.equal(v.isValidDateString(date),false);
  assert.equal(v.isValidDateString('2028-02-29'),true);
  assert.equal(v.validateProjectInput({name:'Project',start_date:'2026-02-01',end_date:'2026-01-01'}).isValid,false);
  for(const status of ['BAD',null,0])assert.equal(v.validateProjectInput({name:'Project',status}).isValid,false);
  assert.equal(v.validateProjectInput({name:'Project',description:{sql:'bad'}}).isValid,false);
  assert.equal(v.validateTaskInput({priority:'Urgent'}).isValid,false);
  assert.equal(v.validateTaskInput({status:null}).isValid,false);
  assert.equal(v.validateTaskInput({},true).isValid,false);
  assert.equal(v.validateTaskInput({name:'Work',description:500,due_date:'2026-02-30'},true).isValid,false);
  assert.deepEqual(v.validateTaskSort('DROP TABLE users','ASC'),{sortBy:'created_at',sortOrder:'ASC'});
  assert.deepEqual(v.validateProjectSort('name',{}),{sortBy:'name',sortOrder:'DESC'});
  for(const role of ['super_admin','admin','portfolio_manager','project_manager','project_coordinator','team_lead','member','viewer'])assert.equal(v.validateRole(role).isValid,true);
  assert.equal(v.validateRole('owner').isValid,false);
});
test('shared schemas use the same field names and reject unexpected fields',async()=>{
  const {registerSchema,createProjectSchema,createTaskSchema,updateRoleSchema,updatePreferencesSchema}=await import('../../../shared/validation/index.js');
  assert.equal(registerSchema.safeParse({full_name:'Person',email:'bad',password:'Strong123!'}).success,false);
  assert.equal(registerSchema.safeParse({full_name:'Person',email:'a@example.test',password:'abcdefgh'}).success,false);
  assert.equal(updateRoleSchema.safeParse({role:'god'}).success,false);
  assert.equal(createTaskSchema.safeParse({project_id:1,title:'Wrong field'}).success,false);
  assert.equal(createTaskSchema.safeParse({project_id:true,name:'Work'}).success,false);
  assert.equal(createTaskSchema.safeParse({project_id:1,name:'Work',priority:'Urgent'}).success,false);
  assert.equal(createProjectSchema.safeParse({name:'Project',end_date:'2025-02-29'}).success,false);
  assert.equal(updatePreferencesSchema.safeParse({web_overdue:'false'}).success,false);
  assert.equal(updatePreferencesSchema.safeParse({user_id:2}).success,false);
});
