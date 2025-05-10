import mongoose from "mongoose";

const playerRankingSchema = new mongoose.Schema(
  {
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    player_results_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlayerResult",
      required: true,
    },
    player_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    rank: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const PlayerRanking = mongoose.model("PlayerRanking", playerRankingSchema);

export default PlayerRanking;
