const {redisClient}=require("../config/redis");
const { logger } = require("../observability/logger");
const { recordRedisDuration } = require("../observability/metrics");
const {CircuitBreaker}=require("./circuitBreaker");

const redisBreaker=new CircuitBreaker();

async function getCached(key){
    if(!redisClient.isReady){
        logger.error("redis_not_ready",{
            err:"Redis is not ready"
        })
        throw new Error("Redis is not ready");
    }
    return await redisClient.get(key);
}

async function setCached(key,value,expiryInSeconds){
    if(!redisClient.isReady){
        logger.error("redis_not_ready",{
            err:"Redis is not ready"
        })
        throw new Error('Redis is not ready');
    }
    await redisClient.set(key,value,{
        EX:expiryInSeconds
    })
}

async function getRedisCache(key){
    const start=performance.now();
    try{
        return await redisBreaker.execute(()=>getCached(key));
    }catch(err){
        logger.error("redis_not_available",{
            err: err.message
        })
        return null;
    }finally{
        recordRedisDuration(performance.now()-start);
    }
}

async function setRedisCache(key,value,expiry) {
    const start=performance.now();
    try{
        await redisBreaker.execute(()=>setCached(key,value,expiry));
    }catch(err){
        logger.error("redis_not_available",{
            err: err.message
        })
        return;
    }finally{
        recordRedisDuration(performance.now()- start);
    }
}

module.exports={getRedisCache,setRedisCache};

