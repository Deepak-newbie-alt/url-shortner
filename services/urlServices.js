const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl
}=require("../repositories/urlRepository");

const {ApiError}=require("../utils/ApiError");
const { getRedisCache, setRedisCache } = require('../utils/redisHelpers');
const { logger } = require('../observability/logger');
const { recordTotalUrl,recordDbDuration }=require("../observability/metrics");
const {sanitizeUrl}=require("../utils/sanitizeUrl");

const generateShortUrl=async(originalUrl)=>{
    logger.info("url_generation_started",{
        url:sanitizeUrl(originalUrl)
    })
    const cachedUrl=await getRedisCache(originalUrl);
    if(cachedUrl){
        logger.info("url_generation_cache_hit",{
            url:sanitizeUrl(originalUrl)
        })
        return cachedUrl;
    }
    logger.info("url_generation_cache_miss",{
            url:sanitizeUrl(originalUrl)
        })

    const existingShortUrl=await findByOriginalUrl(originalUrl);
    if(existingShortUrl){
        logger.info("url_already_exists",{
            url:sanitizeUrl(originalUrl)
        })
        await setRedisCache(originalUrl,existingShortUrl,15*60);
        return existingShortUrl;
    }

    const shortCode=nanoid(7);
    const shortUrl=await createUrl(shortCode,originalUrl);
    recordTotalUrl();

    await setRedisCache(originalUrl,shortUrl,15*60);
    await setRedisCache(shortCode,originalUrl,15*60);

    logger.info("url_generation_success",{
        url:sanitizeUrl(originalUrl)
    })
    return shortUrl;
}

const getOriginalUrl=async(shortCode)=>{
    logger.info("url_redirect_started",{shortCode});

    const cachedUrl=await getRedisCache(shortCode);
    if(cachedUrl){
        logger.info("url_redirect_cache_hit",{
            shortCode
        });
        return cachedUrl;
    }

    logger.info("url_redirect_cache_miss",{
        shortCode
    });
    const originalUrl=await findByShortCode(shortCode);
    if(!originalUrl){
        logger.error("url_not_found",{
            shortCode,
            status:404
        });
        throw new ApiError(404,"Short Code not found");
    }

    await setRedisCache(shortCode,originalUrl,15*60);

    logger.info("url_redirect_lookup_success",{
        shortCode
    });
    return originalUrl;
}

module.exports={
    generateShortUrl,
    getOriginalUrl
}