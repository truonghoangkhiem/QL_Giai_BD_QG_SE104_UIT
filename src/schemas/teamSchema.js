const { z } = require("zod");
const mongoose = require("mongoose");

const CreateTeamSchema = z.object({
  season_id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
  team_name: z.string().min(1, "Team name is required"),
  stadium: z.string().min(1, "Stadium is required"),
  coach: z.string().min(1, "Coach is required"),
  logo: z.string().min(1, "Logo is required"),
});

const UpdateTeamSchema = z.object({
  team_name: z.string().min(1, "Team name is required").optional(),
  stadium: z.string().min(1, "Stadium is required").optional(),
  coach: z.string().min(1, "Coach is required").optional(),
  logo: z.string().min(1, "Logo is required").optional(),
});

const TeamIdSchema = z.object({
  id: z
    .string()
    .min(1, "Team ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid team_id",
    }),
});

const NameTeamSchema = z.object({
  team_name: z.string().min(1, "Team name is required"),
});


module.exports = {
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamIdSchema,
  NameTeamSchema,
};
