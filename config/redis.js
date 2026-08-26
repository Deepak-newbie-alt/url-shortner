require("dotenv").config();
const redis=require("redis");

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {

            return Math.min(retries * 200, 2000);
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



module.exports={
    redisClient,
    redisConnect
}