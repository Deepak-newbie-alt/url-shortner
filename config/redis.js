const redis=require("redis");

const redisClient=redis.createClient({
    host:process.env.REDIS_URL
})

redisClient.on("error",(err)=>{
    console.log("Redis error:",err);
})

async function redisConnect(){
    try{
        await redisClient.connect();
        console.log("Redis connected");
    }catch(err){
        console.error("Redis connection failed:",err);
    }
}

module.exports={
    redisClient,
    redisConnect
}