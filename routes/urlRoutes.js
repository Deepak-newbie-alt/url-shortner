const express=require("express");
const router=express.Router();
const {
    generateShortCode,
    getUrl
}=require('../controllers/urlController');

const {validate}=require("../middlewares/validationMiddleware");
const {createUrlSchema}=require("../schemas/createUrlSchema");

router.post("/shorten",validate(createUrlSchema),generateShortCode);
router.get("/:shortCode",getUrl);

module.exports=router;