const jwt=require("jsonwebtoken");

const generateAccessToken=(userId,email)=>{
    const user={
        userId,
        email
    }
    const accessToken=jwt.sign(
        {user},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"15m"}
    )
    return accessToken;
}

const generateRefreshToken=(userId,email)=>{
    const user={
        userId,
        email
    }
    const refreshToken=jwt.sign(
        {user},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:"7d"}
    )
    return refreshToken;
}

const generateTokens=(userId,email)=>{
    const accessToken=generateAccessToken(userId,email);
    const refreshToken=generateRefreshToken(userId,email);

    return {accessToken,refreshToken};
}

module.exports={generateTokens};