const {randomUUID}=require("crypto");
const {requestContext}=require("../observability/requestContext");

const requestIdMiddleware=(req,res,next)=>{
    const requestId=randomUUID();

    req.requestId=requestId;
    requestContext.run({requestId},()=>{
        next();
    })
}

module.exports={requestIdMiddleware};