const {client} = require('../config/db');

async function findByShortCode(shortCode) {
    // CQL SELECT
    const query='SELECT original_url FROM url_by_code WHERE short_code=?';
    const params=[shortCode];
    const result = await client.execute(query, params, { prepare: true });
    return result.rows.length>0?result.rows[0].original_url:null;
}

async function findByOriginalUrl(originalUrl) {
    // CQL SELECT
    const query='SELECT short_code FROM code_by_url WHERE original_url=?';
    const params=[originalUrl];
    const result=await client.execute(query, params, { prepare: true });
    return result.rows.length>0?result.rows[0].short_code:null;
}

async function createUrl(shortCode,originalUrl) {
    // CQL INSERT
    const created_at=new Date();
    const query1='INSERT INTO code_by_url (short_code,original_url,created_at) VALUES(?,?,?) IF NOT EXISTS';
    const query2='INSERT INTO url_by_code (short_code,original_url,created_at) VALUES(?,?,?) IF NOT EXISTS';
    const params=[shortCode,originalUrl,created_at];

    const res1=await client.execute(query1,params,{prepare:true});

    let finalShortCode=shortCode;
    if(!res1.wasApplied()){
        console.log("Short code already exists for this url");
        finalShortCode= await findByOriginalUrl(originalUrl);
    }

    await client.execute(query2,
        [finalShortCode,originalUrl,created_at],
        {prepare:true});

    return finalShortCode;
}

module.exports={
    findByShortCode,
    findByOriginalUrl,
    createUrl
}