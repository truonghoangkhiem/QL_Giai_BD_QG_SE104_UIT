require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

let DatabaseQuanLyGiaiBDQG = null;

// Khởi tạo connection tới MongoDB
const mongoClientInstance = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Kết nối database
const CONNECT_DB = async () => {
  try {
    await mongoClientInstance.connect();
    DatabaseQuanLyGiaiBDQG = mongoClientInstance.db(process.env.DATABASE_NAME);
    console.log("Connected to MongoDB with MongoClient");
    return DatabaseQuanLyGiaiBDQG; // Trả về database instance
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const GET_DB = () => {
  if (!DatabaseQuanLyGiaiBDQG) {
    throw new Error("Database is not connected");
  }
  return DatabaseQuanLyGiaiBDQG;
};

module.exports = { CONNECT_DB, GET_DB };
