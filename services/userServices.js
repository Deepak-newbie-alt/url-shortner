const {registerUser,loginUser}=require("../repositories/userRepository");
const {generateTokens}=require("../utils/generateTokens");

const bcrypt=require("bcrypt");
const {ApiResponse}=require("../utils/ApiResponse");
const {logger}=require("../utils/logger");

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
        return res.status(409).json(
            new ApiResponse(409,"User already exists")
        )
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
        return res.status(401).json(
            new ApiResponse(401,"Invalid credentials")
        )
    }

    const userId=result.userId;

    const {accessToken,refreshToken}=generateTokens(userId);
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


module.exports={
    executeRegisterUser,
    executeLoginUser
}