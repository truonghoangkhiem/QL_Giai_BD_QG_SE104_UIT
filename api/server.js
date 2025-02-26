const express = require("express");
const { CONNECT_DB } = require("./db");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const START_SERVER = async () => {
  const app = express();
  const port = 5000;
  app.use(express.json());

  try {
    // Kết nối tới database và gán db
    const db = await CONNECT_DB(); // Chờ kết nối hoàn tất và nhận database
    console.log("Connected to database");

    // Middleware xác thực JWT
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) return res.sendStatus(401);
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
      });
    };

    // API đăng ký tài khoản
    app.post("/api/auth/registrations", async (req, res) => {
      const { email, password } = req.body;
      try {
        if (
          !email ||
          !password ||
          typeof email !== "string" ||
          typeof password !== "string"
        ) {
          return res.status(400).json({
            message: "Email and password are required and must be strings",
          });
        }
        // Kiểm tra email có tồn tại chưa
        const IsExistEmail = await db.collection("users").findOne({ email });
        if (IsExistEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db
          .collection("users")
          .insertOne({ email, password: hashedPassword });
        res.status(201).json({
          message: "Created user successfully",
          id: result.insertedId,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    //API Dang nhap
    app.post("/api/auth/logins", async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await db.collection("users").findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res
            .status(401)
            .json({ message: "Email or password is incorrect" });
        }
        const token = jwt.sign(
          { user_id: user._id, email },
          process.env.JWT_SECRET,
          { expiresIn: "2h" }
        );
        res.json({ token });
      } catch (error) {
        console.error("Eror login: ", error);
        res.status(500).json({ message: "Login failed" });
      }
    });
    //API lay thong tin va thu hang cua cac doi bong
    app.get("/api/leagues", async (req, res) => {
      try {
      } catch (error) {
        console.error("Error get leagues: ", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Chạy server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

START_SERVER().catch(console.error);
