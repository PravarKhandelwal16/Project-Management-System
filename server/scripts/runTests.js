const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const selected=process.argv[2]||'all';
const folders=selected==='all'?['unit','integration']:[selected];
if(folders.some(folder=>!['unit','integration'].includes(folder)))throw new Error('Select unit, integration or all');
const files=folders.flatMap(folder=>fs.readdirSync(path.resolve(__dirname,'../tests',folder)).filter(file=>file.endsWith('.test.js')).map(file=>'tests/'+folder+'/'+file));
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{cwd:path.resolve(__dirname,'..'),stdio:'inherit',env:{...process.env,NODE_ENV:'test',SCHEDULER_ENABLED:'false'}});
process.exit(result.status??1);
