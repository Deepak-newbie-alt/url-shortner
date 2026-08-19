require("dotenv").config();

const cassandra = require("cassandra-driver");

const authProvider = new cassandra.auth.PlainTextAuthProvider(
    "token",
    process.env.ASTRA_TOKEN
);

const client = new cassandra.Client({
    cloud: {
        secureConnectBundle:
            process.env.SCB_PATH
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