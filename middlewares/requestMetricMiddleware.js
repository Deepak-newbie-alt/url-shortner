const {logger}=require("../observability/logger");
const {
    recordHttpRequest,
    recordHttpError,
    getMetrics,
    recordHttpRequestDuration,
    startRequestFlight,
    endRequestFlight
}=require("../observability/metrics");

const requestMetricMiddleware=(req,res,next)=>{
    const start=performance.now();
    startRequestFlight();

    res.on("finish",()=>{
        recordHttpRequest();
        if(res.statusCode>=400){
            recordHttpError();
        }

        const duration=performance.now()-start;
        logger.info("http_request_completed",{
            method:req.method,
            route:req.originalUrl,
            status:res.statusCode,
            durationMs: duration
        })
        recordHttpRequestDuration(duration);
        endRequestFlight();
        console.log(getMetrics());
    });
    
    next();
}

module.exports={requestMetricMiddleware};