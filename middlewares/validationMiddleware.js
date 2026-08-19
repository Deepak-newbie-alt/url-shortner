const {createUrlSchema}=require("../schemas/createUrlSchema");

const validate=(schema)=>(req,res,next)=>{
    const result=schema.safeParse(req.body);
    if(!result.success){
        return next(result.error); 
    }

    req.body=result.data;
    next();
}

module.exports={
    validate
}
