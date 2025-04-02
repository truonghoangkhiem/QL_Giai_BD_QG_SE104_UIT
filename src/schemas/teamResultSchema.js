const { z } = require("zod");
const mongoose = require("mongoose");

const CreateTeamResultSchema = z.object({
  team_id: z
    .string()
    .min(1, "Team ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_id",
    }),
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
});

const SeasonIdSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
});

const TeamResultIdSchema = z.object({
  id: z
    .string()
    .min(1, "Team Result ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid id",
    }),
});

const GetIdSchema = z.object({
  team_id: z
    .string()
    .min(1, "Team ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_id",
    }),
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
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

module.exports = {
  CreateTeamResultSchema,
  SeasonIdSchema,
  TeamResultIdSchema,
  GetIdSchema,
  MatchIdSchema,
};
