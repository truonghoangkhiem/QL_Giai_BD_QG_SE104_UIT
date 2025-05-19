import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const [formData, setFormData] = useState({
    date: '',
    stadium: '',
    score: '', // Để trống nếu chưa có tỉ số
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
    if (editingMatch && editingMatch.team1 && editingMatch.team2) {
      setFormData({
        date: editingMatch.date ? new Date(editingMatch.date).toISOString().split('T')[0] : '',
        stadium: editingMatch.stadium || '',
        // Nếu score là null từ backend, hiển thị là chuỗi rỗng trong form
        score: editingMatch.score === null ? '' : (editingMatch.score || ''),
        team1Name: editingMatch.team1?.team_name || '',
        team2Name: editingMatch.team2?.team_name || '',
      });

      setGoalDetails(editingMatch.goalDetails?.map(goal => ({
        playerId: goal.player_id, // Đảm bảo sử dụng đúng key
        minute: goal.minute,
        goalType: goal.goalType || 'normal',
        teamId: goal.team_id,
      })) || []);

      const fetchPlayers = async (teamId, setPlayersFn) => {
        if (teamId && typeof teamId === 'string') {
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${teamId}`);
            setPlayersFn(response.data.data || []);
          } catch (err) {
            console.error(`Lỗi lấy cầu thủ đội ${teamId}:`, err.response?.data || err.message);
            setError(`Không thể tải danh sách cầu thủ đội ${teamId}: ${err.response?.data?.message || err.message}`);
          }
        } else {
          setError(`Không tìm thấy ID đội để lấy danh sách cầu thủ.`);
        }
      };
      
      fetchPlayers(editingMatch.team1?._id, setTeam1Players);
      fetchPlayers(editingMatch.team2?._id, setTeam2Players);

      const fetchRegulation = async () => {
        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        if (seasonId && typeof seasonId === 'string') {
          let regulationId;
          try {
            const idResponse = await axios.get(
              `http://localhost:5000/api/regulations/${seasonId}/Goal%20Rules`
            );
            if (idResponse.data && idResponse.data.status === 'success' && typeof idResponse.data.data === 'string') {
              regulationId = idResponse.data.data;
            } else {
              throw new Error('API không trả về ID quy định hợp lệ.');
            }
          } catch (idErr) {
            console.error('Lỗi lấy ID quy định Goal Rules:', idErr.message);
            setError('Không thể lấy ID quy định Goal Rules: ' + idErr.message);
            return;
          }

          try {
            const regulationResponse = await axios.get(
              `http://localhost:5000/api/regulations/${regulationId}`
            );
            if (regulationResponse.data && regulationResponse.data.status === 'success' && regulationResponse.data.data) {
              setRegulation(regulationResponse.data.data);
            } else {
              throw new Error('API không trả về dữ liệu quy định hợp lệ.');
            }
          } catch (detailsErr) {
            console.error('Lỗi tải dữ liệu quy định Goal Rules:', detailsErr.message);
            setError('Không thể tải dữ liệu quy định Goal Rules: ' + detailsErr.message);
          }
        } else {
          setError('Không tìm thấy ID mùa giải để lấy quy định.');
        }
      };
      fetchRegulation();
    } else {
      setError('Dữ liệu trận đấu không hợp lệ hoặc thiếu thông tin đội.');
    }
  }, [editingMatch]);

  const validateScore = (score) => {
    // Cho phép tỉ số rỗng (sẽ được gửi là null) hoặc dạng số-số
    if (score === '' || score === null) return true;
    const scoreRegex = /^[0-9]+-[0-9]+$/;
    return scoreRegex.test(score);
  };

  const validateGoalDetails = (currentScore, currentGoalDetails) => {
    if (!currentScore || !/^\d+-\d+$/.test(currentScore)) { // Nếu không có tỉ số hoặc tỉ số không hợp lệ, không cần validate goalDetails
        if (currentGoalDetails.length > 0) {
            return "Không thể nhập chi tiết bàn thắng khi chưa có tỉ số hợp lệ.";
        }
        return true;
    }

    const [team1Goals, team2Goals] = currentScore.split('-').map(Number);
    const totalGoalsInScore = team1Goals + team2Goals;

    if (currentGoalDetails.length !== totalGoalsInScore) {
      return `Tổng số bàn thắng trong chi tiết (${currentGoalDetails.length}) không khớp với tỉ số (${totalGoalsInScore}).`;
    }
    
    let team1ScorersCount = 0;
    let team2ScorersCount = 0;

    for (const goal of currentGoalDetails) {
      const playerId = goal.playerId || goal.player_id; // Sử dụng cả hai key để tương thích
      const playerInTeam1 = team1Players.some((player) => player._id === playerId);
      const playerInTeam2 = team2Players.some((player) => player._id === playerId);

      if (!playerInTeam1 && !playerInTeam2) {
        return `Cầu thủ với ID ${playerId} không tồn tại trong danh sách cầu thủ của hai đội.`;
      }
      if (playerInTeam1) team1ScorersCount++;
      if (playerInTeam2) team2ScorersCount++;

      if (regulation) {
        const minMinute = regulation.rules.goalTimeLimit?.minMinute || 0;
        const maxMinute = regulation.rules.goalTimeLimit?.maxMinute || 120; // Giả sử trận đấu tối đa 120 phút
        if (goal.minute < minMinute || goal.minute > maxMinute) {
          return `Phút ghi bàn '${goal.minute}' không hợp lệ. Phải nằm trong khoảng từ ${minMinute} đến ${maxMinute}.`;
        }
        if (!regulation.rules.goalTypes.includes(goal.goalType)) {
          return `Loại bàn thắng '${goal.goalType}' không được phép theo quy định.`;
        }
      }
    }
    
    if (team1ScorersCount !== team1Goals) {
        return `Số bàn thắng của Đội 1 trong chi tiết (${team1ScorersCount}) không khớp với tỉ số (${team1Goals}).`;
    }
    if (team2ScorersCount !== team2Goals) {
        return `Số bàn thắng của Đội 2 trong chi tiết (${team2ScorersCount}) không khớp với tỉ số (${team2Goals}).`;
    }

    return true;
  };

  const handleGoalDetailChange = (index, field, value) => {
    const newGoalDetails = [...goalDetails];
    newGoalDetails[index] = { ...newGoalDetails[index], [field]: value };
    setGoalDetails(newGoalDetails);
  };

  const addGoalDetail = () => {
    setGoalDetails([...goalDetails, { playerId: '', minute: '', goalType: regulation?.rules?.goalTypes?.[0] || 'normal', teamId: '' }]);
  };

  const removeGoalDetail = (index) => {
    setGoalDetails(goalDetails.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!token) {
      setError('Vui lòng đăng nhập để thực hiện hành động này.');
      setLoading(false);
      return;
    }

    if (!editingMatch) {
      setError('Không có thông tin trận đấu để chỉnh sửa.');
      setLoading(false);
      return;
    }
    
    const currentScore = formData.score.trim(); // Lấy score từ form, bỏ khoảng trắng thừa

    if (!validateScore(currentScore)) {
      setError('Tỉ số phải có định dạng số-số (ví dụ: 2-1) hoặc để trống nếu chưa có tỉ số.');
      setLoading(false);
      return;
    }
    
    // Nếu có tỉ số, thì mới validate goalDetails
    if (currentScore && /^\d+-\d+$/.test(currentScore)) {
        const goalValidation = validateGoalDetails(currentScore, goalDetails);
        if (goalValidation !== true) {
          setError(goalValidation);
          setLoading(false);
          return;
        }
    } else if (goalDetails.length > 0 && (!currentScore || !/^\d+-\d+$/.test(currentScore))) {
        // Nếu không có tỉ số hợp lệ nhưng lại có goalDetails
        setError("Không thể có chi tiết bàn thắng khi chưa nhập tỉ số hợp lệ.");
        setLoading(false);
        return;
    }


    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      setError('Ngày thi đấu không hợp lệ. Vui lòng chọn ngày hợp lệ (YYYY-MM-DD).');
      setLoading(false);
      return;
    }

    try {
      const matchId = editingMatch.id || editingMatch._id;
      if (!matchId) {
        setError('Không tìm thấy ID trận đấu để cập nhật.');
        setLoading(false);
        return;
      }

      // Cập nhật tên đội nếu có thay đổi
      const teamUpdatePromises = [];
      if (formData.team1Name && formData.team1Name !== editingMatch.team1?.team_name) {
        const team1Id = editingMatch.team1?._id;
        if (team1Id) {
          teamUpdatePromises.push(axios.put(`http://localhost:5000/api/teams/${team1Id}`, 
            { team_name: formData.team1Name }, 
            { headers: { Authorization: `Bearer ${token}` } }
          ));
        }
      }
      if (formData.team2Name && formData.team2Name !== editingMatch.team2?.team_name) {
        const team2Id = editingMatch.team2?._id;
        if (team2Id) {
          teamUpdatePromises.push(axios.put(`http://localhost:5000/api/teams/${team2Id}`, 
            { team_name: formData.team2Name }, 
            { headers: { Authorization: `Bearer ${token}` } }
          ));
        }
      }
      await Promise.all(teamUpdatePromises);
      
      const matchPayload = {
        date: new Date(formData.date).toISOString(),
        stadium: formData.stadium,
        // Gửi null nếu score là chuỗi rỗng, ngược lại gửi giá trị score
        score: currentScore === '' ? null : currentScore, 
        goalDetails: (currentScore === '' || currentScore === null) ? [] : goalDetails.map(goal => {
          const playerId = goal.playerId || goal.player_id;
          const playerInTeam1 = team1Players.find((player) => player._id === playerId);
          const teamId = playerInTeam1 ? editingMatch.team1._id : editingMatch.team2._id;
          return {
            player_id: playerId,
            team_id: teamId,
            minute: parseInt(goal.minute, 10),
            goalType: goal.goalType,
          };
        }),
      };

      const matchUpdateResponse = await axios.put(`http://localhost:5000/api/matches/${matchId}`, matchPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Cập nhật state `matches` ngay sau khi cập nhật trận đấu thành công
      setMatches((prevMatches) =>
        prevMatches.map((m) =>
          (m.id === matchId || m._id === matchId)
            ? { ...m, ...matchUpdateResponse.data.data, 
                team1: { ...m.team1, team_name: formData.team1Name }, // Cập nhật tên đội nếu thay đổi
                team2: { ...m.team2, team_name: formData.team2Name } 
              }
            : m
        )
      );
      
      // Chỉ gọi API cập nhật kết quả & ranking nếu trận đấu có tỉ số hợp lệ
      if (matchPayload.score !== null && /^\d+-\d+$/.test(matchPayload.score)) {
        await axios.put(`http://localhost:5000/api/team_results/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await axios.put(`http://localhost:5000/api/player_results/match/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const seasonIdToUpdateRanking = editingMatch.season_id?._id || editingMatch.season_id;
        await axios.put(`http://localhost:5000/api/rankings/${seasonIdToUpdateRanking}`, {
          match_date: formData.date,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await axios.put(`http://localhost:5000/api/player_rankings/match/${matchId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
         setSuccess('Cập nhật trận đấu và các kết quả liên quan thành công!');
      } else {
        setSuccess('Cập nhật thông tin trận đấu thành công (không có tỉ số để cập nhật kết quả).');
      }


      setFormData({ date: '', stadium: '', score: '', team1Name: '', team2Name: '' });
      setGoalDetails([]);
      setTimeout(() => {
        setShowForm(false);
        setEditingMatch(null);
      }, 1500);

    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'Không thể lưu trận đấu hoặc cập nhật thông tin.';
      if (err.response?.status === 500) {
        setError('Đã có lỗi xảy ra trên server. Vui lòng thử lại sau.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        setError(errorMessage);
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
        {/* Các trường input cho tên đội, ngày, sân, tỉ số */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đội 1</label>
            <input
              type="text"
              value={formData.team1Name}
              onChange={(e) => setFormData({ ...formData, team1Name: e.target.value })}
              placeholder="Tên đội 1"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              disabled={!editingMatch} // Chỉ cho sửa nếu đang editing
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đội 2</label>
            <input
              type="text"
              value={formData.team2Name}
              onChange={(e) => setFormData({ ...formData, team2Name: e.target.value })}
              placeholder="Tên đội 2"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              disabled={!editingMatch} // Chỉ cho sửa nếu đang editing
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
              placeholder="Sân vận động"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tỉ Số (vd: 2-1, bỏ trống nếu chưa đá)</label>
            <input
              type="text"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="x-y"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* Chi tiết bàn thắng - chỉ hiển thị nếu có tỉ số hợp lệ */}
        {(formData.score && /^\d+-\d+$/.test(formData.score)) && (
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cầu Thủ Ghi Bàn</label>
            {goalDetails.map((goal, index) => (
                <div key={index} className="flex flex-wrap items-center space-x-3 mb-3 p-3 bg-white rounded-lg shadow-sm">
                <select
                    value={goal.playerId || ''} // Đảm bảo có giá trị mặc định nếu playerId là undefined
                    onChange={(e) => handleGoalDetailChange(index, 'playerId', e.target.value)}
                    className="flex-1 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    required
                >
                    <option value="">Chọn cầu thủ</option>
                    <optgroup label={formData.team1Name || "Đội 1"}>
                    {team1Players.map((player) => (
                        <option key={player._id} value={player._id}>
                        {player.name} (#{player.number})
                        </option>
                    ))}
                    </optgroup>
                    <optgroup label={formData.team2Name || "Đội 2"}>
                    {team2Players.map((player) => (
                        <option key={player._id} value={player._id}>
                        {player.name} (#{player.number})
                        </option>
                    ))}
                    </optgroup>
                </select>
                <input
                    type="number"
                    value={goal.minute || ''}
                    onChange={(e) => handleGoalDetailChange(index, 'minute', e.target.value)}
                    placeholder="Phút"
                    className="w-24 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    required
                    min={regulation?.rules?.goalTimeLimit?.minMinute || 0}
                    max={regulation?.rules?.goalTimeLimit?.maxMinute || 120}
                />
                <select
                    value={goal.goalType || 'normal'}
                    onChange={(e) => handleGoalDetailChange(index, 'goalType', e.target.value)}
                    className="w-32 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    required
                >
                    {regulation?.rules?.goalTypes?.length > 0 ? (
                    regulation.rules.goalTypes.map((type) => (
                        <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                    ))
                    ) : (
                    <option value="normal">Normal</option>
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
                Thêm Bàn Thắng
            </button>
            </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-sm"
            disabled={loading}
          >
            {loading ? 'Đang Lưu...' : (editingMatch ? 'Lưu Thay Đổi' : 'Thêm Trận')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setEditingMatch(null); // Reset editingMatch khi hủy
              setError(''); // Xóa lỗi khi hủy
              setSuccess(''); // Xóa thông báo thành công khi hủy
            }}
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