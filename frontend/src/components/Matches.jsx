// File: truonghoangkhiem/ql_giai_bd_qg_se104_uit/QL_Giai_BD_QG_SE104_UIT-ten-nhanh-moi/frontend/src/components/Matches.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CalendarIcon, MapPinIcon, XCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon, UsersIcon } from '@heroicons/react/24/outline';

const Matches = ({
  matches: propMatches,
  setMatches: setPropMatches,
  setEditingMatch = () => { },
  setShowForm = () => { },
  type = 'all',
  onPastMatchesFetched = () => { },
  token,
  seasonId: initialSeasonId,
  limit,
  hideDropdown = false,
}) => {
  const [localMatches, setLocalMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredTeamsForDropdown, setFilteredTeamsForDropdown] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 7;

  const [allPlayersMap, setAllPlayersMap] = useState({});

  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [matchLineups, setMatchLineups] = useState({ team1: null, team2: null });
  const [lineupLoading, setLineupLoading] = useState(false);
  const [lineupError, setLineupError] = useState('');

  // --- BẮT ĐẦU THAY ĐỔI ---
  // State để theo dõi ID của trận đấu đang bị xóa
  const [deletingId, setDeletingId] = useState(null);
  // --- KẾT THÚC THAY ĐỔI ---


  const matchesToDisplayState = propMatches !== undefined ? propMatches : localMatches;
  const setMatchesState = setPropMatches || setLocalMatches;

  const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain';

  const handleImageError = (e) => {
    e.target.src = defaultLogoUrl;
  };

  const isValidDateString = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  const formatDateToDisplay = (dateString) => {
    if (!isValidDateString(dateString)) return 'Chưa rõ';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeToDisplay = (dateString) => {
    if (!isValidDateString(dateString)) return 'N/A';
    const date = new Date(dateString);
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0 && !dateString.includes('T') && !dateString.includes(':')) {
      return "N/A";
    }
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/players');
        const playersData = response.data.data || [];
        const playerMap = playersData.reduce((acc, player) => {
          acc[player._id] = player;
          return acc;
        }, {});
        setAllPlayersMap(playerMap);
      } catch (err) {
        console.error('Lỗi lấy danh sách tất cả cầu thủ:', err);
      }
    };
    fetchAllPlayers();
  }, []);

  useEffect(() => {
    if (hideDropdown) return;
    const fetchSeasons = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/seasons');
        const seasonsData = response.data.data || [];
        setSeasons(seasonsData);
        if (!initialSeasonId && seasonsData.length > 0) {
          setSelectedSeasonId(seasonsData[0]._id);
        } else if (initialSeasonId) {
          setSelectedSeasonId(initialSeasonId);
        }
      } catch (err) {
        console.error('Lỗi lấy mùa giải:', err);
        setError('Không thể tải danh sách mùa giải');
      }
    };
    fetchSeasons();
  }, [hideDropdown, initialSeasonId]);

  useEffect(() => {
    if (hideDropdown) return;
    const fetchTeams = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/teams');
        setTeams(response.data.data || []);
      } catch (err) {
        console.error('Lỗi lấy đội bóng:', err);
      }
    };
    fetchTeams();
  }, [hideDropdown]);

  useEffect(() => {
    if (hideDropdown) return;
    if (selectedSeasonId) {
      const filtered = teams.filter((team) => team.season_id && (team.season_id._id || team.season_id).toString() === selectedSeasonId);
      setFilteredTeamsForDropdown(filtered);
      if (selectedTeamId && !filtered.some(t => t._id === selectedTeamId)) {
        setSelectedTeamId('');
      }
    } else {
      setFilteredTeamsForDropdown(teams);
    }
  }, [selectedSeasonId, teams, hideDropdown, selectedTeamId]);


  useEffect(() => {
    const fetchMatches = async () => {
      const seasonToFetch = selectedSeasonId || initialSeasonId;
      if (!seasonToFetch && !selectedTeamId && !selectedDate && !hideDropdown) {
        setMatchesState([]);
        setLoading(false);
        if (!hideDropdown) setError("Vui lòng chọn một mùa giải.");
        return;
      }
      setLoading(true);
      setError('');
      let url;
      if (selectedTeamId && seasonToFetch) {
        url = `http://localhost:5000/api/matches/teams/${selectedTeamId}`;
      } else if (selectedDate && seasonToFetch) {
        url = `http://localhost:5000/api/matches/seasons/${seasonToFetch}/${selectedDate}`;
      } else if (seasonToFetch) {
        url = `http://localhost:5000/api/matches/seasons/${seasonToFetch}`;
      } else if (!hideDropdown) {
        setMatchesState([]);
        setLoading(false);
        setError("Vui lòng chọn một mùa giải hoặc bộ lọc khác.");
        return;
      } else {
        if (!initialSeasonId) {
          setMatchesState([]);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await axios.get(url);
        let matchesData = response.data.data || [];
        if (selectedTeamId && seasonToFetch && url.includes(`/teams/${selectedTeamId}`)) {
          matchesData = matchesData.filter(match => match.season_id && (match.season_id._id || match.season_id).toString() === seasonToFetch);
        }
        setMatchesState(matchesData);
        if (type === 'home' && typeof onPastMatchesFetched === 'function') {
          const now = new Date();
          const pastAndPlayed = matchesData
            .filter((match) => {
              const matchDateTime = new Date(match.date);
              return matchDateTime <= now && (match.score !== null && match.score !== "" && /^\d+-\d+$/.test(match.score));
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit || 5);
          onPastMatchesFetched(pastAndPlayed);
        }
      } catch (err) {
        console.error('Lỗi lấy trận đấu:', err.response?.data || err.message);
        setMatchesState([]);
        if (err.response?.status === 404) {
          setError('Không có trận đấu nào phù hợp với lựa chọn của bạn.');
        } else {
          setError('Không thể tải danh sách trận đấu. Vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };

    if ((selectedSeasonId || initialSeasonId) || (!hideDropdown && (selectedDate || selectedTeamId))) {
      fetchMatches();
    } else if (!hideDropdown && seasons.length > 0 && !selectedSeasonId && !initialSeasonId) {
      setLoading(false);
      setMatchesState([]);
    } else if (!hideDropdown && seasons.length === 0 && !initialSeasonId) {
      setLoading(false);
      setMatchesState([]);
    }
  }, [selectedSeasonId, selectedDate, selectedTeamId, initialSeasonId, hideDropdown, type, limit, onPastMatchesFetched, setMatchesState, seasons]);


  const handleEdit = (match) => {
    setEditingMatch(match);
    setShowForm(true);
    setExpandedMatchId(null);
  };

  // --- BẮT ĐẦU THAY ĐỔI ---
  const handleDelete = async (id) => {
    if (!token) {
      setError('Vui lòng đăng nhập để xóa trận đấu');
      return;
    }
    // Hiển thị hộp thoại xác nhận của trình duyệt
    if (window.confirm('Bạn có chắc chắn muốn xóa trận đấu này? Điều này sẽ xóa luôn đội hình và ảnh hưởng kết quả, xếp hạng liên quan.')) {
      setDeletingId(id); // Bắt đầu hiển thị vòng xoay
      try {
        await axios.delete(`http://localhost:5000/api/matches/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatchesState((prevMatches) => prevMatches.filter((match) => (match.id || match._id) !== id));
      } catch (err) {
        console.error("Delete error:", err.response?.data || err.message);
        setError(err.response?.data?.message || 'Không thể xóa trận đấu.');
      } finally {
        setDeletingId(null); // Dừng hiển thị vòng xoay
      }
    }
  };
  // --- KẾT THÚC THAY ĐỔI ---

  const handleToggleLineups = async (match) => {
    const matchId = match.id || match._id;
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      setMatchLineups({ team1: null, team2: null });
    } else {
      setExpandedMatchId(matchId);
      setLineupLoading(true);
      setLineupError('');
      try {
        const [lineup1Res, lineup2Res] = await Promise.all([
          axios.get(`http://localhost:5000/api/matchlineups/match/${matchId}/team/${match.team1._id}`),
          axios.get(`http://localhost:5000/api/matchlineups/match/${matchId}/team/${match.team2._id}`)
        ]);
        setMatchLineups({
          team1: lineup1Res.data.data,
          team2: lineup2Res.data.data
        });
      } catch (err) {
        console.error("Lỗi lấy đội hình:", err.response?.data || err.message);
        if (err.response?.status === 404) {
          setLineupError('Không tìm thấy đội hình cho trận đấu này.');
        } else {
          setLineupError('Không thể tải đội hình.');
        }
        setMatchLineups({ team1: null, team2: null });
      } finally {
        setLineupLoading(false);
      }
    }
  };


  const handleDateChange = useCallback((value) => {
    setSelectedDate(value);
    setCurrentPage(1);
    setError('');
    setExpandedMatchId(null);
  }, []);

  const handleTeamChange = useCallback((value) => {
    setSelectedTeamId(value);
    setCurrentPage(1);
    setError('');
    setExpandedMatchId(null);
  }, []);

  const handleSeasonChange = useCallback((value) => {
    setSelectedSeasonId(value);
    setSelectedDate('');
    setSelectedTeamId('');
    setCurrentPage(1);
    setError('');
    setExpandedMatchId(null);
  }, []);

  const handleResetFilter = useCallback(() => {
    setSelectedDate('');
    setSelectedTeamId('');
    setCurrentPage(1);
    setError('');
    setExpandedMatchId(null);
  }, []);

  const now = new Date();

  const pastMatches = matchesToDisplayState
    .filter((match) => new Date(match.date) <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingMatches = matchesToDisplayState
    .filter((match) => new Date(match.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;

  const currentMatchesToDisplayList = activeTab === 'upcoming'
    ? upcomingMatches.slice(indexOfFirstMatch, indexOfLastMatch)
    : pastMatches.slice(indexOfFirstMatch, indexOfLastMatch);

  const totalPages = activeTab === 'upcoming'
    ? Math.ceil(upcomingMatches.length / matchesPerPage) || 1
    : Math.ceil(pastMatches.length / matchesPerPage) || 1;

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const renderMatchScore = (score, matchDateStr) => {
    const matchDateTime = new Date(matchDateStr);
    if (score !== null && score !== "" && /^\d+-\d+$/.test(score)) {
      return <span className="text-lg font-bold text-gray-700">{score}</span>;
    } else if (matchDateTime <= now) {
      return <span className="text-sm text-gray-500 italic">Chưa có tỉ số</span>;
    } else {
      return <span className="text-gray-500 font-semibold">VS</span>;
    }
  };

  const renderLineupSection = (teamLineup, teamName) => {
    if (!teamLineup || !teamLineup.players || teamLineup.players.length === 0) {
      return <p className="text-sm text-gray-500 italic">Đội hình của {teamName} chưa được cập nhật.</p>;
    }
    return (
      <div className="w-full md:w-1/2 p-2">
        <h4 className="text-md font-semibold text-gray-700 mb-1">{teamName}</h4>
        <ul className="list-disc list-inside pl-2 space-y-0.5 text-sm text-gray-600 max-h-48 overflow-y-auto">
          {teamLineup.players.map((p) => (
            <li key={p.player_id?._id || p.player_id}>
              #{p.jersey_number} - {p.player_id?.name || 'Không rõ tên'} ({p.position})
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderMatchesList = (list) => (
    list.length > 0 ? (
      list.map((match) => (
        <div key={match.id || match._id} className="border-b border-gray-200 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center py-4 gap-4 px-2 md:px-4">
            {/* Team 1 */}
            <div className="col-span-12 md:col-span-5 flex items-center gap-3">
              <img
                src={match.team1?.logo || defaultLogoUrl}
                alt={`${match.team1?.team_name || 'Đội 1'} logo`}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
                onError={handleImageError}
              />
              <span className="text-gray-800 font-medium truncate" title={match.team1?.team_name || 'Đội không xác định'}>
                {match.team1?.team_name || 'Đội không xác định'}
              </span>
            </div>
            {/* Score & Info */}
            <div className="col-span-12 md:col-span-2 flex flex-col items-center text-center my-2 md:my-0">
              {renderMatchScore(match.score, match.date)}
              <div className="text-xs md:text-sm text-gray-400">
                <span>{formatDateToDisplay(match.date)}</span>
                {formatTimeToDisplay(match.date) !== "N/A" && (
                  <span className="ml-1 flex items-center"><ClockIcon className="inline h-3 w-3 mr-0.5" />{formatTimeToDisplay(match.date)}</span>
                )}
              </div>
              <span className="text-xs md:text-sm text-gray-400 truncate max-w-full px-1" title={match.stadium || 'Chưa rõ sân'}>
                <MapPinIcon className="inline h-3 w-3 mr-1" />{match.stadium || 'Chưa rõ sân'}
              </span>
            </div>
            {/* Team 2 */}
            <div className="col-span-12 md:col-span-5 flex items-center justify-start md:justify-end gap-3">
              <span className="text-gray-800 font-medium text-left md:text-right truncate order-2 md:order-1" title={match.team2?.team_name || 'Đội không xác định'}>
                {match.team2?.team_name || 'Đội không xác định'}
              </span>
              <img
                src={match.team2?.logo || defaultLogoUrl}
                alt={`${match.team2?.team_name || 'Đội 2'} logo`}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover order-1 md:order-2"
                onError={handleImageError}
              />
            </div>

            {/* Goal Scorers - START (Two Columns) */}
            {new Date(match.date) <= now && match.score && /^\d+-\d+$/.test(match.score) && match.goalDetails && match.goalDetails.length > 0 && (
              <div className="col-span-12 mt-3 pt-2 border-t border-gray-200">
                <p className="font-semibold text-sm text-gray-700 mb-2 text-center">Ghi bàn:</p>
                <div className="flex flex-col md:flex-row justify-between gap-4 text-xs text-gray-600">
                  {/* Column for Team 1 Scorers */}
                  <div className="w-full md:w-1/2">
                    <h4 className="font-medium text-gray-800 text-center md:text-left mb-1">{match.team1?.team_name || 'Đội 1'}</h4>
                    <ul className="list-none pl-0 space-y-1">
                      {match.goalDetails
                        .filter(goal => goal.team_id === match.team1?._id)
                        .map((goal, index) => {
                          const scorer = allPlayersMap[goal.player_id];
                          const scorerName = scorer ? scorer.name : 'N/A';
                          return (
                            <li key={`t1-goal-${index}-${match.id || match._id}`} className="text-gray-600">
                              {scorerName} ({goal.minute}')
                              {goal.goalType === 'OG' && <span className="text-red-500 font-medium"> (OG)</span>}
                              {goal.goalType !== 'normal' && goal.goalType !== 'OG' && ` (${goal.goalType.toUpperCase()})`}
                            </li>
                          );
                        })}
                      {match.goalDetails.filter(goal => goal.team_id === match.team1?._id).length === 0 && (
                        <li className="italic text-gray-400 text-center md:text-left">Không có</li>
                      )}
                    </ul>
                  </div>

                  {/* Divider (optional, for larger screens) */}
                  <div className="hidden md:block border-l border-gray-300 mx-2"></div>

                  {/* Column for Team 2 Scorers */}
                  <div className="w-full md:w-1/2">
                    <h4 className="font-medium text-gray-800 text-center md:text-right mb-1">{match.team2?.team_name || 'Đội 2'}</h4>
                    <ul className="list-none pl-0 space-y-1 md:text-right">
                      {match.goalDetails
                        .filter(goal => goal.team_id === match.team2?._id)
                        .map((goal, index) => {
                          const scorer = allPlayersMap[goal.player_id];
                          const scorerName = scorer ? scorer.name : 'N/A';
                          return (
                            <li key={`t2-goal-${index}-${match.id || match._id}`} className="text-gray-600">
                              {scorerName} ({goal.minute}')
                              {goal.goalType === 'OG' && <span className="text-red-500 font-medium"> (OG)</span>}
                              {goal.goalType !== 'normal' && goal.goalType !== 'OG' && ` (${goal.goalType.toUpperCase()})`}
                            </li>
                          );
                        })}
                      {match.goalDetails.filter(goal => goal.team_id === match.team2?._id).length === 0 && (
                        <li className="italic text-gray-400 text-center md:text-right">Không có</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {/* Goal Scorers - END */}

            {/* Action Buttons */}
            <div className="col-span-12 flex justify-center items-center gap-2 mt-2">
              <button
                onClick={() => handleToggleLineups(match)}
                className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition text-sm flex items-center"
              >
                <UsersIcon className="h-4 w-4 mr-1" />
                Đội Hình {expandedMatchId === (match.id || match._id) ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />}
              </button>
              {token && !hideDropdown && (
                <>
                  <button
                    onClick={() => handleEdit(match)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
                  >
                    Sửa
                  </button>
                  {/* --- BẮT ĐẦU THAY ĐỔI --- */}
                  {deletingId === (match.id || match._id) ? (
                    <div className="flex justify-center items-center w-14 h-7">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(match.id || match._id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                      disabled={deletingId !== null}
                    >
                      Xóa
                    </button>
                  )}
                  {/* --- KẾT THÚC THAY ĐỔI --- */}
                </>
              )}
            </div>
          </div>
          {/* Lineup Display */}
          {expandedMatchId === (match.id || match._id) && (
            <div className="px-2 md:px-6 py-3 bg-gray-50 border-t border-gray-200">
              {lineupLoading && <p className="text-sm text-gray-500 text-center">Đang tải đội hình...</p>}
              {lineupError && <p className="text-sm text-red-500 text-center">{lineupError}</p>}
              {!lineupLoading && !lineupError && (
                <div className="flex flex-col md:flex-row justify-between gap-2">
                  {renderLineupSection(matchLineups.team1, match.team1?.team_name || 'Đội 1')}
                  {renderLineupSection(matchLineups.team2, match.team2?.team_name || 'Đội 2')}
                </div>
              )}
            </div>
          )}
        </div>
      ))
    ) : (
      <p className="text-center text-gray-500 py-4">
        {error && !loading ? error : (activeTab === 'upcoming' ? 'Không có trận đấu nào sắp diễn ra.' : 'Không có trận đấu nào đã diễn ra.')}
      </p>
    )
  );

  if (loading && !hideDropdown && (!selectedSeasonId && !initialSeasonId)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`container mx-auto p-2 md:p-6 bg-gradient-to-t from-white to-gray-400 min-h-screen ${!hideDropdown ? 'flex flex-col md:flex-row' : ''}`}>
      {!hideDropdown && (
        <div className="w-full md:w-72 md:pr-6 mb-6 md:mb-0 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Lọc trận đấu</h2>
            {(seasons.length === 0 && !loading && !initialSeasonId) && <p className="text-gray-500 text-sm">Không có mùa giải nào để lọc.</p>}
            {(seasons.length > 0 || initialSeasonId) && (
              <div className="flex flex-col gap-4">
                {!initialSeasonId &&
                  <div>
                    <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">Mùa giải</label>
                    <select
                      id="season-select"
                      value={selectedSeasonId}
                      onChange={(e) => handleSeasonChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                    >
                      <option value="">Chọn mùa giải</option>
                      {seasons.map((season) => (
                        <option key={season._id} value={season._id}>
                          {season.season_name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
                {type === 'all' && (
                  <>
                    <div>
                      <label htmlFor="match-date" className="block text-sm font-medium text-gray-700 mb-1">Ngày thi đấu</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          id="match-date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                          disabled={!selectedSeasonId && !initialSeasonId}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 mb-1">Đội bóng</label>
                      <select
                        id="team-select"
                        value={selectedTeamId}
                        onChange={(e) => handleTeamChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
                        disabled={(!selectedSeasonId && !initialSeasonId) || filteredTeamsForDropdown.length === 0}
                      >
                        <option value="">Tất cả đội bóng</option>
                        {filteredTeamsForDropdown.map((team) => (
                          <option key={team._id} value={team._id}>
                            {team.team_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {type === 'all' && (selectedDate || selectedTeamId) && (
                  <div>
                    <button
                      onClick={handleResetFilter}
                      className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 w-full justify-center text-sm"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Xóa lọc
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl shadow-md p-3 md:p-6">
          {error && !loading && (
            <div className="text-center p-4 mb-4 bg-red-100 text-red-600 rounded-lg shadow-md text-sm">
              {error}
            </div>
          )}
          <div className="flex border-b border-gray-200 mb-2 md:mb-6">
            <button
              className={`px-3 md:px-4 py-2 text-base md:text-lg font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-orange-400'}`}
              onClick={() => { setActiveTab('upcoming'); setCurrentPage(1); setExpandedMatchId(null); }}
            > Sắp diễn ra ({upcomingMatches.length}) </button>
            <button
              className={`px-3 md:px-4 py-2 text-base md:text-lg font-semibold ${activeTab === 'past' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-orange-400'}`}
              onClick={() => { setActiveTab('past'); setCurrentPage(1); setExpandedMatchId(null); }}
            > Đã diễn ra ({pastMatches.length}) </button>
          </div>
          {(loading && (selectedSeasonId || initialSeasonId)) && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
          )}
          <div className="min-h-[200px]">
            {!loading && renderMatchesList(currentMatchesToDisplayList)}
          </div>
          {(totalPages > 1 && currentMatchesToDisplayList.length > 0) && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              > Trang trước </button>
              <span className="text-gray-600 text-sm md:text-base"> Trang {currentPage} / {totalPages} </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base ${currentPage >= totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              > Trang tiếp theo </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matches;