import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CalendarIcon, MapPinIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Matches = ({ matches: propMatches, setMatches: setPropMatches, setEditingMatch = () => { }, setShowForm = () => { }, type = 'all', onPastMatchesFetched = () => { }, token, seasonId: initialSeasonId, limit, hideDropdown = false }) => {
  const [localMatches, setLocalMatches] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // Mặc định là tab "Sắp diễn ra"
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 7;

  const matches = propMatches !== undefined ? propMatches : localMatches;
  const setMatches = setPropMatches || setLocalMatches;

  const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain';

  const handleImageError = (e) => {
    e.target.src = defaultLogoUrl;
  };

  const isValidDateFormat = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  const formatDateToDisplay = (dateString) => {
    if (!dateString || !isValidDateFormat(dateString)) return 'Chưa rõ ngày';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { // Sử dụng en-GB cho định dạng dd/mm/yyyy
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/seasons');
        const seasonsData = response.data.data || [];
        setSeasons(seasonsData);
        if (!initialSeasonId && seasonsData.length > 0 && !hideDropdown) {
            setSelectedSeasonId(seasonsData[0]._id);
        }
      } catch (err) {
        console.error('Lỗi lấy mùa giải:', err);
        setError('Không thể tải danh sách mùa giải');
      }
    };
    if (!hideDropdown) {
        fetchSeasons();
    }
  }, [initialSeasonId, hideDropdown]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/teams');
        const teamsData = response.data.data || [];
        setTeams(teamsData);
      } catch (err) {
        console.error('Lỗi lấy đội bóng:', err);
      }
    };
     if (!hideDropdown) {
        fetchTeams();
    }
  }, [hideDropdown]);

  useEffect(() => {
    if (selectedSeasonId && !hideDropdown) {
      const filtered = teams.filter((team) => team.season_id && team.season_id.toString() === selectedSeasonId);
      setFilteredTeams(filtered);
      if (!filtered.some(t => t._id === selectedTeamId)) { // Nếu team đang chọn ko thuộc season mới, reset
        setSelectedTeamId('');
      }
    } else if (!hideDropdown) {
      setFilteredTeams(teams);
    }
  }, [selectedSeasonId, teams, hideDropdown, selectedTeamId]);

   useEffect(() => {
    if (initialSeasonId) {
      setSelectedSeasonId(initialSeasonId);
    }
  }, [initialSeasonId]);


  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(''); 
      
      let url = 'http://localhost:5000/api/matches/';
      let params = {};

      if (selectedTeamId) {
        url = `http://localhost:5000/api/matches/teams/${selectedTeamId}`;
      } else if (selectedSeasonId) {
        url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}`;
        if (selectedDate && isValidDateFormat(selectedDate)) {
          // API của bạn có thể là /seasons/:season_id/:date hoặc dùng query param
          // Giả sử API hỗ trợ /seasons/:season_id/:date
          url = `http://localhost:5000/api/matches/seasons/${selectedSeasonId}/${selectedDate}`;
        }
      } else if (selectedDate && isValidDateFormat(selectedDate) && !hideDropdown) {
          setError("Vui lòng chọn mùa giải để lọc theo ngày.");
          setMatches([]);
          setLoading(false);
          return;
      } else if (hideDropdown && initialSeasonId) { // Trường hợp trang Home
          url = `http://localhost:5000/api/matches/seasons/${initialSeasonId}`;
      }


      try {
        const response = await axios.get(url, { params });
        const matchesData = response.data.data || [];
        
        setMatches(matchesData);

        if (type === 'home' && typeof onPastMatchesFetched === 'function') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const past = matchesData
              .filter((match) => {
                const matchDate = new Date(match.date);
                matchDate.setHours(0,0,0,0);
                return matchDate <= today && (match.score !== null && match.score !== "" && /^\d+-\d+$/.test(match.score));
              })
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, limit || 5);
            onPastMatchesFetched(past);
        }

      } catch (err) {
        console.error('Lỗi lấy trận đấu:', err.response?.data || err.message);
        if (err.response?.status === 404) {
            setMatches([]);
            setError('Không có trận đấu nào phù hợp với lựa chọn.');
        } else {
            setError('Không thể tải danh sách trận đấu. Vui lòng thử lại.');
        }
      } finally {
        setLoading(false);
      }
    };

    if ((!hideDropdown && selectedSeasonId) || (hideDropdown && initialSeasonId) || (!selectedSeasonId && !selectedDate && !selectedTeamId && !hideDropdown) ) {
        fetchMatches();
    } else if (!hideDropdown && !selectedSeasonId && (selectedDate || selectedTeamId)) {
        setError("Vui lòng chọn một mùa giải trước khi lọc theo ngày hoặc đội.");
        setMatches([]);
        setLoading(false);
    } else if (!hideDropdown && seasons.length > 0 && !selectedSeasonId) {
        // Mặc định chọn mùa giải đầu tiên nếu chưa có gì được chọn và seasons đã load
        // setSelectedSeasonId(seasons[0]._id); // Bỏ dòng này nếu không muốn tự động chọn
        setLoading(false);
        setMatches([]);
    }
     else {
      setLoading(false);
      setMatches([]);
    }

  }, [selectedSeasonId, selectedDate, selectedTeamId, type, setMatches, onPastMatchesFetched, limit, hideDropdown, initialSeasonId, seasons]);


  const handleEdit = (match) => {
    setEditingMatch(match);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!token) {
      setError('Vui lòng đăng nhập để xóa trận đấu');
      return;
    }
    if(window.confirm('Bạn có chắc chắn muốn xóa trận đấu này?')) {
        try {
        await axios.delete(`http://localhost:5000/api/matches/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setMatches((prevMatches) => prevMatches.filter((match) => (match.id || match._id) !== id));
        } catch (err) {
        setError('Không thể xóa trận đấu. Có thể có dữ liệu liên quan (kết quả, xếp hạng).');
        }
    }
  };

  const handleDateChange = useCallback((value) => {
    setSelectedDate(value); 
    setCurrentPage(1);
    setError(''); 
  }, []);

  const handleTeamChange = useCallback((value) => {
    setSelectedTeamId(value);
    setCurrentPage(1);
    setError('');
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
    // Không reset selectedSeasonId để giữ lại lựa chọn mùa giải
  }, []);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Chuẩn hóa ngày hôm nay về đầu ngày UTC

  const pastMatches = matches
    .filter((match) => {
      const matchDate = new Date(match.date);
      matchDate.setUTCHours(0,0,0,0);
      return matchDate <= today; // Tất cả các trận từ quá khứ đến hết hôm nay
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcomingMatches = matches
    .filter((match) => {
      const matchDate = new Date(match.date);
      matchDate.setUTCHours(0,0,0,0);
      return matchDate > today; // Chỉ các trận có ngày lớn hơn ngày hôm nay
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));


  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  
  const currentMatchesToDisplay = activeTab === 'upcoming' 
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
    const matchDate = new Date(matchDateStr);
    matchDate.setUTCHours(0,0,0,0);

    if (score !== null && score !== "" && /^\d+-\d+$/.test(score)) {
      return <span className="text-lg font-bold text-gray-700">{score}</span>;
    } else if (matchDate <= today) { // Đã qua ngày nhưng chưa có score
      return <span className="text-sm text-gray-500 italic">Chưa cập nhật</span>;
    } else { // Sắp diễn ra và chưa có score
      return <span className="text-gray-500 font-semibold">VS</span>;
    }
  };

  const renderMatches = (list) => (
    list.length > 0 ? (
      list.map((match) => (
        <div key={match.id || match._id} className="grid grid-cols-1 md:grid-cols-12 items-center py-4 border-b border-gray-200 w-full gap-4 px-2 md:px-4">
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
          <div className="col-span-12 md:col-span-2 flex flex-col items-center text-center my-2 md:my-0">
            {renderMatchScore(match.score, match.date)}
            <span className="text-xs md:text-sm text-gray-400">
              {formatDateToDisplay(match.date)}
            </span>
            <span className="text-xs md:text-sm text-gray-400 truncate max-w-full px-1" title={match.stadium || 'Chưa rõ sân'}>
              {match.stadium || 'Chưa rõ sân'}
            </span>
          </div>
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
          {token && !hideDropdown && ( // Chỉ hiển thị nút sửa/xóa nếu có token và không ẩn dropdown (nghĩa là đang ở trang MatchesPage)
            <div className="col-span-12 flex justify-center md:justify-end gap-2 mt-2">
              <button
                onClick={() => handleEdit(match)}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(match.id || match._id)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
              >
                Xóa
              </button>
            </div>
          )}
        </div>
      ))
    ) : (
      <p className="text-center text-gray-500 py-4">
        {activeTab === 'upcoming' ? 'Không có trận đấu nào sắp diễn ra.' : 'Không có trận đấu nào đã diễn ra.'}
      </p>
    )
  );

  if (loading && !hideDropdown) { 
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className={`container mx-auto p-2 md:p-6 bg-gray-50 min-h-screen ${!hideDropdown ? 'flex flex-col md:flex-row' : ''}`}>
      {!hideDropdown && (
        <div className="w-full md:w-72 md:pr-6 mb-6 md:mb-0 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Lọc trận đấu</h2>
            {(loading && seasons.length === 0) ? (
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto"></div>
            ): seasons.length === 0 && !loading ? (
                <p className="text-gray-500 text-sm">Không có mùa giải nào để lọc.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">Mùa giải</label>
                  <select
                    id="season-select"
                    value={selectedSeasonId}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
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
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          id="match-date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
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
                        disabled={!selectedSeasonId && teams.length === 0} 
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
      <div className="flex-1 min-w-0"> {/* Thêm min-w-0 để flex item có thể co lại */}
        <div className="bg-white rounded-xl shadow-md p-3 md:p-6">
           {error && !loading && ( // Chỉ hiển thị lỗi nếu không loading
             <div className="text-center p-4 mb-4 bg-red-100 text-red-600 rounded-lg shadow-md text-sm">
                {error}
             </div>
            )}
          <div className="flex border-b border-gray-200 mb-2 md:mb-6">
            <button
              className={`px-3 md:px-4 py-2 text-base md:text-lg font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-orange-400'}`}
              onClick={() => {
                setActiveTab('upcoming');
                setCurrentPage(1);
              }}
            >
              Sắp diễn ra
            </button>
            <button
              className={`px-3 md:px-4 py-2 text-base md:text-lg font-semibold ${activeTab === 'past' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-orange-400'}`}
              onClick={() => {
                setActiveTab('past');
                setCurrentPage(1);
              }}
            >
              Đã diễn ra
            </button>
          </div>
          {loading && hideDropdown && ( 
            <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
           )}
          <div className="min-h-[200px]"> {/* Đảm bảo có chiều cao tối thiểu để bảng không bị nhảy khi rỗng */}
            {renderMatches(currentMatchesToDisplay)}
          </div>
          {(totalPages > 1 && currentMatchesToDisplay.length > 0) && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Trang trước
              </button>
              <span className="text-gray-600 text-sm md:text-base">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-sm md:text-base ${currentPage >= totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
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