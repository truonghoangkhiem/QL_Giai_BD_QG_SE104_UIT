import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarIcon, MapPinIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Matches = ({ matches: propMatches, setMatches: setPropMatches, setEditingMatch = () => { }, setShowForm = () => { }, type = 'all', onPastMatchesFetched = () => { }, token, seasonId, limit }) => {
  const [localMatches, setLocalMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonId || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  const matches = propMatches !== undefined ? propMatches : localMatches;
  const setMatches = setPropMatches || setLocalMatches;

  const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain';

  const handleImageError = (e) => {
    e.target.src = defaultLogoUrl;
  };

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/seasons');
        setSeasons(response.data.data || response.data || []);
      } catch (err) {
        console.error('Fetch Seasons Error:', err);
        setError('Không thể tải danh sách mùa giải');
      }
    };
    fetchSeasons();
  }, []);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/teams');
        const teamsData = response.data.data || response.data || [];
        setTeams(teamsData);
      } catch (err) {
        console.error('Fetch Teams Error:', err);
        setError('Không thể tải danh sách đội bóng');
      }
    };
    fetchTeams();
  }, []);

  // Filter teams by selected season
  useEffect(() => {
    if (selectedSeasonId) {
      const filtered = teams.filter(team => team.season_id.toString() === selectedSeasonId);
      setFilteredTeams(filtered);
      setSelectedTeamId(''); // Reset team selection when season changes
    } else {
      setFilteredTeams(teams);
    }
  }, [selectedSeasonId, teams]);

  // Set selectedSeasonId from prop
  useEffect(() => {
    if (seasonId) {
      setSelectedSeasonId(seasonId);
    }
  }, [seasonId]);

  // Fetch matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        let url = 'http://localhost:5000/api/matches/';
        if (selectedTeamId) {
          url = `http://localhost:5000/api/matches/teams/${selectedTeamId}`;
        } else if (selectedSeasonId) {
          url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}`;
          if (selectedDate) {
            url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}/${selectedDate}`;
          }
        }

        const response = await axios.get(url);
        const matchesData = response.data.data || response.data || [];
        setMatches(matchesData);

        const today = new Date();
        const pastMatches = matchesData
          .filter((match) => new Date(match.date) <= today && match.score)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        onPastMatchesFetched(pastMatches);
        setLoading(false);
      } catch (err) {
        console.error('Fetch Matches Error:', err.response?.data || err.message);
        setError(err.response?.status === 404 ? 'Mùa giải, ngày hoặc đội bóng không hợp lệ' : 'Không thể tải danh sách trận đấu');
        setLoading(false);
      }
    };

    fetchMatches();
  }, [selectedSeasonId, selectedDate, selectedTeamId, type, onPastMatchesFetched, setMatches]);

  const handleEdit = (match) => {
    setEditingMatch(match);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!token) {
      setError('Vui lòng đăng nhập để xóa trận đấu');
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/matches/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches(matches.filter((match) => match._id !== id));
    } catch (err) {
      setError('Không thể xóa trận đấu');
    }
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
  };

  const handleTeamChange = (value) => {
    setSelectedTeamId(value);
  };

  const handleResetFilter = () => {
    setSelectedDate('');
    setSelectedTeamId('');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center p-6 bg-red-100 text-red-600 rounded-lg shadow-md">
      {error}
    </div>
  );

  const today = new Date();
  const pastMatches = matches
    .filter((match) => new Date(match.date) <= today && match.score)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingMatches = matches
    .filter((match) => new Date(match.date) > today)
    .sort((a, b) => new Date(a.date) - new Date(a.date))
    .slice(0, limit || undefined);

  const renderMatches = (list, isLive) => (
    list.length > 0 ? (
      list.map((match) => (
        <div key={match._id} className="grid grid-cols-12 items-center py-4 border-b border-gray-200 w-full gap-4 px-4">
          {/* Team 1 */}
          <div className="col-span-5 flex items-center gap-3">
            <img
              src={match.team1?.logo || defaultLogoUrl}
              alt={`${match.team1?.team_name} logo`}
              className="w-10 h-10 rounded-full object-cover"
              onError={handleImageError}
            />
            <span className="text-gray-800 font-medium">
              {match.team1?.team_name || 'Unknown Team'}
            </span>
          </div>

          {/* Center: Score / VS + Date + Stadium */}
          <div className="col-span-2 flex flex-col items-center text-center">
            {isLive && match.score ? (
              <span className="text-lg font-bold text-gray-700">{match.score}</span>
            ) : (
              <span className="text-gray-500 font-semibold">VS</span>
            )}
            <span className="text-sm text-gray-400">
              {match.date ? new Date(match.date).toLocaleDateString() : 'Chưa rõ ngày'}
            </span>
            <span className="text-sm text-gray-400">
              {match.stadium || 'Chưa rõ sân'}
            </span>
          </div>

          {/* Team 2 */}
          <div className="col-span-5 flex items-center justify-end gap-3">
            <span className="text-gray-800 font-medium text-right">
              {match.team2?.team_name || 'Unknown Team'}
            </span>
            <img
              src={match.team2?.logo || defaultLogoUrl}
              alt={`${match.team2?.team_name} logo`}
              className="w-10 h-10 rounded-full object-cover"
              onError={handleImageError}
            />
          </div>
        </div>
      ))
    ) : (
      <p className="text-center text-gray-500 py-4">Không có trận đấu.</p>
    )
  );

  return (
    <div className="container overflow-x-auto mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Season, Date, and Team Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Lọc trận đấu</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">Mùa giải</label>
              <select
                id="season-select"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                <option value="">Tất cả mùa giải</option>
                {seasons.map((season) => (
                  <option key={season._id} value={season._id}>
                    {season.season_name}
                  </option>
                ))}
              </select>
            </div>
            {type === 'all' && (
              <>
                <div className="flex-1">
                  <label htmlFor="match-date" className="block text-sm font-medium text-gray-700 mb-1">Ngày thi đấu</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      id="match-date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 mb-1">Đội bóng</label>
                  <select
                    id="team-select"
                    value={selectedTeamId}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="">Tất cả đội bóng</option>
                    {filteredTeams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {type === 'all' && (selectedDate || selectedTeamId) && (
              <div className="flex items-end">
                <button
                  onClick={handleResetFilter}
                  className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  <XCircleIcon className="w-5 h-5" />
                  Xóa lọc
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Matches Container */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 text-lg font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Sắp diễn ra
            </button>
            <button
              className={`px-4 py-2 text-lg font-semibold ${activeTab === 'past' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('past')}
            >
              Đã diễn ra
            </button>
          </div>
          <div>
            {activeTab === 'upcoming' && renderMatches(upcomingMatches, false)}
            {activeTab === 'past' && renderMatches(pastMatches, true)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matches;