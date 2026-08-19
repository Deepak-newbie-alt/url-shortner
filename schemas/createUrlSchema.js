const {z} =require("zod");

const createUrlSchema=z.object({
    originalUrl:z
    .string()
    .trim()
    .min(1,"Url is required")
    .url("Please provide a valid url")
    .refine(
        (url)=>url.startsWith("http://")||url.startsWith("https://"),
        "Only http and https protocols are allowed"
    )
})

module.exports={
    createUrlSchema
};