const {ZodError}=require("zod");
const {ApiResponse}=require("../utils/ApiResponse");

const errorMiddleware=(err,req,res,next)=>{

    if(err instanceof ZodError){
        return res.status(400).json(
            new ApiResponse(400,{
                message:"Validation failed",
                errors:err.issues.map((issue)=>(issue.message))
            })
        )
    }

    if(err.name==="TokenExpiredError"){
            return res.status(401).json(
                new ApiResponse(401,{
                    message:"Token Expired...Please login again",
                    errors:err.message
                })
            )
    }

    const statusCode =err.statusCode || 500;
    const message=err.message || "Internal server error";
    const errors=err.errors || [];

    res.status(statusCode).json(
        new ApiResponse(statusCode,{
            message,
            errors
        })
    )
}

module.exports={errorMiddleware};