const {test}=require('node:test'),assert=require('node:assert/strict');
const {pool}=require('../helpers/fixtures');
test('full migrations rerun without losing existing users or projects',async()=>{
  const before=(await pool.query('SELECT COUNT(*) AS count FROM users'))[0][0].count;
  await require('../../scripts/migrateDatabase').migrateDatabase();
  await require('../../scripts/migrateDatabase').migrateDatabase();
  assert.equal((await pool.query('SELECT COUNT(*) AS count FROM users'))[0][0].count,before);
  assert.equal((await pool.query('SELECT COUNT(*) AS count FROM projects'))[0][0].count,2);
});
test('demo seed refuses test/production data and bootstrap never elevates existing users',async()=>{
  await assert.rejects(require('../../scripts/seedDemo').seedDemo(),/Demo seed requires/);
  process.env.SUPER_ADMIN_EMAIL='bootstrap@isolated.test';process.env.SUPER_ADMIN_NAME='Bootstrap';process.env.SUPER_ADMIN_PASSWORD='Bootstrap123!';
  await assert.rejects(require('../../scripts/seedSuperAdmin').bootstrap(),/already exists/);
});
