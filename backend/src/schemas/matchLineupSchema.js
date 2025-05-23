import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

const lineupPlayerSchema = z.object({
  player_id: objectIdSchema,
  position: z.string().min(1, "Position is required"),
  jersey_number: z.string().min(1, "Jersey number is required"),
});

export const createOrUpdateMatchLineupSchema = z.object({
  match_id: objectIdSchema,
  team_id: objectIdSchema,
  season_id: objectIdSchema,
  players: z.array(lineupPlayerSchema)
    .min(1, "At least one player must be in the lineup")
    .max(25, "Cannot have more than 25 players in a lineup (adjust as needed)"),
});

export const MatchIdParamSchema = z.object({ // <<<<==== Đảm bảo dòng này được export
  match_id: objectIdSchema,
});

export const TeamIdParamSchema = z.object({ // <<<<==== Đảm bảo dòng này được export
  team_id: objectIdSchema,
});