const express=require("express");
const router=express.Router();

const {
    register,
    login,
    rotateToken,
    logout
}=require("../controllers/userController");

const {validate}=require("../middlewares/validationMiddleware");
const {registerOrLoginSchema}=require("../schemas/registerOrLoginSchema");
const { customRateLimiter } = require("../middlewares/rateLimiterMiddleware");
const { verifyCaptcha } = require("../middlewares/verifyCaptchaMiddleware");
const { clientIdentity } = require("../middlewares/clientIdMiddleware");
const { auth } = require("../middlewares/authMiddleware");

router.post("/register",clientIdentity,customRateLimiter(60,5,"register"),verifyCaptcha,validate(registerOrLoginSchema),register);
router.post("/login",clientIdentity,customRateLimiter(60,5,"login"),verifyCaptcha,validate(registerOrLoginSchema),login);
router.post("/rotate-token",clientIdentity,customRateLimiter(60,5,"refresh"),verifyCaptcha,rotateToken);
router.post("/logout",auth,customRateLimiter(60,5,"logout"),logout);

module.exports=router;