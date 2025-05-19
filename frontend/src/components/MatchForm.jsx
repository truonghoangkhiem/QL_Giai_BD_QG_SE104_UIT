import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const [formData, setFormData] = useState({
    date: '',
    time: '15:00', // Mặc định một giờ phổ biến, ví dụ 15:00
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
    if (editingMatch && editingMatch.team1 && editingMatch.team2) {
      const matchDateObj = editingMatch.date ? new Date(editingMatch.date) : null;
      
      let initialTime = '15:00'; // Giờ mặc định
      if (matchDateObj) {
        const hours = String(matchDateObj.getHours()).padStart(2, '0');
        const minutes = String(matchDateObj.getMinutes()).padStart(2, '0');
        // Chỉ gán nếu giờ và phút hợp lệ từ đối tượng Date
        if (hours !== "NaN" && minutes !== "NaN" && !isNaN(parseInt(hours)) && !isNaN(parseInt(minutes)) ) {
             initialTime = `${hours}:${minutes}`;
        }
      }

      setFormData({
        date: matchDateObj ? matchDateObj.toISOString().split('T')[0] : '',
        time: initialTime,
        stadium: editingMatch.stadium || '',
        score: editingMatch.score === null ? '' : (editingMatch.score || ''),
        team1Name: editingMatch.team1?.team_name || '',
        team2Name: editingMatch.team2?.team_name || '',
      });

      setGoalDetails(editingMatch.goalDetails?.map(goal => ({
        playerId: goal.player_id,
        minute: goal.minute,
        goalType: goal.goalType || 'normal',
        teamId: goal.team_id,
      })) || []);

      const fetchPlayers = async (teamId, setPlayersFn, teamName) => {
        if (teamId && typeof teamId === 'string') {
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${teamId}`);
            setPlayersFn(response.data.data || []);
          } catch (err) {
            console.error(`Lỗi lấy cầu thủ đội ${teamName} (ID: ${teamId}):`, err.response?.data || err.message);
          }
        }
      };
      
      fetchPlayers(editingMatch.team1?._id, setTeam1Players, editingMatch.team1?.team_name);
      fetchPlayers(editingMatch.team2?._id, setTeam2Players, editingMatch.team2?.team_name);

      const fetchRegulation = async () => {
        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        if (seasonId && typeof seasonId === 'string') {
          let regulationId;
          try {
            const idResponse = await axios.get(`http://localhost:5000/api/regulations/${seasonId}/Goal%20Rules`);
            if (idResponse.data && idResponse.data.status === 'success' && typeof idResponse.data.data === 'string') {
              regulationId = idResponse.data.data;
            } else { throw new Error('API không trả về ID quy định Goal Rules hợp lệ.'); }
          } catch (idErr) {
            console.error('Lỗi lấy ID quy định Goal Rules:', idErr.message);
            return;
          }
          try {
            const regulationResponse = await axios.get(`http://localhost:5000/api/regulations/${regulationId}`);
            if (regulationResponse.data && regulationResponse.data.status === 'success' && regulationResponse.data.data) {
              setRegulation(regulationResponse.data.data);
            } else { throw new Error('API không trả về dữ liệu quy định Goal Rules hợp lệ.'); }
          } catch (detailsErr) {
            console.error('Lỗi tải dữ liệu quy định Goal Rules:', detailsErr.message);
          }
        }
      };
      fetchRegulation();
    }
  }, [editingMatch]);

  const validateScore = (score) => {
    if (score === '' || score === null) return true;
    const scoreRegex = /^[0-9]+-[0-9]+$/;
    return scoreRegex.test(score);
  };

  const validateGoalDetails = (currentScore, currentGoalDetails) => {
    if (!currentScore || !/^\d+-\d+$/.test(currentScore)) {
        if (currentGoalDetails.length > 0) return "Không thể nhập chi tiết bàn thắng khi chưa có tỉ số hợp lệ.";
        return true;
    }
    const [team1Goals, team2Goals] = currentScore.split('-').map(Number);
    const totalGoalsInScore = team1Goals + team2Goals;
    if (currentGoalDetails.length !== totalGoalsInScore) return `Tổng số bàn thắng trong chi tiết (${currentGoalDetails.length}) không khớp với tỉ số (${totalGoalsInScore}).`;
    
    let team1ScorersCount = 0;
    let team2ScorersCount = 0;
    for (const goal of currentGoalDetails) {
      const playerId = goal.playerId || goal.player_id;
      const playerInTeam1 = team1Players.some((player) => player._id === playerId);
      const playerInTeam2 = team2Players.some((player) => player._id === playerId);
      if (!playerInTeam1 && !playerInTeam2) return `Cầu thủ ID ${playerId} không thuộc hai đội.`;
      
      // Xác định đội của cầu thủ ghi bàn để cộng bàn thắng cho đúng đội
      const goalScoringTeamId = playerInTeam1 ? editingMatch.team1._id : (playerInTeam2 ? editingMatch.team2._id : null);
      if (!goalScoringTeamId) return `Không xác định được đội cho cầu thủ ID ${playerId}.`;

      if (goalScoringTeamId === editingMatch.team1._id) team1ScorersCount++;
      else if (goalScoringTeamId === editingMatch.team2._id) team2ScorersCount++;


      if (regulation && regulation.rules?.goalTimeLimit) {
        const minMinute = regulation.rules.goalTimeLimit.minMinute || 0;
        const maxMinute = regulation.rules.goalTimeLimit.maxMinute || 120; 
        if (goal.minute < minMinute || goal.minute > maxMinute) return `Phút ghi bàn '${goal.minute}' phải từ ${minMinute} đến ${maxMinute}.`;
      }
      if (regulation && regulation.rules?.goalTypes && !regulation.rules.goalTypes.includes(goal.goalType)) {
        return `Loại bàn thắng '${goal.goalType}' không được phép.`;
      }
    }
    
    if (team1ScorersCount !== team1Goals) return `Số bàn thắng của ${formData.team1Name} trong chi tiết (${team1ScorersCount}) không khớp với tỉ số (${team1Goals}).`;
    if (team2ScorersCount !== team2Goals) return `Số bàn thắng của ${formData.team2Name} trong chi tiết (${team2ScorersCount}) không khớp với tỉ số (${team2Goals}).`;

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
      setError('Vui lòng đăng nhập.');
      setLoading(false);
      return;
    }
    if (!editingMatch) {
      setError('Không có thông tin trận đấu để sửa.');
      setLoading(false);
      return;
    }
    
    const currentScore = formData.score.trim();
    if (!validateScore(currentScore)) {
      setError('Tỉ số phải dạng số-số (vd: 2-1) hoặc để trống.');
      setLoading(false);
      return;
    }
    
    if (currentScore && /^\d+-\d+$/.test(currentScore)) {
        const goalValidation = validateGoalDetails(currentScore, goalDetails);
        if (goalValidation !== true) {
          setError(goalValidation);
          setLoading(false);
          return;
        }
    } else if (goalDetails.length > 0 && (!currentScore || !/^\d+-\d+$/.test(currentScore))) {
        setError("Không thể có chi tiết bàn thắng khi chưa có tỉ số hợp lệ.");
        setLoading(false);
        return;
    }

    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      setError('Ngày thi đấu không hợp lệ.');
      setLoading(false);
      return;
    }
    if (!formData.time) {
        setError('Giờ thi đấu không được để trống.');
        setLoading(false);
        return;
    }

    try {
      const matchId = editingMatch.id || editingMatch._id;
      if (!matchId) {
        setError('Không tìm thấy ID trận đấu.');
        setLoading(false);
        return;
      }

      // Kết hợp ngày và giờ. Tạo đối tượng Date từ ngày và giờ đã nhập.
      // formData.date là "YYYY-MM-DD", formData.time là "HH:mm"
      const [hours, minutes] = formData.time.split(':').map(Number);
      const matchDateTime = new Date(formData.date);
      matchDateTime.setHours(hours, minutes, 0, 0); // Đặt giờ và phút theo client timezone

      const matchPayload = {
        date: matchDateTime.toISOString(), // Gửi lên server dưới dạng ISO string (UTC)
        stadium: formData.stadium,
        score: currentScore === '' ? null : currentScore, 
        goalDetails: (currentScore === '' || currentScore === null) ? [] : goalDetails.map(goal => {
          const playerId = goal.playerId || goal.player_id;
          const playerInTeam1 = team1Players.find((player) => player._id === playerId);
          // Mặc định là bàn thắng cho team1 nếu không xác định được, hoặc cần logic chọn đội rõ ràng hơn khi nhập
          const teamIdForGoal = playerInTeam1 ? editingMatch.team1._id : editingMatch.team2._id; 
          if (!teamIdForGoal) { // Kiểm tra nếu không tìm thấy teamId cho cầu thủ
             throw new Error(`Không thể xác định đội cho cầu thủ ID: ${playerId}. Vui lòng chọn cầu thủ thuộc một trong hai đội.`);
          }
          return {
            player_id: playerId,
            team_id: teamIdForGoal, 
            minute: parseInt(goal.minute, 10),
            goalType: goal.goalType,
          };
        }),
      };

      const matchUpdateResponse = await axios.put(`http://localhost:5000/api/matches/${matchId}`, matchPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Cập nhật lại state matches ở trang danh sách
      setMatches((prevMatches) =>
        prevMatches.map((m) =>
          (m.id === matchId || m._id === matchId)
            ? { ...m, ...matchUpdateResponse.data.data } // Cập nhật toàn bộ thông tin trận đấu từ response
            : m
        )
      );
      
      if (matchPayload.score !== null && /^\d+-\d+$/.test(matchPayload.score)) {
        await axios.put(`http://localhost:5000/api/team_results/${matchId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios.put(`http://localhost:5000/api/player_results/match/${matchId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        
        const seasonIdToUpdateRanking = editingMatch.season_id?._id || editingMatch.season_id;
        await axios.put(`http://localhost:5000/api/rankings/${seasonIdToUpdateRanking}`, 
          { match_date: matchDateTime.toISOString().split('T')[0] }, // Chỉ cần ngày cho API ranking
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await axios.put(`http://localhost:5000/api/player_rankings/match/${matchId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setSuccess('Cập nhật trận đấu và các kết quả liên quan thành công!');
      } else {
        setSuccess('Cập nhật thông tin trận đấu thành công (không có tỉ số để cập nhật kết quả).');
      }

      setTimeout(() => {
        setShowForm(false);
        setEditingMatch(null);
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'Không thể lưu trận đấu.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {editingMatch ? 'Sửa Trận Đấu' : 'Thêm Trận Đấu'}
      </h2>
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-center font-medium">{error}</p>}
      {success && <p className="text-green-600 bg-green-100 p-3 rounded-lg mb-4 text-center font-medium">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đội 1: {formData.team1Name}</label>
             {/* Tên đội không cho sửa trực tiếp ở form này */}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đội 2: {formData.team2Name}</label>
             {/* Tên đội không cho sửa trực tiếp ở form này */}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="match-date" className="block text-sm font-medium text-gray-700 mb-1">Ngày Thi Đấu</label>
            <input
              id="match-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="match-time" className="block text-sm font-medium text-gray-700 mb-1">Giờ Thi Đấu</label>
            <input
              id="match-time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              required
            />
          </div>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="stadium" className="block text-sm font-medium text-gray-700 mb-1">Sân Vận Động</label>
                <input
                id="stadium"
                type="text"
                value={formData.stadium}
                onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                placeholder="Sân vận động"
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
                />
            </div>
            <div>
                <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">Tỉ Số (vd: 2-1, trống nếu chưa đá)</label>
                <input
                id="score"
                type="text"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="x-y"
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                />
            </div>
        </div>

        {(formData.score && /^\d+-\d+$/.test(formData.score)) && (
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cầu Thủ Ghi Bàn</label>
            {goalDetails.map((goal, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg shadow-sm items-center">
                    <div className="sm:col-span-2">
                        <label htmlFor={`goal-player-${index}`} className="text-xs text-gray-600">Cầu thủ</label>
                        <select
                            id={`goal-player-${index}`}
                            value={goal.playerId || ''}
                            onChange={(e) => handleGoalDetailChange(index, 'playerId', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                            required
                        >
                            <option value="">Chọn cầu thủ</option>
                            <optgroup label={formData.team1Name || "Đội 1"}>
                            {team1Players.map((player) => ( <option key={player._id} value={player._id}> {player.name} (#{player.number}) </option> ))}
                            </optgroup>
                            <optgroup label={formData.team2Name || "Đội 2"}>
                            {team2Players.map((player) => ( <option key={player._id} value={player._id}> {player.name} (#{player.number}) </option> ))}
                            </optgroup>
                        </select>
                    </div>
                     <div>
                        <label htmlFor={`goal-minute-${index}`} className="text-xs text-gray-600">Phút</label>
                        <input
                            id={`goal-minute-${index}`}
                            type="number"
                            value={goal.minute || ''}
                            onChange={(e) => handleGoalDetailChange(index, 'minute', e.target.value)}
                            placeholder="Phút"
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                            required
                            min={regulation?.rules?.goalTimeLimit?.minMinute || 0}
                            max={regulation?.rules?.goalTimeLimit?.maxMinute || 120}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor={`goal-type-${index}`} className="text-xs text-gray-600">Loại</label>
                            <select
                                id={`goal-type-${index}`}
                                value={goal.goalType || 'normal'}
                                onChange={(e) => handleGoalDetailChange(index, 'goalType', e.target.value)}
                                className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                                required
                            >
                                {regulation?.rules?.goalTypes?.length > 0 ? (
                                regulation.rules.goalTypes.map((type) => ( <option key={type} value={type}> {type.charAt(0).toUpperCase() + type.slice(1)} </option> ))
                                ) : ( <option value="normal">Normal</option> )}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeGoalDetail(index)}
                            className="bg-red-500 text-white px-2.5 py-2 rounded-lg hover:bg-red-600 transition shadow-sm text-sm"
                        > Xóa </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={addGoalDetail}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition shadow-sm mt-2 text-sm"
            >
                Thêm Bàn Thắng
            </button>
            </div>
        )}

        <div className="flex justify-center space-x-4 pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-md"
            disabled={loading}
          >
            {loading ? 'Đang Lưu...' : (editingMatch ? 'Lưu Thay Đổi' : 'Thêm Trận')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setEditingMatch(null); 
              setError(''); 
              setSuccess(''); 
            }}
            className="bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300 shadow-md"
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