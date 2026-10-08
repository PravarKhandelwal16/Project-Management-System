const {test,after}=require('node:test'),assert=require('node:assert/strict'),bcrypt=require('bcrypt'),jwt=require('jsonwebtoken');
require('../../config/env');process.env.JWT_SECRET='unit-test-secret-only';process.env.JWT_EXPIRES_IN='1h';
const {signToken,verifyToken}=require('../../utils/tokens');
const {validateEnvironment}=require('../../config/env'),{assertTestDatabase}=require('../helpers/safety');
const access=require('../../services/accessService'),{redact}=require('../../models/auditModel'),{pool}=require('../../config/db');
after(()=>pool.end());
test('password hashing verifies the original without storing plaintext',async()=>{const hash=await bcrypt.hash('Strong123!',10);assert.notEqual(hash,'Strong123!');assert.equal(await bcrypt.compare('Strong123!',hash),true);assert.equal(await bcrypt.compare('Wrong123!',hash),false);});
test('JWT identity, expiry, wrong secrets, algorithms and subject checks',()=>{
  const token=signToken(42),payload=verifyToken(token);assert.equal(payload.id,42);assert.ok(payload.exp>payload.iat);assert.equal(payload.password_hash,undefined);assert.equal(payload.role,undefined);
  assert.throws(()=>verifyToken(signToken(42,{expiresIn:-1})),{name:'TokenExpiredError'});
  assert.throws(()=>verifyToken(jwt.sign({id:42},'wrong-secret')));
  assert.throws(()=>verifyToken(jwt.sign({id:42},process.env.JWT_SECRET,{algorithm:'HS384'})));
  assert.throws(()=>verifyToken(signToken('invalid')));
  assert.throws(()=>verifyToken(jwt.sign({id:42},process.env.JWT_SECRET)),/expiration/);
});
test('production fails for missing/weak secrets and untrusted settings',()=>{
  assert.throws(()=>validateEnvironment({NODE_ENV:'production'}),/JWT_SECRET/);
  const env={NODE_ENV:'production',DB_HOST:'db',DB_USER:'pms_app',DB_PASSWORD:'local-placeholder',DB_NAME:'pms',JWT_SECRET:'a'.repeat(40),FRONTEND_URL:'https://pms.example.test'};
  assert.equal(validateEnvironment(env).port,5000);
  for(const overrides of [{JWT_SECRET:'change-me'},{FRONTEND_URL:'*'},{FRONTEND_URL:'http://pms.example.test'},{TRUST_PROXY:'true'},{JWT_EXPIRES_IN:'forever'},{APP_TIMEZONE:'Invalid/Zone'},{REMINDER_CRON:'bad'},{DB_USER:'root'}])assert.throws(()=>validateEnvironment({...env,...overrides}));
});
test('destructive test guards refuse real databases and wrong environments',()=>{
  assert.throws(()=>assertTestDatabase({NODE_ENV:'development'},'project_management_test'));
  assert.throws(()=>assertTestDatabase({NODE_ENV:'test'},'project_management'));
  assert.throws(()=>assertTestDatabase({NODE_ENV:'test',DB_NAME:'project_management_test'},'project_management_test'));
  assert.doesNotThrow(()=>assertTestDatabase({NODE_ENV:'test',DB_NAME:'project_management'},'project_management_test_1_123'));
});
test('permission helpers enforce scope and administrator boundaries',()=>{
  assert.equal(access.hasPermission({permissions:[]},'users.roles'),false);
  assert.equal(access.canManageAccount({id:1,role:'admin'},{id:2,role:'super_admin'}),false);
  assert.equal(access.canManageAccount({id:1,role:'project_manager'},{id:2,role:'member'}),false);
  assert.deepEqual(access.projectScope({id:9,permissions:[]}),{sql:'0=1',params:[]});
  assert.deepEqual(access.projectScope({id:9,permissions:['projects.view','projects.view_all']}),{sql:'1=1',params:[]});
  assert.deepEqual(access.projectScope({id:9,permissions:['projects.view']}).params,[9,9]);
  assert.match(access.validatePermissions({role:'admin',permissions:['roles.manage']},'member',['users.roles']),/reserved/);
  assert.deepEqual(redact({password_hash:'hash',authorization:'Bearer token',nested:{smtp_pass:'secret',token:'secret',role:'member'}}),{password_hash:'[REDACTED]',authorization:'[REDACTED]',nested:{smtp_pass:'[REDACTED]',token:'[REDACTED]',role:'member'}});
});
