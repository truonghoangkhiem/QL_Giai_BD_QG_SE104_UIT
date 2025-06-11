import { z } from "zod";
import mongoose from "mongoose";

const CreateSeasonSchema = z
  .object({
    season_name: z.string().min(1, "Season name is required"),
    start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date format",
    }),
    end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    }),
    status: z.boolean().default(true),
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "Start date must be before end date",
    path: ["start_date"],
  });

const UpdateSeasonSchema = z
  .object({
    season_name: z.string().min(1, "Season name is required"),
    start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date format",
    }),
    end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    }),
    status: z.boolean().default(true),
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "Start date must be before end date",
    path: ["start_date"],
  });

const SeasonIdSchema = z.object({
  id: z
    .string()
    .min(1, "Season ID is required")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid season_id",
    }),
});

const SeasonNameSchema = z.object({
  season_name: z.string().min(1, "Season name is required"),
});

export {
  CreateSeasonSchema,
  UpdateSeasonSchema,
  SeasonIdSchema,
  SeasonNameSchema,
};
