const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl
}=require("../repositories/urlRepository");
const {getCached,setCached}=require("../config/redis");

const {ApiError}=require("../utils/ApiError");

const generateShortUrl=async(originalUrl)=>{
    const cachedUrl=await getCached(originalUrl);
    if(cachedUrl){
        return cachedUrl;
    }
    const existingShortUrl=await findByOriginalUrl(originalUrl);
    if(existingShortUrl){
        await setCached(originalUrl,existingShortUrl,15*60);
        return existingShortUrl;
    }

    const shortCode=nanoid(7);
    const shortUrl=await createUrl(shortCode,originalUrl);
    //Under survelience
    await setCached(originalUrl, shortUrl);
    //
    await setCached(shortCode,originalUrl,15*60);
    return shortUrl;
}

const getOriginalUrl=async(shortCode)=>{
    const cachedUrl=await getCached(shortCode);
    if(cachedUrl){
        return cachedUrl;
    }
    const originalUrl=await findByShortCode(shortCode);
    if(!originalUrl){
        throw new ApiError(404,"Short Code not found");
    }

    await setCached(shortCode,originalUrl,15*60);

    return originalUrl;
}

module.exports={
    generateShortUrl,
    getOriginalUrl
}