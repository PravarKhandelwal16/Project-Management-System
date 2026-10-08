// Structured operational logs never receive raw errors, SQL, request bodies or headers.
const write=(level,event,metadata={})=>{
  const safe=Object.fromEntries(Object.entries(metadata).filter(([key])=>!/(password|secret|token|authorization|cookie|sql)/i.test(key)));
  (level==='error'?console.error:console.log)(JSON.stringify({time:new Date().toISOString(),level,event,...safe}));
};
module.exports={info:(event,data)=>write('info',event,data),error:(event,data)=>write('error',event,data),errorCode:error=>error.code||error.name||'ERROR'};
