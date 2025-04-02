const { z } = require("zod");
const mongoose = require("mongoose");

const CreatePlayerRankingSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  player_results_id: z
    .string()
    .min(1, "Player Results ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_results_id",
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

const PlayerRankingIdSchema = z.object({
  id: z
    .string()
    .min(1, "Player Ranking ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid player_ranking_id",
    }),
});

const GetPlayerRankingsBySeasonIdAndDateSchema = z.object({
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

module.exports = {
  CreatePlayerRankingSchema,
  MatchIdSchema,
  PlayerRankingIdSchema,
  GetPlayerRankingsBySeasonIdAndDateSchema,
};
