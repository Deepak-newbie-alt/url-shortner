const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl
}=require("../repositories/urlRepository");

const {ApiError}=require("../utils/ApiError");

const generateShortUrl=async(originalUrl)=>{
    const existingShortUrl=await findByOriginalUrl(originalUrl);
    if(existingShortUrl){
        return existingShortUrl;
    }

    const shortCode=nanoid(7);
    const shortUrl=await createUrl(shortCode,originalUrl);
    return shortUrl;
}

const getOriginalUrl=async(shortCode)=>{
    const originalUrl=await findByShortCode(shortCode);
    if(!originalUrl){
        throw new ApiError(404,"Short Code not found");
    }

    return originalUrl;
}

module.exports={
    generateShortUrl,
    getOriginalUrl
}