const express = require("express");
const { CONNECT_DB } = require("./db");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const e = require("express");

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
        teams = await db.collection("teams").find().toArray();
        res.json(teams);
      } catch (error) {
        console.error("Error get leagues: ", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    //API POST 1 team
    app.post("/api/teams", authenticateToken, async (req, res) => {
      const {
        team_name,
        logo_url,
        team_points,
        goals_scored,
        goals_conceded,
        team_wins,
        team_draws,
        team_losses,
      } = req.body;
      try {
        if (
          !team_name ||
          !logo_url ||
          !team_points ||
          !goals_scored ||
          !goals_conceded ||
          !team_wins ||
          !team_draws ||
          !team_losses
        )
          return res.status(400).json({ message: "All fields are required" });
        if (typeof team_name !== "string" || typeof logo_url !== "string")
          return res
            .status(400)
            .json({ message: "team name and logo url must be string" });
        if (
          typeof team_points !== "number" ||
          typeof goals_scored !== "number" ||
          typeof goals_conceded !== "number" ||
          typeof team_wins !== "number" ||
          typeof team_draws !== "number" ||
          typeof team_losses !== "number"
        )
          return res.status(400).json({
            message:
              "team points, goals scored, goals conceded, team wins, team draws, team losses must be number",
          });
        const result = await db.collection("teams").insertOne({
          team_name,
          logo_url,
          team_points,
          goals_scored,
          goals_conceded,
          team_wins,
          team_draws,
          team_losses,
        });
        res.status(201).json({
          message: "Created team successfully",
          id: result.insertedId,
        });
      } catch (error) {
        console.error("Error add team: ", error);
        res.status(500).json({ message: "Failed to add a team" });
      }
    });
    //API PUT 1 team
    app.put("/api/teams/:id", authenticateToken, async (req, res) => {
      const {
        team_name,
        logo_url,
        team_points,
        goals_scored,
        goals_conceded,
        team_wins,
        team_draws,
        team_losses,
      } = req.body;
      try {
        if (
          !team_name ||
          !logo_url ||
          !team_points ||
          !goals_scored ||
          !goals_conceded ||
          !team_wins ||
          !team_draws ||
          !team_losses
        )
          return res.status(400).json({ message: "All fields are required" });
        if (typeof team_name !== "string" || typeof logo_url !== "string")
          return res
            .status(400)
            .json({ message: "team name and logo url must be string" });
        if (
          typeof team_points !== "number" ||
          typeof goals_scored !== "number" ||
          typeof goals_conceded !== "number" ||
          typeof team_wins !== "number" ||
          typeof team_draws !== "number" ||
          typeof team_losses !== "number"
        )
          return res.status(400).json({
            message:
              "team points, goals scored, goals conceded, team wins, team draws, team losses must be number",
          });
        const team_id = new ObjectId(req.params.id);
        const existingTeam = await db
          .collection("teams")
          .findOne({ _id: team_id });
        if (!existingTeam) {
          return res
            .status(404)
            .json({ message: "Team not found before update" });
        }
        const result = await db.collection("teams").findOneAndUpdate(
          {
            _id: team_id,
          },
          {
            $set: {
              team_name,
              logo_url,
              team_points,
              goals_scored,
              goals_conceded,
              team_wins,
              team_draws,
              team_losses,
            },
          },
          { returnDocument: "after" }
        );
        console.log("Update result:", result);
        console.log(result);
        console.log("Team ID being updated:", team_id);
        if (!result) return res.status(404).json({ message: "Team not found" });
        res.json(result.value);
      } catch (error) {
        console.error("Error update team: ", error);
        res.status(500).json({ message: "Failed to update a team" });
      }
    });
    //API tao mua giai
    app.post("/api/seasons", authenticateToken, async (req, res) => {
      const { season_name, start_date, end_date, status } = req.body;
      try {
        if (!season_name || !start_date || !end_date || !status)
          return res.status(400).json({ message: "All fields are required" });
        if (typeof season_name !== "string" || typeof status !== "string")
          return res
            .status(400)
            .json({ message: "Season name and status must be string" });
        if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date)))
          return res.status(400).json({ message: "Invalid date format" });
        const result = await db.collection("seasons").insertOne({
          season_name,
          start_date,
          end_date,
          status,
        });
        res.status(201).json({
          message: "Created season successfully",
          id: result.insertedId,
        });
      } catch (error) {
        console.error("Error add season: ", error);
        res.status(500).json({ message: "Failed to add a season" });
      }
    });
    //API cap nhat mua giai
    app.put("/api/seasons/:id", authenticateToken, async (req, res) => {
      const { season_name, start_date, end_date, status } = req.body;
      try {
        if (!season_name || !start_date || !end_date || !status) {
          return res.status(400).json({ message: "All fields are required" });
        }

        if (typeof season_name !== "string" || typeof status !== "string") {
          return res
            .status(400)
            .json({ message: "Season name and status must be string" });
        }

        if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
          return res.status(400).json({ message: "Invalid date format" });
        }

        if (Date.parse(start_date) > Date.parse(end_date)) {
          return res
            .status(400)
            .json({ message: "Start date must be before end date" });
        }

        const season_id = new ObjectId(req.params.id);

        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: "Invalid season ID" });
        }

        // Logging data before updating
        console.log("Updating season with ID:", season_id);
        console.log("Data to update:", {
          season_name,
          start_date,
          end_date,
          status,
        });

        const result = await db
          .collection("seasons")
          .findOneAndUpdate(
            { _id: season_id },
            { $set: { season_name, start_date, end_date, status } },
            { returnDocument: "after" }
          );

        // If no result was found, return 404
        if (!result) {
          return res.status(404).json({ message: "Season not found" });
        }

        // Logging successful update
        console.log("Updated season:", result.value);
        res.json(result.value); // Make sure to send response back
      } catch (error) {
        console.error("Error updating season:", error);
        res.status(500).json({ message: "Failed to update a season" });
      }
    });
    //API xóa mùa giải
    app.delete("/api/seasons/:id", authenticateToken, async (req, res) => {
      const season_id = new ObjectId(req.params.id);
      try {
        const isSeasonExist = await db.collection("seasons").findOne({
          _id: season_id,
        });
        if (!isSeasonExist)
          return res.status(404).json({ message: "Season not found" });
        const result = await db
          .collection("seasons")
          .findOneAndDelete({ _id: season_id });
        console.log("Updated season:", result);
        return res.status(204).send();
      } catch (error) {
        console.error("Error deleting season:", error);
        res.status(500).json({ message: "Failed to delete a season" });
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
