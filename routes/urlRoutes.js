const express=require("express");
const router=express.Router();
const {
    generateShortCode,
    getUrl
}=require('../controllers/urlController');

const {validate}=require("../middlewares/validationMiddleware");
const {createUrlSchema}=require("../schemas/createUrlSchema");
const { customRateLimiter } = require("../middlewares/rateLimiterMiddleware");
const { verifyCaptcha } = require("../middlewares/verifyCaptchaMiddleware");
const { clientIdentity } = require("../middlewares/clientIdMiddleware");

router.post("/shorten",clientIdentity,customRateLimiter(60,5,"shorten"),verifyCaptcha,validate(createUrlSchema),generateShortCode);
router.get("/:shortCode",clientIdentity,customRateLimiter(60,10,"global"),verifyCaptcha,getUrl);

module.exports=router;