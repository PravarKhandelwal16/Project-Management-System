const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),path=require('node:path');
const handler=require('../../middleware/errorHandler');
const response=error=>{let status,data;const res={headersSent:false,status(value){status=value;return this;},json(value){data=value;}};handler(error,{method:'GET',path:'/api/test'},res,()=>{});return {status,data};};
test('errors never expose SQL, paths or stack traces and malformed JSON is 400',()=>{
  assert.deepEqual(response(new Error('SELECT password FROM users /private/path')),{status:500,data:{success:false,message:'Internal server error'}});
  assert.deepEqual(response(Object.assign(new Error('bad parser details'),{status:400,type:'entity.parse.failed'})),{status:400,data:{success:false,message:'Invalid JSON request body.'}});
});
test('startup refuses unreachable databases and does not start HTTP/jobs',()=>{
  const result=spawnSync(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8',timeout:15000,env:{...process.env,NODE_ENV:'development',DB_HOST:'127.0.0.1',DB_PORT:'1',JWT_SECRET:'startup-tests-only'}});
  assert.equal(result.status,1);assert.match(result.stderr,/startup_failed/);assert.equal(result.stdout.includes('server_started'),false);
});
