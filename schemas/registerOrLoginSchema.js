const {z} =require("zod");

const registerOrLoginSchema=z.object({
    email:z
    .string()
    .trim()
    .min(1,"Email is required")
    .email("Please provide a valid email address"),
    password:z
    .string()
    .min(8,"Password must be at least 8 characters long")
    .regex(/[A-Z]/,"Password must contain at least one uppercase letter")
    .regex(/^\S+$/, "Password must not contain spaces")
})

module.exports={
    registerOrLoginSchema
}