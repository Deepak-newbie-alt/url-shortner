const {client} = require('../config/db');
const { logger } = require('../observability/logger');
const { recordDbDuration } = require('../observability/metrics');

async function findByShortCode(shortCode) {
    // CQL SELECT
    const start=performance.now();
    const query='SELECT original_url FROM url_by_code WHERE short_code=?';
    const params=[shortCode];
    const result = await client.execute(query, params, { prepare: true });
    recordDbDuration(performance.now()-start);
    return result.rows.length>0?result.rows[0].original_url:null;
}

async function findByOriginalUrl(originalUrl) {
    // CQL SELECT
    const start=performance.now();
    const query='SELECT short_code FROM code_by_url WHERE original_url=?';
    const params=[originalUrl];
    const result=await client.execute(query, params, { prepare: true });
    recordDbDuration(performance.now()-start);
    return result.rows.length>0?result.rows[0].short_code:null;
}

async function createUrl(shortCode,originalUrl) {
    // CQL INSERT
    const start1=performance.now();
    const created_at=new Date();
    const query1='INSERT INTO code_by_url (short_code,original_url,created_at) VALUES(?,?,?) IF NOT EXISTS';
    const query2='INSERT INTO url_by_code (short_code,original_url,created_at) VALUES(?,?,?) IF NOT EXISTS';
    const params=[shortCode,originalUrl,created_at];

    const res1=await client.execute(query1,params,{prepare:true});

    recordDbDuration(performance.now()-start1);

    const start2=performance.now();
    let finalShortCode=shortCode;
    if(!res1.wasApplied()){
        logger.info("shortcode_already_exists",{
            message:"ShortCode already exists for this url"
        })
        finalShortCode= await findByOriginalUrl(originalUrl);
        recordDbDuration(performance.now()-start2);
    }

    const start3=performance.now();

    await client.execute(query2,
        [finalShortCode,originalUrl,created_at],
        {prepare:true});

    recordDbDuration(performance.now()-start3);
    return finalShortCode;
}

module.exports={
    findByShortCode,
    findByOriginalUrl,
    createUrl
}