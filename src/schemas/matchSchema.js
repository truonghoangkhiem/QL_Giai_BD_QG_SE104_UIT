import { z } from "zod";

const goalDetailSchema = z.object({
  player_id: z.string().length(24, "Invalid player_id format"),
  team_id: z.string().length(24, "Invalid team_id format"),
  minute: z.number().int().nonnegative("Minute must be non-negative"),
  goalType: z.string(),
});

const createMatchSchema = z.object({
  season_id: z.string().length(24, "Invalid season_id format"),
  matchperday: z
    .number()
    .int()
    .positive("Match per day must be a positive number"),
});

const updateMatchSchema = z.object({
  team1: z.string().length(24).optional(),
  team2: z.string().length(24).optional(),
  date: z.coerce.date().optional(),
  stadium: z.string().optional(),
  score: z
    .string()
    .regex(/^[0-9]+-[0-9]+$/, "Score must be in format x-y")
    .optional(),
  goalDetails: z.array(goalDetailSchema).optional(),
});

export { createMatchSchema, updateMatchSchema };
