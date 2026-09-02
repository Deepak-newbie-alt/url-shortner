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

async function createUrl(userId,shortCode,originalUrl) {
    // CQL INSERT
    const start1=performance.now();
    const created_at=new Date();
    const query1='INSERT INTO code_by_url (short_code,original_url,created_at) VALUES(?,?,?) IF NOT EXISTS';
    const query2='INSERT INTO url_by_code (short_code,original_url,created_at,user_id) VALUES(?,?,?,?) IF NOT EXISTS';
    const query3='INSERT INTO urls_by_user (user_id,original_url,short_code,created_at) VALUES(?,?,?,?)';
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
        [finalShortCode,originalUrl,created_at,userId],
        {prepare:true});

    recordDbDuration(performance.now()-start3);

    const start4=performance.now();
    await client.execute(
        query3,
        [userId,originalUrl,finalShortCode,created_at],
        {prepare:true}
    )

    recordDbDuration(performance.now()-start4);
    return finalShortCode;
}

async function deleteUrlQuery(shortCode,userId) {
    const start1 = performance.now();

    const result = await client.execute(
        'SELECT original_url, created_at FROM url_by_code WHERE short_code = ? AND user_id = ?',
        [shortCode,userId],
        { prepare: true }
    );

    recordDbDuration(performance.now() - start1);

    if(result.rowLength===0){
        return false;
    }

    const originalUrl=result.rows[0].original_url;
    const createdAt = result.rows[0].created_at;

    const deleteByCode=async()=>{
        const start=performance.now();
        try{
            const query='DELETE FROM url_by_code WHERE short_code = ? AND user_id = ?';
            const params=[shortCode,userId];

            return await client.execute(
                query,
                params,
                {prepare:true}
            )
        }finally{
            recordDbDuration(performance.now()-start);
        }
    }

    const deleteByUrl=async()=>{
        const start=performance.now();
        try{
            const query='DELETE FROM code_by_url WHERE original_url = ?';
            const params=[originalUrl];

            return await client.execute(
                query,
                params,
                {prepare:true}
            )
        }finally{
            recordDbDuration(performance.now()-start);
        }
    }

    const deleteFromUserRecords=async()=>{
        const start=performance.now();
        try{
            const query='DELETE FROM urls_by_user WHERE user_id = ? AND created_at = ? AND short_code = ?';
            const params=[userId,createdAt,shortCode];

            return await client.execute(
                query,
                params,
                {prepare:true}
            )
        }finally{
            recordDbDuration(performance.now()-start);
        }
    }

    await Promise.all([
        deleteByCode(),
        deleteByUrl(),
        deleteFromUserRecords()
    ])

    return true;
}

async function getUrlsByUser(userId) {
    const start=performance.now();
    try{
        const query='SELECT original_url, short_code, created_at FROM urls_by_user WHERE user_id= ?';
        const params=[userId];

        const result=await client.execute(
            query,
            params,
            {prepare:true}
        );
        return result.rows;
    }finally{
        recordDbDuration(performance.now()-start);
    }
}

module.exports={
    findByShortCode,
    findByOriginalUrl,
    createUrl,
    deleteUrlQuery,
    getUrlsByUser
}