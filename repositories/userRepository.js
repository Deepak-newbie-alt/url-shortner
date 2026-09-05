const {client} = require('../config/db');
const crypto=require("crypto");
const { recordDbDuration } = require('../observability/metrics');

const bcrypt = require("bcrypt");


async function registerUser(email,hashedPassword) {
    const start=performance.now();
    const createdAt=new Date();
    const userId=crypto.randomUUID();

    const query=`INSERT INTO users
                (email,user_id,password,created_at)
                VALUES(?,?,?,?) IF NOT EXISTS`;
    const params=[email,userId,hashedPassword,createdAt];
    
    const result=await client.execute(
        query,
        params,
        {prepare:true}
    );

    recordDbDuration(performance.now()-start);
    return result;
}

async function loginUser(email, password) {
    const start = performance.now();

    const result = await client.execute(
        `SELECT user_id, password
         FROM users
         WHERE email = ?`,
        [email],
        { prepare: true }
    );

    recordDbDuration(performance.now() - start);

    if (result.rowLength === 0) {
        return null;
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatches) {
        return null;
    }

    return {
        userId: user.user_id
    };
}

async function findUserByEmail(email){
    const start=performance.now();
    const query='SELECT refresh_token FROM users WHERE email=?';
    const params=[email];

    const result=await client.execute(
        query,
        params,
        {prepare:true}
    )

    recordDbDuration(performance.now()-start);
    return result.rowLength>0?result.rows[0]:null;
}

async function setRefreshToken(email,refreshToken){
    const start=performance.now();
    const query=`UPDATE users
                SET refresh_token=?
                WHERE email=?`;
    const params=[refreshToken,email];
    await client.execute(
        query,
        params,
        {prepare:true}
    )
    recordDbDuration(performance.now()-start);
}

module.exports={registerUser,loginUser,findUserByEmail,setRefreshToken};