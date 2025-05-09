import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CalendarIcon, MapPinIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Matches = ({ matches: propMatches, setMatches: setPropMatches, setEditingMatch = () => { }, setShowForm = () => { }, type = 'all', onPastMatchesFetched = () => { }, token, seasonId, limit, hideDropdown = false }) => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 7;

  const matches = propMatches !== undefined ? propMatches : localMatches;
  const setMatches = setPropMatches || setLocalMatches;

  const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain';

  const handleImageError = (e) => {
    e.target.src = defaultLogoUrl;
  };

  // Hàm kiểm tra định dạng ngày (YYYY-MM-DD hoặc ISO 8601 date-time)
  const isValidDateFormat = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  // Hàm định dạng ngày sang DD/MM/YYYY
  const formatDateToDisplay = (dateString) => {
    if (!dateString || !isValidDateFormat(dateString)) return 'Chưa rõ ngày';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/seasons');
        setSeasons(response.data.data || response.data || []);
      } catch (err) {
        console.error('Lỗi lấy mùa giải:', err);
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
        console.error('Lỗi lấy đội bóng:', err);
        setError('Không thể tải danh sách đội bóng');
      }
    };
    fetchTeams();
  }, []);

  // Filter teams by selected season
  useEffect(() => {
    if (selectedSeasonId) {
      const filtered = teams.filter((team) => team.season_id.toString() === selectedSeasonId);
      setFilteredTeams(filtered);
      setSelectedTeamId('');
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
      setLoading(true);
      try {
        let url = 'http://localhost:5000/api/matches/';
        if (selectedTeamId) {
          url = `http://localhost:5000/api/matches/teams/${selectedTeamId}`;
        } else if (selectedSeasonId) {
          url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}`;
          if (selectedDate && isValidDateFormat(selectedDate)) {
            url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}/${selectedDate}`;
          }
        }

        const response = await axios.get(url);
        const matchesData = response.data.data || response.data || [];

        // Chỉ cập nhật nếu dữ liệu khác
        setMatches((prevMatches) => {
          if (JSON.stringify(prevMatches) !== JSON.stringify(matchesData)) {
            return matchesData;
          }
          return prevMatches;
        });

        const today = new Date();
        const pastMatches = matchesData
          .filter((match) => {
            const matchDate = new Date(match.date);
            return matchDate instanceof Date && !isNaN(matchDate) && matchDate <= today;
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        onPastMatchesFetched(pastMatches);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi lấy trận đấu:', err.response?.data || err.message);
        setError(
          err.response?.status === 404
            ? 'Mùa giải, ngày hoặc đội bóng không hợp lệ'
            : 'Không thể tải danh sách trận đấu'
        );
        setLoading(false);
      }
    };

    fetchMatches();
  }, [selectedSeasonId, selectedDate, selectedTeamId, type]);

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
      setMatches((prevMatches) => prevMatches.filter((match) => match._id !== id));
    } catch (err) {
      setError('Không thể xóa trận đấu');
    }
  };

  const handleDateChange = useCallback((value) => {
    if (value && !isValidDateFormat(value)) {
      setError('Vui lòng nhập ngày hợp lệ (YYYY-MM-DD)');
      return;
    }
    setSelectedDate(value);
    setCurrentPage(1);
  }, []);

  const handleTeamChange = useCallback((value) => {
    setSelectedTeamId(value);
    setCurrentPage(1);
  }, []);

  const handleSeasonChange = useCallback((value) => {
    setSelectedSeasonId(value);
    setSelectedDate('');
    setSelectedTeamId('');
    setCurrentPage(1);
    setError('');
  }, []);

  const handleResetFilter = useCallback(() => {
    setSelectedDate('');
    setSelectedTeamId('');
    setCurrentPage(1);
    setError('');
  }, []);

  // Pagination logic
  const today = new Date();
  const pastMatches = matches
    .filter((match) => {
      const matchDate = new Date(match.date);
      return matchDate instanceof Date && !isNaN(matchDate) && matchDate <= today;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingMatches = matches
    .filter((match) => {
      const matchDate = new Date(match.date);
      return matchDate instanceof Date && !isNaN(matchDate) && matchDate > today;
    })
    .sort((a, b) => new Date(a.date) - new Date(a.date));

  // Calculate paginated matches
  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const paginatedPastMatches = pastMatches.slice(indexOfFirstMatch, indexOfLastMatch);
  const paginatedUpcomingMatches = upcomingMatches.slice(indexOfFirstMatch, indexOfLastMatch);

  // Calculate total pages
  const totalPastPages = Math.ceil(pastMatches.length / matchesPerPage) || 1;
  const totalUpcomingPages = Math.ceil(upcomingMatches.length / matchesPerPage) || 1;

  const handleNextPage = useCallback(() => {
    const totalPages = activeTab === 'upcoming' ? totalUpcomingPages : totalPastPages;
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [activeTab, totalUpcomingPages, totalPastPages, currentPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const renderMatches = (list, isLive) => (
    list.length > 0 ? (
      list.map((match) => (
        <div key={match._id} className="grid grid-cols-12 items-center py-4 border-b border-gray-200 w-full gap-4 px-4">
          <div className="col-span-5 flex items-center gap-3">
            <img
              src={match.team1?.logo || defaultLogoUrl}
              alt={`${match.team1?.team_name} logo`}
              className="w-10 h-10 rounded-full object-cover"
              onError={handleImageError}
            />
            <span className="text-gray-800 font-medium">
              {match.team1?.team_name || 'Đội không xác định'}
            </span>
          </div>
          <div className="col-span-2 flex flex-col items-center text-center">
            {isLive && match.score ? (
              <span className="text-lg font-bold text-gray-700">{match.score}</span>
            ) : (
              <span className="text-gray-500 font-semibold">VS</span>
            )}
            <span className="text-sm text-gray-400">
              {formatDateToDisplay(match.date)}
            </span>
            <span className="text-sm text-gray-400">
              {match.stadium || 'Chưa rõ sân'}
            </span>
          </div>
          <div className="col-span-5 flex items-center justify-end gap-3">
            <span className="text-gray-800 font-medium text-right">
              {match.team2?.team_name || 'Đội không xác định'}
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
      <p className="text-center text-gray-500 py-4">
        {activeTab === 'upcoming' ? 'Không có trận đấu sắp diễn ra.' : 'Không có trận đấu đã diễn ra.'}
      </p>
    )
  );

  // Hiển thị loading
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center p-6 bg-red-100 text-red-600 rounded-lg shadow-md">
          {error}
          <div className="mt-4">
            <button
              onClick={() => handleSeasonChange('')}
              className="text-blue-600 hover:underline"
            >
              Xem tất cả mùa giải
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị giao diện chính khi không có lỗi
  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen flex">
      {/* Phần lọc trận đấu - Ẩn nếu hideDropdown là true */}
      {!hideDropdown && (
        <div className="w-64 pr-6">
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Lọc trận đấu</h2>
            {matches.length === 0 ? (
              <div className="text-gray-500">
                <p>Không có trận đấu nào cho mùa giải này.</p>
                <button
                  onClick={() => handleSeasonChange('')}
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  Xem tất cả mùa giải
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">Mùa giải</label>
                  <select
                    id="season-select"
                    value={selectedSeasonId}
                    onChange={(e) => handleSeasonChange(e.target.value)}
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
                    <div>
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
                    <div>
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
                  <div>
                    <button
                      onClick={handleResetFilter}
                      className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 w-full"
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
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 text-lg font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500'}`}
              onClick={() => {
                setActiveTab('upcoming');
                setCurrentPage(1);
              }}
            >
              Sắp diễn ra
            </button>
            <button
              className={`px-4 py-2 text-lg font-semibold ${activeTab === 'past' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500'}`}
              onClick={() => {
                setActiveTab('past');
                setCurrentPage(1);
              }}
            >
              Đã diễn ra
            </button>
          </div>
          <div>
            {activeTab === 'upcoming' && renderMatches(paginatedUpcomingMatches, false)}
            {activeTab === 'past' && renderMatches(paginatedPastMatches, true)}
          </div>
          {(activeTab === 'upcoming' ? paginatedUpcomingMatches.length : paginatedPastMatches.length) > 0 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Trang trước
              </button>
              <span className="text-gray-600">
                Trang {currentPage} / {activeTab === 'upcoming' ? totalUpcomingPages : totalPastPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= (activeTab === 'upcoming' ? totalUpcomingPages : totalPastPages)}
                className={`px-4 py-2 rounded-lg ${currentPage >= (activeTab === 'upcoming' ? totalUpcomingPages : totalPastPages) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Trang tiếp theo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matches;