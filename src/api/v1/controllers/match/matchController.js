import Match from "../../../../models/Match.js";
import Season from "../../../../models/Season.js";
import Team from "../../../../models/Team.js";
import Regulation from "../../../../models/Regulation.js";
import {
  createMatchSchema,
  updateMatchSchema,
} from "../../../../schemas/matchSchema.js";
import { TeamIdSchema } from "../../../../schemas/teamSchema.js";
import { SeasonIdSchema } from "../../../../schemas/seasonSchema.js";
import { successResponse } from "../../../../utils/responseFormat.js";
import mongoose from "mongoose";

// GET all matches
const getMatches = async (req, res, next) => {
  try {
    const matches = await Match.find().populate("team1 team2 season_id");
    return successResponse(res, matches, "Fetched all matches successfully");
  } catch (error) {
    return next(error);
  }
};

// GET match by ID
const getMatchesById = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id).populate(
      "team1 team2 season_id"
    );
    if (!match) {
      return next(Object.assign(new Error("Match not found"), { status: 404 }));
    }
    return successResponse(res, match, "Match found successfully");
  } catch (error) {
    return next(error);
  }
};

// CREATE match schedule
const createMatch = async (req, res, next) => {
  const parseResult = createMatchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }

  const { season_id, matchperday } = parseResult.data;

  try {
    const season = await Season.findById(season_id);
    if (!season)
      return next(
        Object.assign(new Error("Season not found"), { status: 404 })
      );

    const teams = await Team.find({ season_id });
    if (teams.length < 2)
      return next(
        Object.assign(new Error("Not enough teams for a match"), {
          status: 400,
        })
      );

    const schedule = [];
    const matchPerDayTracker = {};
    const teamsPlayedInDay = {};

    const getNextAvailableDate = (currentDate, team1, team2) => {
      let newDate = new Date(currentDate);
      while (
        matchPerDayTracker[newDate.toDateString()] >= matchperday ||
        teamsPlayedInDay[newDate.toDateString()]?.has(team1._id.toString()) ||
        teamsPlayedInDay[newDate.toDateString()]?.has(team2._id.toString())
      ) {
        newDate.setDate(newDate.getDate() + 1);
        if (newDate > new Date(season.end_date)) return null;
      }
      return newDate;
    };

    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i === j) continue;
        const team1 = teams[i];
        const team2 = teams[j];
        const matchDate = getNextAvailableDate(
          new Date(season.start_date),
          team1,
          team2
        );
        if (!matchDate)
          return next(
            Object.assign(new Error("Not enough time for match"), {
              status: 400,
            })
          );

        schedule.push({
          season_id,
          team1: team1._id,
          team2: team2._id,
          date: matchDate,
          stadium: team1.stadium,
          score: "0-0",
          goalDetails: [],
        });

        if (!teamsPlayedInDay[matchDate.toDateString()])
          teamsPlayedInDay[matchDate.toDateString()] = new Set();
        teamsPlayedInDay[matchDate.toDateString()].add(team1._id.toString());
        teamsPlayedInDay[matchDate.toDateString()].add(team2._id.toString());

        matchPerDayTracker[matchDate.toDateString()] =
          (matchPerDayTracker[matchDate.toDateString()] || 0) + 1;
      }
    }

    await Match.insertMany(schedule);
    return successResponse(res, null, "Created match successfully", 201);
  } catch (error) {
    return next(error);
  }
};

// GET matches by season
const getMatchesBySeasonId = async (req, res, next) => {
  const season_id = req.params.season_id;
  const { success, error } = SeasonIdSchema.safeParse({ id: season_id });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }

  try {
    let SeasonId = new mongoose.Types.ObjectId(season_id);

    // Sử dụng aggregate để join dữ liệu từ collection teams
    const matches = await Match.aggregate([
      // Lọc các trận đấu theo season_id
      { $match: { season_id: SeasonId } },
      // Join với collection teams cho team1
      {
        $lookup: {
          from: 'teams', // Tên collection teams trong MongoDB (thường là lowercase)
          localField: 'team1', // Trường team1 trong matches (ObjectId)
          foreignField: '_id', // Trường _id trong teams
          as: 'team1_data', // Tên mảng chứa dữ liệu team1
        },
      },
      // Join với collection teams cho team2
      {
        $lookup: {
          from: 'teams',
          localField: 'team2',
          foreignField: '_id',
          as: 'team2_data',
        },
      },
      // Unwind để biến mảng team1_data và team2_data thành object
      { $unwind: { path: '$team1_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$team2_data', preserveNullAndEmptyArrays: true } },
      // Định dạng dữ liệu trả về
      {
        $project: {
          id: '$_id', // Đổi _id thành id để đồng bộ với frontend
          season_id: 1,
          team1: {
            team_name: { $ifNull: ['$team1_data.team_name', 'N/A'] },
            logo: { $ifNull: ['$team1_data.logo', 'https://placehold.co/20x20?text=Team'] },
          },
          team2: {
            team_name: { $ifNull: ['$team2_data.team_name', 'N/A'] },
            logo: { $ifNull: ['$team2_data.logo', 'https://placehold.co/20x20?text=Team'] },
          },
          date: 1,
          stadium: 1,
          score: 1,
          _id: 0, // Loại bỏ trường _id gốc
        },
      },
      // Sắp xếp theo ngày tăng dần (tùy chọn, nếu bạn muốn làm ở backend)
      { $sort: { date: 1 } },
    ]);

    if (!matches || matches.length === 0) {
      return next(
        Object.assign(new Error('No matches found for this season'), {
          status: 404,
        })
      );
    }

    return successResponse(
      res,
      matches,
      'Fetched all matches by season ID successfully'
    );
  } catch (error) {
    return next(error);
  }
};

