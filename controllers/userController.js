const {catchAsync}=require("../utils/catchAsync");
const {executeRegisterUser,executeLoginUser,executeRotateToken}=require("../services/userServices");

const {ApiResponse}=require("../utils/ApiResponse");

const options={
    httpOnly:true,
    secure:process.env.NODE_ENV==="production"
}

const register=catchAsync(async(req,res)=>{
    const {email,password}=req.body;

    await executeRegisterUser(email,password);
    return res.status(201).json(
        new ApiResponse(201,"User registered successfully")
    )
})


const login=catchAsync(async(req,res)=>{
    const {email,password}=req.body;

    const data=await executeLoginUser(email,password);

    return res.status(200)
    .cookie("accessToken",data.accessToken,options)
    .cookie("refreshToken",data.refreshToken,options)
    .json(
        new ApiResponse(200,data,"Login successful")
    )
})

const rotateToken=catchAsync(async(req,res)=>{
    const incomingRefreshToken=req.cookies?.refreshToken;

    const tokens=await executeRotateToken(incomingRefreshToken);

    return res.status(200)
    .cookie("accessToken",tokens.accessToken,options)
    .cookie("refreshToken",tokens.refreshToken,options)
    .json(
        new ApiResponse(200,tokens,'Token rotated successfully')
    ) 
})

module.exports={
    register,
    login,
    rotateToken
}