const jwt=require('jsonwebtoken');
function signToken(id,options={}){
  if(!process.env.JWT_SECRET)throw new Error('JWT_SECRET is required');
  return jwt.sign({id},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:process.env.JWT_EXPIRES_IN||'24h',...options});
}
function verifyToken(token){
  if(!process.env.JWT_SECRET)throw new Error('JWT_SECRET is required');
  const payload=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});
  if(!Number.isSafeInteger(payload.id)||payload.id<1)throw new jwt.JsonWebTokenError('Invalid subject');
  if(!Number.isSafeInteger(payload.exp))throw new jwt.JsonWebTokenError('Token expiration is required');
  return payload;
}
module.exports={signToken,verifyToken};
