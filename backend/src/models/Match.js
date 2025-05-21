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
    score: {
      type: String,
      required: false, // Không bắt buộc phải có score ngay khi tạo
      default: null, // Giá trị mặc định là null
      validate: {
        validator: function (v) {
          // Cho phép null, rỗng, hoặc định dạng "số-số"
          return v === null || v === '' || /^\d+-\d+$/.test(v);
        },
        message: props => `${props.value} is not a valid score format (null, empty, or number-number)!`
      }
    },
    goalDetails: { type: [goalDetailSchema], default: [] },
    participatingPlayersTeam1: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }],
    participatingPlayersTeam2: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }],
  },
  { timestamps: true }
);

const Match = mongoose.model("Match", matchSchema);

export default Match;