
let httpRequestsTotal=0;
let httpErrorsTotal=0;
let urlsCreatedTotal=0;
let httpRequestInFlight=0;
const dbOperationDurations=[];
const httpRequestDurations=[];
const redisOperationDurations=[];

const recordHttpRequest=()=>{
    httpRequestsTotal++;
}
const recordHttpError=()=>{
    httpErrorsTotal++;
}
const recordTotalUrl=()=>{
    urlsCreatedTotal++;
}
const recordDbDuration=(duration)=>{
    dbOperationDurations.push(duration);
}
const recordHttpRequestDuration=(duration)=>{
    httpRequestDurations.push(duration);
}
const recordRedisDuration=(duration)=>{
    redisOperationDurations.push(duration);
}
const startRequestFlight=()=>{
    httpRequestInFlight++;
}
const endRequestFlight=()=>{
    httpRequestInFlight--;
}
const getPercentile=(arr, percentile) =>{
  if (arr.length === 0) return 0;
  
  // 1. Sort the numbers from smallest to largest
  const sorted = [...arr].sort((a, b) => a - b);
  
  // 2. Calculate the target index
  const index = (percentile / 100) * (sorted.length - 1);
  
  // 3. Interpolate between values if the index is a decimal
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
const getAverage=(arr)=>{
    if(arr.length==0) return 0;
    return arr.reduce((acc,cur)=>acc+cur,0)/arr.length;
}
const getMin = (arr) => {
    if (arr.length === 0) return 0;
    return Math.min(...arr);
};

const getMax = (arr) => {
    if (arr.length === 0) return 0;
    return Math.max(...arr);
};

const getMetrics = () => {
    return {
        httpRequestsTotal,
        httpErrorsTotal,
        urlsCreatedTotal,
        httpRequestInFlight,
        db_request_duration:{
            count:dbOperationDurations.length,
            averageTime:getAverage(dbOperationDurations),
            min:getMin(dbOperationDurations),
            max:getMax(dbOperationDurations),
            p50:getPercentile(dbOperationDurations,50),
            p95:getPercentile(dbOperationDurations,95),
            p99:getPercentile(dbOperationDurations,99)
        },
        http_request_duration:{
            count:httpRequestDurations.length,
            averageTime:getAverage(httpRequestDurations),
            min:getMin(httpRequestDurations),
            max:getMax(httpRequestDurations),
            p50:getPercentile(httpRequestDurations,50),
            p95:getPercentile(httpRequestDurations,95),
            p99:getPercentile(httpRequestDurations,99)
        },
        redis_request_duration:{
            count:redisOperationDurations.length,
            averageTime:getAverage(redisOperationDurations),
            min:getMin(redisOperationDurations),
            max:getMax(redisOperationDurations),
            p50:getPercentile(redisOperationDurations,50),
            p95:getPercentile(redisOperationDurations,95),
            p99:getPercentile(redisOperationDurations,99)
        }
    };
};

module.exports={
    recordHttpRequest,
    recordHttpError,
    recordTotalUrl,
    recordDbDuration,
    recordHttpRequestDuration,
    recordRedisDuration,
    startRequestFlight,
    endRequestFlight,
    getMetrics
}