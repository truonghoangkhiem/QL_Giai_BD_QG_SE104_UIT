import { z } from "zod";
import mongoose from "mongoose";

// Danh sách các quy định hợp lệ
const VALID_REGULATIONS = {
  "Age Regulation": [
    "minAge",
    "maxAge",
    "minPlayersPerTeam",
    "maxPlayersPerTeam",
    "maxForeignPlayers",
  ],
  "Match Rules": ["matchRounds", "homeTeamRule"],
  "Goal Rules": ["goalTypes", "goalTimeLimit"],
  "Ranking Rules": ["winPoints", "drawPoints", "losePoints", "rankingCriteria"],
};

// Schema cho tạo regulation
const CreateRegulationSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  regulation_name: z.enum(Object.keys(VALID_REGULATIONS), {
    errorMap: () => ({ message: "Invalid regulation_name" }),
  }),
  rules: z.any(), // Sẽ validate chi tiết trong hàm
});

// Schema cho cập nhật regulation
const UpdateRegulationSchema = z.object({
  rules: z.any(), // Sẽ validate chi tiết trong hàm
});

// Schema cho lấy regulation theo id
const RegulationIdSchema = z.object({
  id: z
    .string()
    .min(1, "Regulation ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid regulation_id",
    }),
});

// Schema cho lấy regulation theo season_id và regulation_name
const GetIdRegulationsSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  regulation_name: z.enum(Object.keys(VALID_REGULATIONS), {
    errorMap: () => ({ message: "Invalid regulation_name" }),
  }),
});

export {
  CreateRegulationSchema,
  UpdateRegulationSchema,
  RegulationIdSchema,
  GetIdRegulationsSchema,
  VALID_REGULATIONS,
};
