const {catchAsync}=require("../utils/catchAsync");
const {executeRegisterUser,executeLoginUser,executeRotateToken, executeLogoutUser}=require("../services/userServices");

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
        new ApiResponse(200,{
            data,
            message:"Login Successful"
        })
    )
})

const rotateToken=catchAsync(async(req,res)=>{
    const incomingRefreshToken=req.cookies?.refreshToken;

    const tokens=await executeRotateToken(incomingRefreshToken);

    return res.status(200)
    .cookie("accessToken",tokens.accessToken,options)
    .cookie("refreshToken",tokens.refreshToken,options)
    .json(
        new ApiResponse(200,{
            tokens,
            message:'Token rotated successfully'
        })
    ) 
})

const logout=catchAsync(async(req,res)=>{
    const {email}=req.user;

    await executeLogoutUser(email);

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,"Logout successful")
    )


})

module.exports={
    register,
    login,
    rotateToken,
    logout
}