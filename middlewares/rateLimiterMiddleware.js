const {redisClient}=require("../config/redis");
const {ApiResponse}=require("../utils/ApiResponse");

const customRateLimiter=(WINDOW_SIZE,MAX_REQ,NAME)=>async(req,res,next)=>{
    const clientIp= req.ip;
    const redisKey= `rate-limit:${clientIp}:${NAME}`;
    const clientKey=`client-limit:${req.clientId}:${NAME}`;

    const abuseKey=`abuse-limit:${clientIp}:${NAME}`;
    const violationKey=`violation:${clientIp}:${NAME}`;

    const blockKey=`rate:limit:block:${clientIp}:${NAME}`;

    const MAX_CLIENT_REQ=MAX_REQ*5;

    try{
        //checks if client ip is blocked -> return 403
        //else continue
        const isBlocked=await redisClient.exists(blockKey);
        if(isBlocked){
            const ttl=await redisClient.ttl(blockKey);
            const minsLeft=Math.ceil(ttl/60);

            return res.status(403).json(
                new ApiResponse(403,{
                    error:"Forbidden",
                    message:`You are temporary blocked for malicious activity..Please try again after ${minsLeft} minutes.`
                })
            )
        }

        //Increment client req and current req
        //current req represent the request of current window(60 secs)

        const clientReq=await redisClient.incr(clientKey);
        const currentReq=await redisClient.incr(redisKey);

        if(clientReq===1){
            await redisClient.expire(clientKey,WINDOW_SIZE*6);
        }

        if(currentReq===1){
            await redisClient.expire(redisKey,WINDOW_SIZE);
        }

        if(currentReq>MAX_REQ){
            //ckecks if limit already violated for current window
            //if already violated return 429
            const alreadyViolated=await redisClient.get(violationKey);
            
            //if not already violated increase abuse count
            if(!alreadyViolated){
                const abuseCount=await redisClient.incr(abuseKey);

                if(abuseCount===1){
                    await redisClient.expire(abuseKey,WINDOW_SIZE*6);
                }

                //set violation so that we know that user has already violated for this window and we registered abuse
                await redisClient.set(violationKey,"1",{
                    EX:WINDOW_SIZE
                })

                console.log(
                    `IP ${clientIp} exceeded ${NAME} limit. Abuse count: ${abuseCount}`
                );

                //if abuse count exceeds 5 then set blockKey true and block the user
                if(abuseCount>=5){
                    await redisClient.set(blockKey,"true",{
                        EX:60*60
                    })

                    return res.status(403).json(
                        new ApiResponse(403,{
                            error:"Forbidden",
                            message:`You are temporary blocked for malicious activity..Please try again after 60 minutes.`
                        })
                    )
                }

                //If the abuse count is >= 3 then attach some data to req and send the req to captcha middleware
                //isAbused is true so user will have give captcha now
                if(abuseCount>=3){
                    req.isAbused=true;
                    req.redisKeyToReset=redisKey;
                    req.violationKeyToReset=violationKey;

                    return next();
                }
            }

            const ttl=await redisClient.ttl(redisKey);
            return res.status(429).json(
                new ApiResponse(429,{
                    error:"Too many Requests",
                    message:`Try again in ${ttl} seconds`
                })
            )
        }

        // clientReq represents the total requests made by the same clientId
        // within a longer window. This protects against attackers rotating IPs
        // while keeping the same client identity/cookie.
        if(clientReq>MAX_CLIENT_REQ){
            const ttl=await redisClient.ttl(clientKey);
            return res.status(429).json(
                new ApiResponse(429,{
                    error:"Too many Requests",
                    message:`Try again in ${ttl} seconds`
                })
            )
        }
        next();
    }catch(err){
        console.error("Redis error:",err);
        next();
    }
}

module.exports={customRateLimiter};