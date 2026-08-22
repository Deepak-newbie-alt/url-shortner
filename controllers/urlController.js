const {
    generateShortUrl,
    getOriginalUrl
}=require("../services/urlServices");
const {catchAsync}=require("../utils/catchAsync");

const {ApiResponse}=require("../utils/ApiResponse");

const generateShortCode=catchAsync(async(req,res)=>{
    const {originalUrl}=req.body;

    const createdUrl=await generateShortUrl(originalUrl);

    return res.status(201).json(
        new ApiResponse(201,{shortCode:createdUrl})
    );
});

const getUrl=catchAsync(async(req,res)=>{
    const {shortCode}=req.params;
    const originalUrl=await getOriginalUrl(shortCode);

    return res.redirect(302,originalUrl);
});

module.exports={
    generateShortCode,
    getUrl
}