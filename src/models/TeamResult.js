const mongoose = require("mongoose");

const teamResultSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    matchplayed: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    goalsFor: {
      type: Number,
      default: 0,
    },
    goalsAgainst: {
      type: Number,
      default: 0,
    },
    goalsDifference: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    goalsForAway: {
      type: Number,
      default: 0,
    },
    headToHeadPoints: {
      type: Map,
      of: Number,
      default: {},
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const TeamResult = mongoose.model("TeamResult", teamResultSchema);
module.exports = TeamResult;
