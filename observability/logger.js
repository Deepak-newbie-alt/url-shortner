const {requestContext}=require("./requestContext");

const logger={
    info(message,data={}){
        const context=requestContext.getStore();
        console.log("[INFO]",message,{
            requestId:context?.requestId,
            ...data
        });
    },
    error(message,data={}){
        const context=requestContext.getStore();
        console.log("[ERROR]",message,{
            requestId:context?.requestId,
            ...data
        });
    }
};

module.exports={logger};