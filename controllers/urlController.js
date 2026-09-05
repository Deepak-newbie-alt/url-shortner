const {
    generateShortUrl,
    getOriginalUrl,
    deleteUrlFromDB,
    getUrls,
}=require("../services/urlServices");
const {catchAsync}=require("../utils/catchAsync");

const {ApiResponse}=require("../utils/ApiResponse");

const generateShortCode=catchAsync(async(req,res)=>{
    const {originalUrl}=req.body;
    const userId=req.user.userId;

    const createdUrl=await generateShortUrl(userId,originalUrl);

    return res.status(201).json(
        new ApiResponse(201,{shortCode:createdUrl})
    );
});

const getUrl=catchAsync(async(req,res)=>{
    const {shortCode}=req.params;
    const originalUrl=await getOriginalUrl(shortCode);

    return res.redirect(302,originalUrl);
});

const deleteUrl=catchAsync(async(req,res)=>{
    const {shortCode}=req.params;
    const userId=req.user.userId;

    await deleteUrlFromDB(shortCode,userId);

    return res.status(200).json(
        new ApiResponse(200, "URL deleted successfully")
    );
})

const getUrlsOfUser = catchAsync(async (req, res) => {
    const urls = await getUrls(req.user.userId);

    return res.status(200).json(
        new ApiResponse(200, urls, "URLs fetched successfully")
    );
});

module.exports={
    generateShortCode,
    getUrl,
    deleteUrl,
    getUrlsOfUser
}