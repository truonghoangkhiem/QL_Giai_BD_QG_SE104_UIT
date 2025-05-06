import { z } from "zod";
import mongoose from "mongoose";

const CreateRankingSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  team_result_id: z
    .string()
    .min(1, "Team Result ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_result_id",
    }),
});

const SeasonIdSchema = z.object({
  seasonid: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
});

const UpdateRankingSchema = z.object({
  seasonid: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  match_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid match_date format",
  }),
});

const RankingIdSchema = z.object({
  id: z
    .string()
    .min(1, "Ranking ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid ranking_id",
    }),
});

export {
  CreateRankingSchema,
  SeasonIdSchema,
  UpdateRankingSchema,
  RankingIdSchema,
};
