require('./config/env');
const express=require('express'),cors=require('cors'),helmet=require('helmet');
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',process.env.TRUST_PROXY?process.env.TRUST_PROXY.split(',').map(value=>value.trim()):false);
app.use(helmet());
const origins=process.env.FRONTEND_URL?[process.env.FRONTEND_URL]:process.env.NODE_ENV==='production'?[]:['http://localhost:5173','http://127.0.0.1:5173'];
app.use(cors({origin:(origin,done)=>!origin||origins.includes(origin)?done(null,true):done(Object.assign(new Error('Origin is not allowed'),{statusCode:403})),methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
app.use(express.json({limit:'64kb'}));
app.use((req,res,next)=>{
  if(['POST','PUT','PATCH'].includes(req.method)){
    if(req.body===undefined)req.body={};
    if(req.body===null||typeof req.body!=='object'||Array.isArray(req.body))return res.status(400).json({success:false,message:'Request body must be an object.'});
  }
  if(Object.values(req.query).some(value=>typeof value!=='string'))return res.status(400).json({success:false,message:'Query parameters must be single string values.'});
  if(['search','q'].some(key=>req.query[key]?.length>255))return res.status(400).json({success:false,message:'Search must be at most 255 characters.'});
  res.setHeader('Cache-Control','no-store');
  next();
});
app.use(require('./middleware/auditContext').middleware);
app.get('/',(req,res)=>res.json({message:'Project Management System API',healthCheck:'/api/health'}));
app.use('/api',require('./routes'));
app.use((req,res)=>res.status(404).json({success:false,message:'Resource not found'}));
app.use(require('./middleware/errorHandler'));
module.exports=app;
