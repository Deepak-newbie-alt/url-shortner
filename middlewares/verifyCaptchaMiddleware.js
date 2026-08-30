const {redisClient}=require("../config/redis");
const axios=require("axios");
const { ApiResponse } = require("../utils/ApiResponse");
const { catchAsync } = require("../utils/catchAsync");
const { ApiError } = require("../utils/ApiError");

const verifyCaptcha=catchAsync(async(req,res,next)=>{
    if(!req.isAbused){
        return next();
    }

    const RECAPTCHA_SECRET_KEY=process.env.RECAPTCHA_SECRET_KEY;

    if(!RECAPTCHA_SECRET_KEY){
        throw new ApiError(500,"CAPTCHA service is not configured");
    }

    const {captchaToken}=req.body;

    if(!captchaToken){
        return res.status(400).json(
            new ApiResponse(400,{
                message: "Bad Request",
                error:"Missing Captcha Token"
            })
        )
    }
    const verificationUrl=`https://www.google.com/recaptcha/api/siteverify`;
    const response=await axios.post(
        verificationUrl,
        new URLSearchParams({
            secret:RECAPTCHA_SECRET_KEY,
            response:captchaToken
        }),
        {
            headers:{
                "Content-Type":"application/x-www-form-urlencoded"
            }
        }
    );

    if(response.data.success){
        if(req.redisKeyToReset){
            await redisClient.del(req.redisKeyToReset);
        }

        if(req.violationKeyToReset){
            await redisClient.del(req.violationKeyToReset);
        }

        return next();
    }


    return res.status(401).json(
        new ApiResponse(401,{
            message: "Unauthorized",
            error: "Captcha verification failed"
        })
    )
})

module.exports={verifyCaptcha};