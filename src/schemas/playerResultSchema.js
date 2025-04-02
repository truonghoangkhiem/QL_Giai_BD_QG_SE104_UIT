const { z } = require("zod");

const mongoose = require("mongoose");

const CreatePlayerResultSchema = z.object({
  player_id: z
    .string()
    .min(1, "Player ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_id",
    }),
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  team_id: z
    .string()
    .min(1, "Team ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_id",
    }),
});

const GetPlayerResultBySeasonIdAndDateSchema = z.object({
  seasonid: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

const PlayerIdSchema = z.object({
  playerid: z
    .string()
    .min(1, "Player ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_id",
    }),
});

const MatchIdSchema = z.object({
  matchid: z
    .string()
    .min(1, "Match ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid match_id",
    }),
});

const UpdatePlayerResultSchema = z.object({
  season_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  player_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_id",
    }),
  team_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_id",
    }),
  matchesplayed: z.number().optional(),
  totalGoals: z.number().optional(),
  assists: z.number().optional(),
  yellowCards: z.number().optional(),
  redCards: z.number().optional(),
  date: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
});

const PlayerResultIdSchema = z.object({
  id: z
    .string()
    .min(1, "Player Result ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_result_id",
    }),
});

module.exports = {
  CreatePlayerResultSchema,
  GetPlayerResultBySeasonIdAndDateSchema,
  PlayerIdSchema,
  MatchIdSchema,
  UpdatePlayerResultSchema,
  PlayerResultIdSchema,
};
