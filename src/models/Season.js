import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema(
  {
    season_name: {
      type: String,
      required: true,
      unique: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Season = mongoose.model("Season", seasonSchema);

export default Season;
