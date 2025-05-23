import mongoose from "mongoose";

const lineupPlayerSchema = new mongoose.Schema(
  {
    player_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    position: {
      type: String, // e.g., GK, DF, MF, FW, SUB
      required: true,
    },
    jersey_number: { // Store jersey number for this specific match/lineup
        type: String,
        required: true,
    }
  },
  { _id: false }
);

const matchLineupSchema = new mongoose.Schema(
  {
    match_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
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
    players: {
      type: [lineupPlayerSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

matchLineupSchema.index({ match_id: 1, team_id: 1 }, { unique: true });


const MatchLineup = mongoose.model("MatchLineup", matchLineupSchema);

export default MatchLineup; // Đảm bảo dòng này tồn tại và chính xác