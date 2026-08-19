const express=require("express");
const {connectDB}=require("./config/db");
const app=express();

const urlRoutes=require("./routes/urlRoutes");
const {errorMiddleware}=require("./middlewares/errorMiddleware");

app.use(express.json());
app.use("/api/url",urlRoutes);

const PORT=5000;

async function startServer() {
    await connectDB();
    app.listen(PORT,()=>{
        console.log(`Server is running on port ${PORT}`);
    })
}

app.use(errorMiddleware);

startServer();