const jwt=require("jsonwebtoken");

const generateAccessToken=(userId)=>{
    const accessToken=jwt.sign(
        {userId},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"15m"}
    )
    return accessToken;
}

const generateRefreshToken=(userId)=>{
    const refreshToken=jwt.sign(
        {userId},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:"7d"}
    )
    return refreshToken;
}

const generateTokens=(userId)=>{
    const accessToken=generateAccessToken(userId);
    const refreshToken=generateRefreshToken(userId);

    return {accessToken,refreshToken};
}

module.exports={generateTokens};