// UPDATE match
const updateMatch = async (req, res, next) => {
  const parseResult = updateMatchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      Object.assign(new Error(parseResult.error.errors[0].message), {
        status: 400,
      })
    );
  }

  try {
    const match = await Match.findById(req.params.id);
    if (!match)
      return next(Object.assign(new Error("Match not found"), { status: 404 }));

    const updateFields = parseResult.data;

    if (updateFields.goalDetails) {
      const regulation = await Regulation.findOne({
        season_id: match.season_id,
        regulation_name: "Goal Rules",
      });
      const maxTime = regulation?.rules?.goalTimeLimit?.maxMinute;
      const allowedTypes = regulation?.rules?.goalTypes || [];

      for (const goal of updateFields.goalDetails) {
        if (goal.minute > maxTime) {
          return next(
            Object.assign(new Error("Goal minute exceeds regulation limit"), {
              status: 400,
            })
          );
        }
        if (!allowedTypes.includes(goal.goalType)) {
          return next(
            Object.assign(new Error("Invalid goal type"), { status: 400 })
          );
        }
      }
    }

    await Match.updateOne({ _id: req.params.id }, { $set: updateFields });
    return successResponse(res, null, "Updated match successfully");
  } catch (error) {
    return next(error);
  }
};

// DELETE match
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match)
      return next(Object.assign(new Error("Match not found"), { status: 404 }));

    await Match.deleteOne({ _id: req.params.id });
    return successResponse(res, null, "Deleted match successfully", 204);
  } catch (error) {
    return next(error);
  }
};

const getMatchesByTeamId = async (req, res, next) => {
  const team_id = req.params.team_id;
  console.log(team_id);
  const { success, error } = TeamIdSchema.safeParse({ id: team_id });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }
  try {
    TeamId = new mongoose.Types.ObjectId(team_id);
    const matches = await Match.find({
      $or: [{ team1: TeamId }, { team2: TeamId }],
    }).populate("team1 team2 season_id");
    if (!matches) {
      return next(Object.assign(new Error("Match not found"), { status: 404 }));
    }
    return successResponse(res, matches, "Match found successfully");
  } catch (error) {
    return next(error);
  }
};

const getMatchesBySeasonIdAndDate = async (req, res, next) => {
  const { season_id, date } = req.params;

  const { success, error } = SeasonIdSchema.safeParse({ id: season_id });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }

  try {
    // Chuyển season_id thành ObjectId
    const SeasonId = new mongoose.Types.ObjectId(season_id);

    // Chuyển date thành đối tượng Date
    const matchDate = new Date(date); // Giả sử date là chuỗi kiểu 'YYYY-MM-DD'

    // Kiểm tra nếu date không hợp lệ
    if (isNaN(matchDate.getTime())) {
      return next(
        Object.assign(new Error("Invalid date format"), { status: 400 })
      );
    }

    // Lọc các trận đấu trong ngày
    const startOfDay = new Date(matchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(matchDate.setHours(23, 59, 59, 999));

    // Truy vấn tìm các trận đấu trong khoảng thời gian ngày đó
    const matches = await Match.find({
      season_id: SeasonId,
      date: { $gte: startOfDay, $lte: endOfDay }, // Lọc theo ngày
    }).populate("team1 team2 season_id");

    if (!matches || matches.length === 0) {
      return next(
        Object.assign(new Error("No matches found for this season and date"), {
          status: 404,
        })
      );
    }

    return successResponse(
      res,
      matches,
      "Fetched all matches by season ID and date successfully"
    );
  } catch (error) {
    return next(error);
  }
};

export {
  getMatches,
  getMatchesById,
  createMatch,
  getMatchesBySeasonId,
  updateMatch,
  deleteMatch,
  getMatchesByTeamId,
  getMatchesBySeasonIdAndDate,
};
