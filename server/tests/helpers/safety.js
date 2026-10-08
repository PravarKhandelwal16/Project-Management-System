function assertTestDatabase(env,name){
  if(env.NODE_ENV!=='test')throw new Error('Destructive test setup requires NODE_ENV=test');
  if(!/^[a-z][a-z0-9_]*_test(?:_\d+_\d+)?$/.test(name))throw new Error('Database name must end in _test or a generated _test suffix');
  if(env.DB_NAME&&name===env.DB_NAME)throw new Error('Test database must differ from application DB_NAME');
}
module.exports={assertTestDatabase};
