const express=require("express");
const router=express.Router();
const {
    generateShortCode,
    getUrl,
    deleteUrl,
    getUrlsOfUser
}=require('../controllers/urlController');

const {validate}=require("../middlewares/validationMiddleware");
const {createUrlSchema}=require("../schemas/createUrlSchema");
const { customRateLimiter } = require("../middlewares/rateLimiterMiddleware");
const { verifyCaptcha } = require("../middlewares/verifyCaptchaMiddleware");
const { clientIdentity } = require("../middlewares/clientIdMiddleware");
const {auth}=require("../middlewares/authMiddleware");

router.post("/shorten",auth,clientIdentity,customRateLimiter(60,5,"shorten"),verifyCaptcha,validate(createUrlSchema),generateShortCode);
router.delete("/:shortCode",auth,clientIdentity,customRateLimiter(60,5,"delete"),verifyCaptcha,deleteUrl);
router.get("/user/urls",auth,clientIdentity,customRateLimiter(60,5,"global"),verifyCaptcha,getUrlsOfUser);

//public route
router.get("/:shortCode",clientIdentity,customRateLimiter(60,5,"global"),verifyCaptcha,getUrl);

module.exports=router;