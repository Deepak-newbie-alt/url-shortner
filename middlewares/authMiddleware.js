const jwt=require("jsonwebtoken");
const {ApiResponse}=require("../utils/ApiResponse");
const {catchAsync}=require('../utils/catchAsync');

const auth=catchAsync(async(req,res,next)=>{
    const token=req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json(
            new ApiResponse(401,"Authentication failed: Token not found")
        )
    }

    const decoded=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);

    req.user=decoded.user;
    next();
})

module.exports={auth};