const crypto=require("crypto");

const options={
    httpOnly:true,
    secure:false,
    maxAge:1000*60*60*24
}


const clientIdentity=async(req,res,next)=>{

    let clientId=req.cookies.clientId;

    if(!clientId){
        clientId=crypto.randomUUID();
        res.cookie("clientId",clientId,options);
    }

    req.clientId=clientId;
    next();
}

module.exports={clientIdentity};
