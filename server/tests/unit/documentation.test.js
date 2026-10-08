const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('OpenAPI and Postman document every registered REST operation',()=>{
  const index=read('server/routes/index.js'),bindings=new Map([...index.matchAll(/const (\w+) = require\('\.\/(\w+)'\)/g)].map(m=>[m[1],m[2]])),actual=[];
  for(const mount of index.matchAll(/router\.use\('([^']+)',\s*(?:((?!require\b)\w+)|require\('\.\/(\w+)'\))/g)){
    const file=mount[3]||bindings.get(mount[2]);
    for(const route of read('server/routes/'+file+'.js').matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)){
      const url=(mount[1]==='/'?'':mount[1])+(route[2]==='/'?'':route[2]);actual.push(route[1].toUpperCase()+' '+url.replace(/:(\w+)/g,'{$1}'));
    }
  }
  const entries=JSON.parse(read('docs/api/endpoints.json')),spec=JSON.parse(read('docs/api/openapi.json')),collection=JSON.parse(read('docs/api/Project-Management-System.postman_collection.json'));
  const expected=entries.map(([method,url])=>method+' '+url);
  assert.deepEqual(actual.sort(),expected.sort());
  assert.deepEqual(Object.entries(spec.paths).flatMap(([url,methods])=>Object.keys(methods).map(method=>method.toUpperCase()+' '+url)).sort(),expected);
  assert.equal(collection.item.flatMap(group=>group.item).length,expected.length);
  assert.deepEqual(spec.paths['/auth/register'].post.requestBody.content['application/json'].schema.required,['full_name','email','password']);
  assert.ok(spec.paths['/tasks/{id}'].put.requestBody.content['application/json'].schema.properties.assigned_to);
  assert.equal(collection.variable.find(v=>v.key==='token').value,'');
});
