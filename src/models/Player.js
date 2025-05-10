import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    name: { type: String, required: true },
    dob: { type: Date, required: true },
    nationality: { type: String, required: true },
    position: { type: String, required: true },
    isForeigner: { type: Boolean, default: false },
    number: { type: String, required: true },
  },
  { timestamps: true }
);

const Player = mongoose.model("Player", playerSchema);

export default Player;
