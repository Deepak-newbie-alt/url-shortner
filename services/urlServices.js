const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl
}=require("../repositories/urlRepository");
const {redisClient}=require("../config/redis");

const {ApiError}=require("../utils/ApiError");

const generateShortUrl=async(originalUrl)=>{
    const cachedUrl=await redisClient.get(originalUrl);
    if(cachedUrl){
        return cachedUrl;
    }
    const existingShortUrl=await findByOriginalUrl(originalUrl);
    if(existingShortUrl){
        await redisClient.set(originalUrl,existingShortUrl,{
            EX:15*60
        });
        return existingShortUrl;
    }

    const shortCode=nanoid(7);
    const shortUrl=await createUrl(shortCode,originalUrl);
    await redisClient.set(shortCode,originalUrl,{
        EX:15*60
    });
    return shortUrl;
}

const getOriginalUrl=async(shortCode)=>{
    const cachedUrl=await redisClient.get(shortCode);
    if(cachedUrl){
        return cachedUrl;
    }
    const originalUrl=await findByShortCode(shortCode);
    if(!originalUrl){
        throw new ApiError(404,"Short Code not found");
    }

    await redisClient.set(shortCode,originalUrl,{
        EX:15*60
    });

    return originalUrl;
}

module.exports={
    generateShortUrl,
    getOriginalUrl
}