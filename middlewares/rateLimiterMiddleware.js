const {redisClient}=require("../config/redis");
const {ApiResponse}=require("../utils/ApiResponse");
const fs = require("fs");
const path = require("path");

const rateLimiterScript = fs.readFileSync(
    path.join(__dirname, "../utils/rateLimiter.lua"),
    "utf8"
);

const customRateLimiter=(WINDOW_SIZE,MAX_REQ,NAME)=>async(req,res,next)=>{

    console.log("Rate limiter middleware entered")
    const clientIp= req.ip;
    const redisKey= `rate-limit:${clientIp}:${NAME}`;
    const clientKey=`client-limit:${req.clientId}:${NAME}`;

    const abuseKey=`abuse-limit:${clientIp}:${NAME}`;
    const violationKey=`violation:${clientIp}:${NAME}`;

    const blockKey=`rate:limit:block:${clientIp}:${NAME}`;

    const MAX_CLIENT_REQ=MAX_REQ*5;

    try{

        const result = await redisClient.eval(
            rateLimiterScript,
            {
                keys: [redisKey,clientKey,violationKey,abuseKey,blockKey],
                arguments: [
                    String(WINDOW_SIZE),
                    String(MAX_REQ),
                    String(MAX_CLIENT_REQ)
                ]
            }
        );

        const status=result[0];
        // client ip is blocked -> return 403
        if(status==="BLOCKED"){
            const ttl=Number(result[1]);
            const minsLeft=Math.ceil(ttl/60);

            return res.status(403).json(
                new ApiResponse(403,{
                    error:"Forbidden",
                    message:`You are temporary blocked for malicious activity..Please try again after ${minsLeft} minutes.`
                })
            )
        }

        //If user is abusing the endpoint -> give captcha
        if(status==="CAPTCHA"){
            req.rateLimit={
                isAbused:true,
                redisKeyToReset:redisKey,
                violationKeyToReset:violationKey
            }
            console.log("Rate limiter middleware exiting")
            return next();
        }

        //rate_limited? -> return 429
        if(status==="RATE_LIMITED" || status==="CLIENT_LIMITED"){
            const ttl=Number(result[1]);

            return res.status(429).json(
                new ApiResponse(429,{
                    error:"Too many Requests",
                    message:`Try again in ${ttl} seconds`
                })
            )
        }

        if(status==="OK"){
            console.log("Rate limiter middleware exiting")
            return next();
        }

        console.error("Unexpected result:",result);
        console.log("Rate limiter middleware exiting")
        return next();
    }catch(err){
        console.error("Redis error:",err);
        console.log("Rate limiter middleware exiting")
        return next();
    }
}

module.exports={customRateLimiter};