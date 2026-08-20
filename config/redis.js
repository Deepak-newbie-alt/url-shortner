const redis=require("redis");

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                return new Error("Max Redis retries reached");
            }

            return Math.min(retries * 200, 3000);
        }
    }
});

redisClient.on("error",(err)=>{
    console.log("Redis error:",err);
})

async function redisConnect(){
    try{
        await redisClient.connect();
        console.log("Redis connected");
        return true;
    }catch(err){
        console.error("Redis connection failed:",err);
        return false;
    }
}

async function getCached(key){
    if(!redisClient.isReady){
        return null;
    }
    try{
        return await redisClient.get(key);
    }catch(err){
        console.error("Redis failed to get key:",err);
        return null;
    }
}

async function setCached(key,value,expiryInSeconds){
    if(!redisClient.isReady){
        return;
    }
    try{
        await redisClient.set(key,value,{
            EX:expiryInSeconds
        })
    }catch(err){
        console.error("Redis failed to set key:",err);
    }
}

module.exports={
    redisClient,
    redisConnect,
    getCached,
    setCached
}