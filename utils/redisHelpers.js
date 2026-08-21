const {redisClient}=require("../config/redis");
const {CircuitBreaker}=require("./circuitBreaker");

const redisBreaker=new CircuitBreaker();

async function getCached(key){
    if(!redisClient.isReady){
        throw new Error("Redis is not ready");
    }
    return await redisClient.get(key);
}

async function setCached(key,value,expiryInSeconds){
    if(!redisClient.isReady){
        throw new Error('Redis is not ready');
    }
    await redisClient.set(key,value,{
        EX:expiryInSeconds
    })
}

async function getRedisCache(key){
    try{
        return await redisBreaker.execute(()=>getCached(key));
    }catch(err){
        console.error("Redis unavailable: ",err.message);
        return null;
    }
}

async function setRedisCache(key,value,expiry) {
    try{
        await redisBreaker.execute(()=>setCached(key,value,expiry));
    }catch(err){
        console.error("Redis Unavailable: ",err.message);
        return;
    }
}

module.exports={getRedisCache,setRedisCache};

