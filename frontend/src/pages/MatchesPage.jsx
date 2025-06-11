// File: truonghoangkhiem/ql_giai_bd_qg_se104_uit/QL_Giai_BD_QG_SE104_UIT-ten-nhanh-moi/frontend/src/pages/MatchesPage.jsx
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Matches from '../components/Matches';
import MatchForm from '../components/MatchForm';

const MatchesPage = ({ token }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matches, setMatches] = useState([]);
  const [showAutoCreateForm, setShowAutoCreateForm] = useState(false);
  const [autoCreateData, setAutoCreateData] = useState({
    season_id: '',
    matchperday: 1,
  });
  const [seasons, setSeasons] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // --- BẮT ĐẦU THAY ĐỔI ---
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false); // Đổi tên `loading`
  // --- KẾT THÚC THAY ĐỔI ---

  // Fetch seasons for the dropdown
  React.useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/seasons');
        setSeasons(response.data.data || response.data || []);
      } catch (err) {
        setError('Không thể tải danh sách mùa giải');
      }
    };
    fetchSeasons();
  }, []);

  const memoizedSetMatches = useCallback((newMatches) => {
    setMatches(newMatches);
  }, []);

  const onPastMatchesFetched = useCallback((pastMatches) => {
    // Logic xử lý khi có các trận đã qua
  }, []);

  // --- BẮT ĐẦU THAY ĐỔI ---
  const handleAutoCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsCreatingSchedule(true); // Bắt đầu tải

    if (!token) {
      setError('Vui lòng đăng nhập để tạo trận đấu tự động.');
      setIsCreatingSchedule(false);
      return;
    }

    if (!autoCreateData.season_id) {
      setError('Vui lòng chọn mùa giải.');
      setIsCreatingSchedule(false);
      return;
    }

    if (autoCreateData.matchperday < 1) {
      setError('Số trận đấu mỗi ngày phải lớn hơn hoặc bằng 1.');
      setIsCreatingSchedule(false);
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/matches', {
        season_id: autoCreateData.season_id,
        matchperday: autoCreateData.matchperday,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await axios.get(`http://localhost:5000/api/matches/seasons/${autoCreateData.season_id}`);
      setMatches(response.data.data || response.data || []);

      setSuccess('Tạo lịch thi đấu tự động thành công!');
      setAutoCreateData({ season_id: '', matchperday: 1 });
      setShowAutoCreateForm(false);
    } catch (err) {
      console.error('Auto create error:', err.response?.data || err.message);
      if (err.response?.status === 400) {
        setError(err.response.data.message || 'Dữ liệu không hợp lệ.');
      } else if (err.response?.status === 404) {
        setError('Mùa giải không tồn tại.');
      } else {
        setError('Không thể tạo lịch thi đấu. Vui lòng thử lại.');
      }
    } finally {
      setIsCreatingSchedule(false); // Dừng tải
    }
  };
  // --- KẾT THÚC THAY ĐỔI ---

  return (
    <div className="container mx-auto p-6">
      {showForm ? (
        token ? (
          <MatchForm
            editingMatch={editingMatch}
            setEditingMatch={setEditingMatch}
            setShowForm={setShowForm}
            setMatches={memoizedSetMatches}
            token={token}
          />
        ) : (
          <p className="text-red-600 bg-red-100 p-3 rounded-lg text-center font-medium">
            Vui lòng đăng nhập để thêm hoặc sửa trận đấu.
          </p>
        )
      ) : showAutoCreateForm ? (
        <div className="max-w-lg mx-auto p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Tạo Lịch Thi Đấu Tự Động
          </h2>
          {error && (
            <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-center font-medium">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-600 bg-green-100 p-3 rounded-lg mb-4 text-center font-medium">
              {success}
            </p>
          )}
          {/* --- BẮT ĐẦU THAY ĐỔI --- */}
          <form onSubmit={handleAutoCreateSubmit} className="space-y-6">
            <fieldset disabled={isCreatingSchedule} className="space-y-6">
              <div>
                <label
                  htmlFor="season_id"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mùa Giải
                </label>
                <select
                  id="season_id"
                  value={autoCreateData.season_id}
                  onChange={(e) =>
                    setAutoCreateData({ ...autoCreateData, season_id: e.target.value })
                  }
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  required
                >
                  <option value="">Chọn mùa giải</option>
                  {seasons.map((season) => (
                    <option key={season._id} value={season._id}>
                      {season.season_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="matchperday"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Số Trận Mỗi Ngày
                </label>
                <input
                  type="number"
                  id="matchperday"
                  value={autoCreateData.matchperday}
                  onChange={(e) =>
                    setAutoCreateData({
                      ...autoCreateData,
                      matchperday: parseInt(e.target.value, 10),
                    })
                  }
                  min="1"
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-sm flex items-center justify-center min-w-[100px]"
                  disabled={isCreatingSchedule}
                >
                  {isCreatingSchedule ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Tạo Lịch'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutoCreateForm(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300 shadow-sm"
                  disabled={isCreatingSchedule}
                >
                  Hủy
                </button>
              </div>
            </fieldset>
          </form>
          {/* --- KẾT THÚC THAY ĐỔI --- */}
        </div>
      ) : (
        <>
          {token && (
            <div className="flex justify-start space-x-4 mb-6">
              <button
                onClick={() => setShowAutoCreateForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-green-300 shadow-sm font-medium"
                disabled={showForm || showAutoCreateForm}
              >
                Tạo Trận Đấu Tự Động
              </button>
            </div>
          )}
          <Matches
            matches={matches}
            setMatches={memoizedSetMatches}
            setEditingMatch={setEditingMatch}
            setShowForm={setShowForm}
            token={token}
            onPastMatchesFetched={onPastMatchesFetched}
          />
        </>
      )}
    </div>
  );
};

export default MatchesPage;