import mongoose from "mongoose";

const goalDetailSchema = new mongoose.Schema(
  {
    player_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    minute: { type: Number, required: true },
    goalType: { type: String, required: true },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    date: { type: Date, required: true },
    stadium: { type: String, required: true },
    score: { type: String, required: true, default: "0-0" },
    goalDetails: { type: [goalDetailSchema], default: [] },
  },
  { timestamps: true }
);

const Match = mongoose.model("Match", matchSchema);

export default Match;
