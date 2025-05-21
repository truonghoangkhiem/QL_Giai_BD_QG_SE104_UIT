import { z } from "zod";

const goalDetailSchema = z.object({
  player_id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid player ID format",
  }),
  team_id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid team ID format", // Đây là ID của đội được hưởng bàn thắng
  }),
  minute: z.number().int().min(0, "Minute cannot be negative"),
  goalType: z.string().min(1, "Goal type is required"),
});

export const createMatchSchema = z.object({
  season_id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid season ID format",
  }),
  matchperday: z.number().int().min(1, "Matches per day must be at least 1"),
});

export const updateMatchSchema = z.object({
  date: z.coerce.date().optional(), 
  stadium: z.string().min(1, "Stadium is required").optional(),
  score: z.union([
    z.string().regex(/^\d+-\d+$/, "Score must be in format number-number (e.g., 2-1)").optional(),
    z.literal('').optional(), 
    z.null().optional()      
  ]).optional(),
  goalDetails: z.array(goalDetailSchema).optional(),
  participatingPlayersTeam1: z.array(z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid player ID format in participatingPlayersTeam1",
  })).optional(),
  participatingPlayersTeam2: z.array(z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid player ID format in participatingPlayersTeam2",
  })).optional(),
});

export const MatchIdSchema = z.object({
  id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid match ID format",
  }),
});