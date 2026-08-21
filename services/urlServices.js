const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl
}=require("../repositories/urlRepository");

const {ApiError}=require("../utils/ApiError");
const { getRedisCache, setRedisCache } = require('../utils/redisHelpers');

const generateShortUrl=async(originalUrl)=>{
    const cachedUrl=await getRedisCache(originalUrl);
    if(cachedUrl){
        return cachedUrl;
    }
    const existingShortUrl=await findByOriginalUrl(originalUrl);
    if(existingShortUrl){
        await setRedisCache(originalUrl,existingShortUrl,15*60);
        return existingShortUrl;
    }

    const shortCode=nanoid(7);
    const shortUrl=await createUrl(shortCode,originalUrl);

    await setRedisCache(originalUrl,shortUrl,15*60);

    await setRedisCache(shortCode,originalUrl,15*60);
    return shortUrl;
}

const getOriginalUrl=async(shortCode)=>{
    const cachedUrl=await getRedisCache(shortCode);
    if(cachedUrl){
        return cachedUrl;
    }
    const originalUrl=await findByShortCode(shortCode);
    if(!originalUrl){
        throw new ApiError(404,"Short Code not found");
    }

    await setRedisCache(shortCode,originalUrl,15*60);
    return originalUrl;
}

module.exports={
    generateShortUrl,
    getOriginalUrl
}