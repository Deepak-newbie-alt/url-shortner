const express=require("express");
const {connectDB}=require("./config/db");
const cookieParser=require("cookie-parser")
const app=express();

const urlRoutes=require("./routes/urlRoutes");
const {errorMiddleware}=require("./middlewares/errorMiddleware");
const {requestIdMiddleware}=require("./middlewares/requestIdMiddleware");
const {requestMetricMiddleware}=require("./middlewares/requestMetricMiddleware");
const {redisConnect}=require("./config/redis");

app.use(express.json({limit:"10kb"}));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestMetricMiddleware);
app.use("/api/url",urlRoutes);

const PORT=5000;

async function startServer() {
    await connectDB();
    
    app.listen(PORT,()=>{
        console.log(`Server is running on port ${PORT}`);
    })
    
    const redisAvailable=await redisConnect();
    if(!redisAvailable){
        console.log("Starting server without redis...");
    }
    
}

app.use(errorMiddleware);

startServer();