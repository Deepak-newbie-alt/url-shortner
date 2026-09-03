require("dotenv").config();
const fs = require("fs");
const cassandra = require("cassandra-driver");

let scbPath = process.env.SCB_PATH;

if (process.env.ASTRA_SCB_BASE64) {
    scbPath = "/tmp/secure-connect-tinyurl.zip";

    fs.writeFileSync(
        scbPath,
        Buffer.from(process.env.ASTRA_SCB_BASE64, "base64")
    );
}

const authProvider = new cassandra.auth.PlainTextAuthProvider(
    "token",
    process.env.ASTRA_TOKEN
);

const client = new cassandra.Client({
    cloud: {
        secureConnectBundle: scbPath
    },
    authProvider,
    keyspace: "tinyurl"
});

async function connectDB() {
    try {
        console.log("Connecting to Astra...");
        await client.connect();
        console.log("Connected to Astra DB");
    } catch (error) {
        console.error("Astra connection failed:", error);
        throw error;
    }
}

module.exports = { connectDB, client};