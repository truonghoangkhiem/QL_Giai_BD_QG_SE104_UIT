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
    if (!season) {
      return next(
        Object.assign(new Error("Season not found"), { status: 404 })
      );
    }

    const teamsInSeason = await Team.find({ season_id });
    if (teamsInSeason.length < 2) {
      return next(
        Object.assign(new Error("Not enough teams for a match schedule (minimum 2 teams required)."), {
          status: 400,
        })
      );
    }

    const matchRegulation = await Regulation.findOne({
      season_id: season_id,
      regulation_name: "Match Rules",
    });

    let actualMatchRounds = 2; // Default to 2 rounds (home and away)
    if (matchRegulation && typeof matchRegulation.rules?.matchRounds === 'number' && matchRegulation.rules.matchRounds > 0) {
      actualMatchRounds = matchRegulation.rules.matchRounds;
    } else {
      console.warn(`Match Rules regulation not found or 'matchRounds' not specified/invalid for season ${season_id}. Defaulting to ${actualMatchRounds} rounds.`);
    }
     if (actualMatchRounds <= 0) {
        return next(Object.assign(new Error("Match rounds from regulation must be a positive number."), { status: 400 }));
    }

    const schedule = [];
    const dailyMatchCount = {}; 
    const teamPlayedOnDate = {}; 
    
    let scheduleStartDate = new Date(season.start_date);
    scheduleStartDate.setUTCHours(0, 0, 0, 0);
    const seasonEndDate = new Date(season.end_date);
    seasonEndDate.setUTCHours(0, 0, 0, 0);

    // Generate all possible pairings
    const allPairings = [];
    if (actualMatchRounds === 1) {
        for (let i = 0; i < teamsInSeason.length; i++) {
            for (let j = i + 1; j < teamsInSeason.length; j++) {
                // For single round-robin, team with lower index can be home, or alternate
                // Here, teamsInSeason[i] is home
                allPairings.push({ homeTeam: teamsInSeason[i], awayTeam: teamsInSeason[j] });
            }
        }
    } else { // Defaulting to double round-robin for actualMatchRounds >= 2
        for (let i = 0; i < teamsInSeason.length; i++) {
            for (let j = 0; j < teamsInSeason.length; j++) {
                if (i === j) continue;
                allPairings.push({ homeTeam: teamsInSeason[i], awayTeam: teamsInSeason[j] });
            }
        }
        // If actualMatchRounds > 2, the current logic generates N*(N-1) pairings.
        // To support more than 2 rounds correctly, this pairing generation would need to be more sophisticated
        // or the interpretation of 'actualMatchRounds' would imply repeating this N*(N-1) set.
        // For this fix, we assume actualMatchRounds=2 means standard home-and-away.
        if (actualMatchRounds > 2) {
            console.warn(`Current scheduling logic for actualMatchRounds > 2 (value: ${actualMatchRounds}) will effectively create a standard double round-robin schedule. For more complex multi-round schedules, the pairing generation needs to be enhanced.`);
        }
    }
    
    // Shuffle pairings for better distribution
    for (let i = allPairings.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPairings[i], allPairings[j]] = [allPairings[j], allPairings[i]];
    }

    let currentSchedulingDateAttempt = new Date(scheduleStartDate);

    for (const pairing of allPairings) {
        const homeTeam = pairing.homeTeam;
        const awayTeam = pairing.awayTeam;
        let scheduledMatchDate = null;
        let searchDate = new Date(currentSchedulingDateAttempt); 

        while (searchDate <= seasonEndDate) {
            const dateString = searchDate.toISOString().split('T')[0];
            const matchesTodayCount = dailyMatchCount[dateString] || 0;
            const teamsPlayingToday = teamPlayedOnDate[dateString] || new Set();

            if (matchesTodayCount < matchperday &&
                !teamsPlayingToday.has(homeTeam._id.toString()) &&
                !teamsPlayingToday.has(awayTeam._id.toString())) {
                
                scheduledMatchDate = new Date(searchDate);
                
                schedule.push({
                    season_id,
                    team1: homeTeam._id, 
                    team2: awayTeam._id, 
                    date: scheduledMatchDate,
                    stadium: homeTeam.stadium, 
                    score: null,
                    goalDetails: [],
                });

                dailyMatchCount[dateString] = matchesTodayCount + 1;
                if (!teamPlayedOnDate[dateString]) teamPlayedOnDate[dateString] = new Set();
                teamPlayedOnDate[dateString].add(homeTeam._id.toString());
                teamPlayedOnDate[dateString].add(awayTeam._id.toString());
                
                // Advance currentSchedulingDateAttempt intelligently
                if ((dailyMatchCount[dateString] || 0) >= matchperday) {
                     // If current day is full, next attempt starts from next day
                     currentSchedulingDateAttempt = new Date(searchDate);
                     currentSchedulingDateAttempt.setDate(currentSchedulingDateAttempt.getDate() + 1);
                } else {
                    // If current day still has slots, next attempt can start from the same day
                    currentSchedulingDateAttempt = new Date(searchDate); 
                }
                break; 
            }
            searchDate.setDate(searchDate.getDate() + 1);
        }

        if (!scheduledMatchDate) {
            console.warn(`Could not schedule match for ${homeTeam.team_name} (H) vs ${awayTeam.team_name} (A). Constraints (season end: ${seasonEndDate.toISOString().split('T')[0]}, matchperday: ${matchperday}, team availability on searchDate: ${searchDate.toISOString().split('T')[0]}) might be too tight or all slots filled.`);
        }
    }
    
    const expectedTotalMatches = actualMatchRounds === 1 
                             ? teamsInSeason.length * (teamsInSeason.length - 1) / 2 
                             : teamsInSeason.length * (teamsInSeason.length - 1);

    if (schedule.length === 0 && teamsInSeason.length >=2 && allPairings.length > 0) {
         return next(
            Object.assign(new Error(`Failed to generate any matches. Expected ${expectedTotalMatches}. Please check season duration (ends ${seasonEndDate.toISOString().split('T')[0]}), matches per day (${matchperday}), and team availability.`), { status: 400 })
        );
    }
    
    let responseMessage = `Created ${schedule.length} matches successfully.`;
    let responseData = { createdMatchesCount: schedule.length, schedule };

    if (schedule.length < expectedTotalMatches) {
         const warning = `Warning: Only ${schedule.length} out of ${expectedTotalMatches} expected matches could be scheduled. Constraints (season end: ${seasonEndDate.toISOString().split('T')[0]}, matchperday: ${matchperday}, team availability) might be too tight or all available slots have been filled.`;
         console.warn(warning);
         responseMessage = `Created ${schedule.length} matches with warnings. Expected ${expectedTotalMatches}.`;
         responseData.warning = warning;
    }

    if (schedule.length > 0) {
        await Match.insertMany(schedule);
    }
    return successResponse(res, responseData, responseMessage, 201);

  } catch (error) {
    console.error("Error in createMatch:", error);
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

    const matches = await Match.aggregate([
      { $match: { season_id: SeasonId } },
      { $lookup: { from: 'teams', localField: 'team1', foreignField: '_id', as: 'team1_data'} },
      { $lookup: { from: 'teams', localField: 'team2', foreignField: '_id', as: 'team2_data'} },
      { $unwind: { path: '$team1_data', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$team2_data', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: '$_id',
          season_id: 1,
          team1: { _id: '$team1_data._id', team_name: { $ifNull: ['$team1_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team1_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          team2: { _id: '$team2_data._id', team_name: { $ifNull: ['$team2_data.team_name', 'N/A'] }, logo: { $ifNull: ['$team2_data.logo', 'https://placehold.co/20x20?text=Team'] }},
          date: 1, stadium: 1, score: 1, goalDetails: 1, _id: 0, 
        },
      },
      { $sort: { date: 1 } },
    ]);

    if (!matches || matches.length === 0) {
      return successResponse(res, [], "No matches found for this season");
    }

    return successResponse(res, matches, 'Fetched all matches by season ID successfully');
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

    if (updateFields.score === '' || updateFields.score === undefined) {
        updateFields.score = null;
    }

    if (updateFields.goalDetails && updateFields.score && /^\d+-\d+$/.test(updateFields.score)) {
      const regulation = await Regulation.findOne({
        season_id: match.season_id,
        regulation_name: "Goal Rules",
      });
      const maxTime = regulation?.rules?.goalTimeLimit?.maxMinute;
      const allowedTypes = regulation?.rules?.goalTypes || [];

      for (const goal of updateFields.goalDetails) {
        if (maxTime !== undefined && goal.minute > maxTime) {
          return next( Object.assign(new Error("Goal minute exceeds regulation limit"), { status: 400 }) );
        }
        if (allowedTypes.length > 0 && !allowedTypes.includes(goal.goalType)) {
          return next( Object.assign(new Error("Invalid goal type"), { status: 400 }) );
        }
      }
    } else if (updateFields.score === null || updateFields.score === '') {
        updateFields.goalDetails = [];
    }

    await Match.updateOne({ _id: req.params.id }, { $set: updateFields });
    const updatedMatch = await Match.findById(req.params.id).populate("team1 team2 season_id");
    return successResponse(res, updatedMatch, "Updated match successfully");

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
  const { success, error } = TeamIdSchema.safeParse({ id: team_id });
  if (!success) {
    return next(
      Object.assign(new Error(error.errors[0].message), { status: 400 })
    );
  }
  try {
    const TeamId = new mongoose.Types.ObjectId(team_id);
    const matches = await Match.find({
      $or: [{ team1: TeamId }, { team2: TeamId }],
    }).populate("team1 team2 season_id");
    if (!matches || matches.length === 0) { 
      return successResponse(res, [], "No matches found for this team");
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
    const SeasonId = new mongoose.Types.ObjectId(season_id);
    const matchDate = new Date(date); 

    if (isNaN(matchDate.getTime())) {
      return next(
        Object.assign(new Error("Invalid date format"), { status: 400 })
      );
    }

    const startOfDay = new Date(matchDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(matchDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const matches = await Match.find({
      season_id: SeasonId,
      date: { $gte: startOfDay, $lte: endOfDay }, 
    }).populate("team1 team2 season_id");

    if (!matches || matches.length === 0) {
      return successResponse(res, [], "No matches found for this season and date");
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