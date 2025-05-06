import { z } from "zod";

const createPlayerSchema = z.object({
  team_id: z.string().length(24, "Invalid team_id format"),
  name: z.string().min(1, "Name is required"),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  nationality: z.string().min(1, "Nationality is required"),
  position: z.string().min(1, "Position is required"),
  isForeigner: z.boolean(),
  number: z.string().min(1, "Number is required"),
});

const updatePlayerSchema = z.object({
  team_id: z.string().length(24).optional(),
  name: z.string().optional(),
  dob: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional(),
  nationality: z.string().optional(),
  position: z.string().optional(),
  isForeigner: z.boolean().optional(),
  number: z.string().optional(),
});

const getPlayerByNameAndNumberSchema = z.object({
  name_player: z.string().min(1, "Name is required"),
  number: z.string().min(1, "Number is required"),
});

export {
  createPlayerSchema,
  updatePlayerSchema,
  getPlayerByNameAndNumberSchema,
};
