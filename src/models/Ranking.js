const mongoose = require("mongoose");

const rankingSchema = new mongoose.Schema(
  {
    team_result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamResult",
      required: true,
    },
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
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

const Ranking = mongoose.model("Ranking", rankingSchema);
module.exports = Ranking;
