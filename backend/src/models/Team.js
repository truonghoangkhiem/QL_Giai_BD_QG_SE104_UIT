import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    team_name: {
      type: String,
      required: true,
    },
    stadium: {
      type: String,
      required: true,
    },
    coach: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Team = mongoose.model("Team", teamSchema);

export default Team;
