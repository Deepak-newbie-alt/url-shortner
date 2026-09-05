const express=require("express");
const router=express.Router();

const {
    register,
    login,
    rotateToken
}=require("../controllers/userController");

const {validate}=require("../middlewares/validationMiddleware");
const {registerOrLoginSchema}=require("../schemas/registerOrLoginSchema");

router.post("/register",validate(registerOrLoginSchema),register);
router.post("/login",validate(registerOrLoginSchema),login);
router.post("/rotate-token",rotateToken);

module.exports=router;