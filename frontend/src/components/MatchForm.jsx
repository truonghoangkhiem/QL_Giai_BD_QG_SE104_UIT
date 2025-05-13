import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const [formData, setFormData] = useState({
    date: '',
    stadium: '',
    score: '',
    team1Name: '',
    team2Name: '',
  });
  const [goalDetails, setGoalDetails] = useState([]);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [regulation, setRegulation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('editingMatch:', editingMatch);
    if (editingMatch && editingMatch.team1 && editingMatch.team2) {
      setFormData({
        date: editingMatch.date ? new Date(editingMatch.date).toISOString().split('T')[0] : '',
        stadium: editingMatch.stadium || '',
        score: editingMatch.score || '',
        team1Name: editingMatch.team1?.team_name || '',
        team2Name: editingMatch.team2?.team_name || '',
      });

      setGoalDetails(editingMatch.goalDetails?.map(goal => ({
        playerId: goal.player_id,
        minute: goal.minute,
        goalType: goal.goalType || 'normal',
        teamId: goal.team_id,
      })) || []);

      const fetchTeam1Players = async () => {
        const team1Id = editingMatch.team1?._id;
        if (team1Id && typeof team1Id === 'string') {
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${team1Id}`);
            setTeam1Players(response.data.data || response.data || []);
          } catch (err) {
            console.error('Lỗi lấy cầu thủ đội 1:', err.response?.data || err.message);
            setError('Không thể tải danh sách cầu thủ đội 1: ' + (err.response?.data?.message || err.message));
          }
        } else {
          setError('Không tìm thấy ID đội 1 để lấy danh sách cầu thủ.');
        }
      };

      const fetchTeam2Players = async () => {
        const team2Id = editingMatch.team2?._id;
        if (team2Id && typeof team2Id === 'string') {
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${team2Id}`);
            setTeam2Players(response.data.data || response.data || []);
          } catch (err) {
            console.error('Lỗi lấy cầu thủ đội 2:', err.response?.data || err.message);
            setError('Không thể tải danh sách cầu thủ đội 2: ' + (err.response?.data?.message || err.message));
          }
        } else {
          setError('Không tìm thấy ID đội 2 để lấy danh sách cầu thủ.');
        }
      };

      const fetchRegulation = async () => {
        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        if (seasonId && typeof seasonId === 'string') {
          console.log('Step 1: Fetching regulation ID for seasonId:', seasonId);
          let regulationId;
          try {
            const idResponse = await axios.get(
              `http://localhost:5000/api/regulations/${seasonId}/Goal%20Rules`
            );
            console.log('Step 1: Full response object:', idResponse);

            // Kiểm tra response.status
            if (idResponse.status !== 200) {
              throw new Error(`API trả về status không hợp lệ: ${idResponse.status}`);
            }

            // Kiểm tra response.data
            if (!idResponse.data || typeof idResponse.data !== 'object') {
              throw new Error('Response không hợp lệ từ API lấy ID quy định');
            }

            // Kiểm tra status và data
            console.log('Step 1: Checking status and data:', {
              statusExists: 'status' in idResponse.data,
              statusValue: idResponse.data.status,
              dataExists: 'data' in idResponse.data,
              dataValue: idResponse.data.data,
              dataType: typeof idResponse.data.data,
            });

            if (!('status' in idResponse.data) || idResponse.data.status !== 'success') {
              throw new Error(`API không trả về status: success. Response: ${JSON.stringify(idResponse.data)}`);
            }

            if (!('data' in idResponse.data) || typeof idResponse.data.data !== 'string') {
              throw new Error(`API không trả về data hợp lệ. Response: ${JSON.stringify(idResponse.data)}`);
            }

            regulationId = idResponse.data.data;
            console.log('Step 1: Regulation ID obtained:', regulationId);
          } catch (idErr) {
            console.error('Step 1 failed:', idErr.message);
            setError('Không thể lấy ID quy định Goal Rules: ' + idErr.message);
            return;
          }

          // Bước 2: Lấy dữ liệu đầy đủ của quy định bằng ID
          try {
            console.log('Step 2: Fetching regulation details with ID:', regulationId);
            const regulationResponse = await axios.get(
              `http://localhost:5000/api/regulations/${regulationId}`
            );
            console.log('Step 2: Full response object:', regulationResponse);

            // Kiểm tra response.status
            if (regulationResponse.status !== 200) {
              throw new Error(`API trả về status không hợp lệ: ${regulationResponse.status}`);
            }

            // Kiểm tra response.data
            if (!regulationResponse.data || typeof regulationResponse.data !== 'object') {
              throw new Error('Response không hợp lệ từ API lấy dữ liệu quy định');
            }

            // Kiểm tra status và data
            console.log('Step 2: Checking status and data:', {
              statusExists: 'status' in regulationResponse.data,
              statusValue: regulationResponse.data.status,
              dataExists: 'data' in regulationResponse.data,
              dataValue: regulationResponse.data.data,
            });

            if (!('status' in regulationResponse.data) || regulationResponse.data.status !== 'success') {
              throw new Error(`API không trả về status: success. Response: ${JSON.stringify(regulationResponse.data)}`);
            }

            if (!('data' in regulationResponse.data) || !regulationResponse.data.data) {
              throw new Error(`API không trả về data hợp lệ. Response: ${JSON.stringify(regulationResponse.data)}`);
            }

            setRegulation(regulationResponse.data.data);
            console.log('Step 2: Set regulation:', regulationResponse.data.data);
          } catch (detailsErr) {
            console.error('Step 2 failed:', detailsErr.message);
            setError('Không thể tải dữ liệu quy định Goal Rules: ' + detailsErr.message);
          }
        } else {
          setError('Không tìm thấy ID mùa giải để lấy quy định.');
          console.log('Invalid seasonId:', seasonId);
        }
      };

      fetchTeam1Players();
      fetchTeam2Players();
      fetchRegulation();
    } else {
      setError('Dữ liệu trận đấu không hợp lệ hoặc thiếu thông tin đội.');
    }
  }, [editingMatch]);

  const validateScore = (score) => {
    const scoreRegex = /^[0-9]+-[0-9]+$/;
    return score === '' || scoreRegex.test(score);
  };

  const validateGoalDetails = (score, goalDetails) => {
    if (!score) return true;

    const [team1Goals, team2Goals] = score.split('-').map(Number);
    const totalGoals = team1Goals + team2Goals;

    const team1Scorers = goalDetails.filter((goal) =>
      team1Players.some((player) => player._id === (goal.playerId || goal.player_id))
    ).length;
    const team2Scorers = goalDetails.filter((goal) =>
      team2Players.some((player) => player._id === (goal.playerId || goal.player_id))
    ).length;

    if (team1Scorers !== team1Goals) {
      return `Số cầu thủ ghi bàn cho đội 1 (${team1Scorers}) không khớp với số bàn thắng (${team1Goals}).`;
    }
    if (team2Scorers !== team2Goals) {
      return `Số cầu thủ ghi bàn cho đội 2 (${team2Scorers}) không khớp với số bàn thắng (${team2Goals}).`;
    }
    if (goalDetails.length !== totalGoals) {
      return `Tổng số cầu thủ ghi bàn (${goalDetails.length}) không khớp với tổng số bàn thắng (${totalGoals}).`;
    }

    for (const goal of goalDetails) {
      const playerId = goal.playerId || goal.player_id;
      const playerInTeam1 = team1Players.some((player) => player._id === playerId);
      const playerInTeam2 = team2Players.some((player) => player._id === playerId);
      if (!playerInTeam1 && !playerInTeam2) {
        return `Cầu thủ với ID ${playerId} không tồn tại trong danh sách cầu thủ của hai đội.`;
      }

      if (regulation) {
        const minMinute = regulation.rules.goalTimeLimit?.minMinute || 0;
        const maxMinute = regulation.rules.goalTimeLimit?.maxMinute || 120;
        if (goal.minute < minMinute || goal.minute > maxMinute) {
          return `Phút ghi bàn phải nằm trong khoảng từ ${minMinute} đến ${maxMinute}.`;
        }
        if (!regulation.rules.goalTypes.includes(goal.goalType)) {
          return `Loại bàn thắng ${goal.goalType} không được phép theo quy định.`;
        }
      }
    }

    return true;
  };

  const handleGoalDetailChange = (index, field, value) => {
    const newGoalDetails = [...goalDetails];
    newGoalDetails[index] = { ...newGoalDetails[index], [field]: value };
    setGoalDetails(newGoalDetails);
  };

  const addGoalDetail = () => {
    setGoalDetails([...goalDetails, { playerId: '', minute: '', goalType: regulation?.rules?.goalTypes[0] || 'normal', teamId: '' }]);
  };

  const removeGoalDetail = (index) => {
    setGoalDetails(goalDetails.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    console.log('Token:', token);
    if (!token) {
      setError('Vui lòng đăng nhập để thực hiện hành động này.');
      setLoading(false);
      return;
    }

    if (!editingMatch) {
      setError('Chức năng tạo mới trận đấu không được hỗ trợ ở đây.');
      setLoading(false);
      return;
    }

    if (!validateScore(formData.score)) {
      setError('Tỉ số phải có định dạng x-y (ví dụ: 0-0)');
      setLoading(false);
      return;
    }

    const goalValidation = validateGoalDetails(formData.score, goalDetails);
    if (goalValidation !== true) {
      setError(goalValidation);
      setLoading(false);
      return;
    }

    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      setError('Ngày thi đấu không hợp lệ. Vui lòng chọn ngày hợp lệ (YYYY-MM-DD).');
      setLoading(false);
      return;
    }

    try {
      const matchId = editingMatch && (editingMatch.id || editingMatch._id);
      console.log('matchId:', matchId);
      if (!matchId) {
        setError('Không tìm thấy ID trận đấu để cập nhật.');
        setLoading(false);
        return;
      }

      if (formData.team1Name && formData.team1Name !== editingMatch.team1?.team_name) {
        const team1Id = editingMatch.team1?._id;
        if (!team1Id || typeof team1Id !== 'string') {
          setError('Không tìm thấy ID đội 1 để cập nhật tên.');
          setLoading(false);
          return;
        }

        try {
          await axios.put(`http://localhost:5000/api/teams/${team1Id}`, {
            team_name: formData.team1Name,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (apiError) {
          if (apiError.response?.status === 404) {
            setError('Không tìm thấy đội 1 để cập nhật tên.');
            setLoading(false);
            return;
          }
          throw apiError;
        }
      }

      if (formData.team2Name && formData.team2Name !== editingMatch.team2?.team_name) {
        const team2Id = editingMatch.team2?._id;
        if (!team2Id || typeof team2Id !== 'string') {
          setError('Không tìm thấy ID đội 2 để cập nhật tên.');
          setLoading(false);
          return;
        }

        try {
          await axios.put(`http://localhost:5000/api/teams/${team2Id}`, {
            team_name: formData.team2Name,
          }, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (apiError) {
          if (apiError.response?.status === 404) {
            setError('Không tìm thấy đội 2 để cập nhật tên.');
            setLoading(false);
            return;
          }
          throw apiError;
        }
      }

      const matchPayload = {
        date: new Date(formData.date).toISOString(),
        stadium: formData.stadium,
        score: formData.score || '0-0',
        goalDetails: goalDetails.map(goal => {
          const playerId = goal.playerId || goal.player_id;
          const playerInTeam1 = team1Players.find((player) => player._id === playerId);
          const playerInTeam2 = team2Players.find((player) => player._id === playerId);
          const teamId = playerInTeam1 ? editingMatch.team1._id : playerInTeam2 ? editingMatch.team2._id : null;

          if (!teamId) {
            throw new Error(`Không tìm thấy đội cho cầu thủ với ID ${playerId}`);
          }

          return {
            player_id: playerId,
            team_id: teamId,
            minute: parseInt(goal.minute, 10),
            goalType: goal.goalType,
          };
        }),
      };

      let response;
      response = await axios.put(`http://localhost:5000/api/matches/${matchId}`, matchPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatches((prev) =>
        prev.map((match) => (match.id === matchId || match._id === matchId ? {
          ...response.data.data,
          team1: { ...match.team1, team_name: formData.team1Name },
          team2: { ...match.team2, team_name: formData.team2Name },
        } : match))
      );

      try {
        console.log('Calling team_result API with matchId:', matchId);
        await axios.put(`http://localhost:5000/api/team_results/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (apiError) {
        console.error('team_result API error:', apiError.response?.data || apiError.message);
        if (apiError.response?.status === 404) {
          setError(`Không tìm thấy trận đấu để cập nhật kết quả đội với matchId: ${matchId}`);
          setLoading(false);
          return;
        }
        throw apiError;
      }

      try {
        await axios.put(`http://localhost:5000/api/player_results/match/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          setError('Không tìm thấy trận đấu để cập nhật kết quả cầu thủ.');
          setLoading(false);
          return;
        }
        throw apiError;
      }

      try {
        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        await axios.put(`http://localhost:5000/api/rankings/${seasonId}`, {
          match_date: formData.date,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          setError('Không tìm thấy kết quả đội để cập nhật bảng xếp hạng đội.');
          setLoading(false);
          return;
        }
        throw apiError;
      }

      try {
        await axios.put(`http://localhost:5000/api/player_rankings/match/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (apiError) {
        if (apiError.response?.status === 404) {
          setError('Không tìm thấy trận đấu để cập nhật bảng xếp hạng cầu thủ.');
          setLoading(false);
          return;
        }
        throw apiError;
      }

      setSuccess('Cập nhật trận đấu, tên đội, kết quả cầu thủ, bảng xếp hạng thành công!');

      setFormData({
        date: '',
        stadium: '',
        score: '',
        team1Name: '',
        team2Name: '',
      });
      setGoalDetails([]);
      setTimeout(() => {
        setShowForm(false);
        setEditingMatch(null);
      }, 1500);
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      if (err.response?.status === 500) {
        setError('Đã có lỗi xảy ra trên server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc server.');
      } else {
        setError(err.response?.data?.message || 'Không thể lưu trận đấu hoặc cập nhật kết quả.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {editingMatch ? 'Sửa Trận Đấu' : 'Thêm Trận Đấu'}
      </h2>
      {error && (
        <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-center font-medium">{error}</p>
      )}
      {success && (
        <p className="text-green-600 bg-green-100 p-3 rounded-lg mb-4 text-center font-medium">{success}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đội 1</label>
            <input
              type="text"
              value={formData.team1Name}
              onChange={(e) => setFormData({ ...formData, team1Name: e.target.value })}
              placeholder="Nhập tên đội 1"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required={!!editingMatch}
              disabled={!editingMatch}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đội 2</label>
            <input
              type="text"
              value={formData.team2Name}
              onChange={(e) => setFormData({ ...formData, team2Name: e.target.value })}
              placeholder="Nhập tên đội 2"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required={!!editingMatch}
              disabled={!editingMatch}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Thi Đấu</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sân Vận Động</label>
            <input
              type="text"
              value={formData.stadium}
              onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
              placeholder="Nhập tên sân vận động"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉ Số</label>
            <input
              type="text"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="Tỉ số (ví dụ: 0-0)"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cầu Thủ Ghi Bàn</label>
          {goalDetails.map((goal, index) => (
            <div key={index} className="flex flex-wrap items-center space-x-3 mb-3 p-3 bg-white rounded-lg shadow-sm">
              <select
                value={goal.playerId || goal.player_id || ''}
                onChange={(e) => handleGoalDetailChange(index, 'playerId', e.target.value)}
                className="flex-1 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                <option value="">Chọn cầu thủ</option>
                <optgroup label="Đội 1">
                  {team1Players.map((player) => (
                    <option key={player._id} value={player._id}>
                      {player.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Đội 2">
                  {team2Players.map((player) => (
                    <option key={player._id} value={player._id}>
                      {player.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                type="number"
                value={goal.minute || ''}
                onChange={(e) => handleGoalDetailChange(index, 'minute', e.target.value)}
                placeholder="Phút ghi bàn"
                className="w-24 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
                min={regulation?.rules?.goalTimeLimit?.minMinute || 0}
                max={regulation?.rules?.goalTimeLimit?.maxMinute || 120}
              />
              <select
                value={goal.goalType || ''}
                onChange={(e) => handleGoalDetailChange(index, 'goalType', e.target.value)}
                className="w-32 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              >
                {regulation?.rules?.goalTypes?.length > 0 ? (
                  regulation.rules.goalTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))
                ) : (
                  <option value="normal">normal</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => removeGoalDetail(index)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                Xóa
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addGoalDetail}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition shadow-sm mt-2"
          >
            Thêm Cầu Thủ Ghi Bàn
          </button>
        </div>
        <div className="flex justify-center space-x-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-sm"
            disabled={loading}
          >
            {loading ? 'Đang Lưu...' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300 shadow-sm"
            disabled={loading}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;