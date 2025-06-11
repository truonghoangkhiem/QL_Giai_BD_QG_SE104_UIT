import mongoose from "mongoose";

const regulationSchema = new mongoose.Schema(
  {
    season_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    regulation_name: {
      type: String,
      required: true,
    },
    rules: {
      type: Object, // Lưu trữ cấu trúc rules linh hoạt
      required: true,
    },
  },
  { timestamps: true }
);

const Regulation = mongoose.model("Regulation", regulationSchema);

export default Regulation;
