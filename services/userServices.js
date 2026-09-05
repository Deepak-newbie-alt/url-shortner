const {registerUser,loginUser,findUserByEmail,setRefreshToken}=require("../repositories/userRepository");
const {generateTokens}=require("../utils/generateTokens");

const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const {ApiError}=require("../utils/ApiError");
const {logger}=require("../observability/logger");

const executeRegisterUser=async(email,password)=>{
    logger.info("user_registration_attempt",{
        email
    })
    const hashedPassword=await bcrypt.hash(password,10);

    const result=await registerUser(email,hashedPassword);

    if(!result.wasApplied()){
        logger.info("user_already_exists",{
            email,
            status:409,
            message:"User already exists"
        })
        throw new ApiError(409,"User already exists");
    }

    logger.info("user_registered",{
        email,
        message:"User registered successfully"
    })
}

const executeLoginUser=async(email,password)=>{
    logger.info("user_login_attempt",{
        email
    })
    
    const result=await loginUser(email,password);
    
    if(!result){
        logger.error("invalid_credentials",{
            email,
            status:401,
            message:"Invalid credentials"
        })
        throw new ApiError(401,"Invalid credentials");
    }

    const userId=result.userId;

    const {accessToken,refreshToken}=generateTokens(userId,email);

    await setRefreshToken(email,refreshToken);
    const data={
        userId,
        accessToken,
        refreshToken
    }

    logger.info("user_logged_in",{
        email,
        userId,
        message:'User logged in successfully'
    })

    return data;
}

const executeRotateToken=async(incomingRefreshToken)=>{
    logger.info("token_rotation_attempt",{
        incomingRefreshToken
    })
    if(!incomingRefreshToken){
        logger.error("refresh_token_missing",{
            message:"Refresh token is missing",
            status:401
        })
        throw new ApiError(401,"Refresh Token is required");
    }
    const decoded=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    const user=decoded.user;

    const isUser=await findUserByEmail(user.email);

    if(!isUser || incomingRefreshToken!==isUser.refresh_token){
        logger.error("invalid_refresh_token",{
            message:"Invaild token or missing user",
            status:403
        })
        throw new ApiError(403,"Invalid Refresh token");
    }


    const {accessToken,refreshToken}=generateTokens(user.userId,user.email);
    await setRefreshToken(user.email,refreshToken);

    const data={
        accessToken,
        refreshToken
    }
    logger.info("token_rotated_successfully",{
        userId:user.userId,
        message:"Token rotated successfully"
    })
    return data;
}


module.exports={
    executeRegisterUser,
    executeLoginUser,
    executeRotateToken
}