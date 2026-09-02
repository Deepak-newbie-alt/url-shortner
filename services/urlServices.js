const {nanoid}=require('nanoid');
const {
    findByShortCode,
    findByOriginalUrl,
    createUrl,
    deleteUrlQuery,
    getUrlsByUser
}=require("../repositories/urlRepository");

const {ApiError}=require("../utils/ApiError");
const { getRedisCache, setRedisCache } = require('../utils/redisHelpers');
const { logger } = require('../observability/logger');
const { recordTotalUrl}=require("../observability/metrics");
const {sanitizeUrl}=require("../utils/sanitizeUrl");

const generateShortUrl=async(userId,originalUrl)=>{
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
    const shortUrl=await createUrl(userId,shortCode,originalUrl);
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

const deleteUrlFromDB=async(shortCode,userId)=>{
    logger.info("delete_query_started",{
        userId,
        shortCode
    });
    const deleted=await deleteUrlQuery(shortCode,userId);

    if (!deleted) {
        logger.error("url_not_found_or_failed_ownership_check",{
            userId,
            shortCode,
            status:404
        })
        throw new ApiError(404,"URL not found or you don't own this URL")
    }

    logger.info("deletion_query_successful",{
        userId,
        shortCode
    });
    return deleted;
}

const getUrls=async(userId)=>{
    const cachedUrls=await getRedisCache(`urls:${userId}`);
    if(cachedUrls){
        logger.info("urls_fetch_cache_hit",{
            userId,
            count:cachedUrls.length
        });
        return cachedUrls;
    }

    const urls=await getUrlsByUser(userId);

    if(!urls || urls.length==0){
        logger.error("no_urls_found_for_user",{
            userId,
            status:404,
            message:"No urls found for the specified user"
        });

        throw new ApiError(404,"No urls found for the specified user");
    }
    await setRedisCache(`urls:${userId}`,urls,15*60);
    logger.info("urls_fetched_successfully",{
        userId,
        count:urls.length
    })
    return urls;
}

module.exports={
    generateShortUrl,
    getOriginalUrl,
    deleteUrlFromDB,
    getUrls
}