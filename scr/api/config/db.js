require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

let DatabaseQuanLyGiaiBDQG = null;

const mongoClientInstance = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const CONNECT_DB = async () => {
  try {
    console.log("📌 [DEBUG] Đang kết nối MongoDB...");
    await mongoClientInstance.connect();
    DatabaseQuanLyGiaiBDQG = mongoClientInstance.db(process.env.DATABASE_NAME);
    console.log("✅ [DEBUG] Đã kết nối MongoDB:", process.env.DATABASE_NAME);
    return DatabaseQuanLyGiaiBDQG;
  } catch (error) {
    console.error("❌ [DEBUG] Lỗi kết nối MongoDB:", error);
    throw error;
  }
};

const GET_DB = () => {
  if (!DatabaseQuanLyGiaiBDQG) {
    throw new Error("❌ [DEBUG] Database chưa kết nối!");
  }
  return DatabaseQuanLyGiaiBDQG;
};

module.exports = { CONNECT_DB, GET_DB };
