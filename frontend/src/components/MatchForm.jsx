import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const initialFormData = {
    date: '',
    time: '15:00',
    stadium: '',
    score: '',
    team1Name: '',
    team2Name: '',
    participatingPlayersTeam1: [],
    participatingPlayersTeam2: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [goalDetails, setGoalDetails] = useState([]);
  
  const [allPlayersOfTeam1, setAllPlayersOfTeam1] = useState([]);
  const [allPlayersOfTeam2, setAllPlayersOfTeam2] = useState([]);

  const [participatingPlayersInMatchT1, setParticipatingPlayersInMatchT1] = useState([]);
  const [participatingPlayersInMatchT2, setParticipatingPlayersInMatchT2] = useState([]);

  const [goalRegulation, setGoalRegulation] = useState(null); // For Goal Rules
  const [ageRegulation, setAgeRegulation] = useState(null); // For Age Regulation (minPlayersPerTeam)

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);


  useEffect(() => {
    if (editingMatch && editingMatch.team1 && editingMatch.team2) {
      const matchDateObj = editingMatch.date ? new Date(editingMatch.date) : null;
      let initialTime = '15:00';
      if (matchDateObj) {
        const hours = String(matchDateObj.getHours()).padStart(2, '0');
        const minutes = String(matchDateObj.getMinutes()).padStart(2, '0');
        if (hours !== "NaN" && minutes !== "NaN" && !isNaN(parseInt(hours)) && !isNaN(parseInt(minutes))) {
          initialTime = `${hours}:${minutes}`;
        }
      }

      const participatingT1Ids = editingMatch.participatingPlayersTeam1?.map(p => typeof p === 'string' ? p : p._id) || [];
      const participatingT2Ids = editingMatch.participatingPlayersTeam2?.map(p => typeof p === 'string' ? p : p._id) || [];

      setFormData({
        date: matchDateObj ? matchDateObj.toISOString().split('T')[0] : '',
        time: initialTime,
        stadium: editingMatch.stadium || '',
        score: editingMatch.score === null ? '' : (editingMatch.score || ''),
        team1Name: editingMatch.team1?.team_name || '',
        team2Name: editingMatch.team2?.team_name || '',
        participatingPlayersTeam1: participatingT1Ids,
        participatingPlayersTeam2: participatingT2Ids,
      });

      setGoalDetails(editingMatch.goalDetails?.map(goal => ({
        playerId: typeof goal.player_id === 'string' ? goal.player_id : goal.player_id?._id,
        minute: goal.minute,
        goalType: goal.goalType || 'normal',
        beneficiaryTeamId: typeof goal.team_id === 'string' ? goal.team_id : goal.team_id?._id,
      })) || []);

      const fetchAllPlayersForTeam = async (teamId, setPlayersFn, teamNameForError) => {
        if (teamId && typeof teamId === 'string') {
          setLoadingPlayers(true);
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${teamId}`);
            const teamPlayersData = response.data.data || [];
            setPlayersFn(teamPlayersData);
            return teamPlayersData;
          } catch (err) {
            console.error(`Lỗi lấy tất cả cầu thủ đội ${teamNameForError} (ID: ${teamId}):`, err.response?.data || err.message);
            setError(`Không thể tải cầu thủ cho đội ${teamNameForError}.`);
            setPlayersFn([]);
            return [];
          } finally {
            setLoadingPlayers(false);
          }
        } else {
           setPlayersFn([]);
           return [];
        }
      };
      
      const initPlayersAndRegulations = async () => {
        const t1Players = await fetchAllPlayersForTeam(editingMatch.team1?._id, setAllPlayersOfTeam1, editingMatch.team1?.team_name);
        const t2Players = await fetchAllPlayersForTeam(editingMatch.team2?._id, setAllPlayersOfTeam2, editingMatch.team2?.team_name);
        
        setParticipatingPlayersInMatchT1(t1Players.filter(p => participatingT1Ids.includes(p._id)));
        setParticipatingPlayersInMatchT2(t2Players.filter(p => participatingT2Ids.includes(p._id)));

        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        if (seasonId && typeof seasonId === 'string') {
          // Fetch Goal Regulation
          try {
            const goalRegIdResponse = await axios.get(`http://localhost:5000/api/regulations/${seasonId}/Goal%20Rules`);
            if (goalRegIdResponse.data && goalRegIdResponse.data.status === 'success' && typeof goalRegIdResponse.data.data === 'string') {
              const goalRegulationResponse = await axios.get(`http://localhost:5000/api/regulations/${goalRegIdResponse.data.data}`);
              if (goalRegulationResponse.data && goalRegulationResponse.data.status === 'success' && goalRegulationResponse.data.data) {
                setGoalRegulation(goalRegulationResponse.data.data);
              }
            }
          } catch (err) {
            console.error('Lỗi tải Goal Rules Regulation:', err.message);
          }

          // Fetch Age Regulation
          try {
            const ageRegIdResponse = await axios.get(`http://localhost:5000/api/regulations/${seasonId}/Age%20Regulation`);
            if (ageRegIdResponse.data && ageRegIdResponse.data.status === 'success' && typeof ageRegIdResponse.data.data === 'string') {
              const ageRegulationResponse = await axios.get(`http://localhost:5000/api/regulations/${ageRegIdResponse.data.data}`);
              if (ageRegulationResponse.data && ageRegulationResponse.data.status === 'success' && ageRegulationResponse.data.data) {
                setAgeRegulation(ageRegulationResponse.data.data);
              }
            }
          } catch (err) {
            console.error('Lỗi tải Age Rules Regulation:', err.message);
            // setError("Không thể tải quy định về tuổi, không thể xác thực số lượng cầu thủ tối thiểu.");
          }
        }
      };
      initPlayersAndRegulations();

    } else {
        setFormData(initialFormData);
        setGoalDetails([]);
        setAllPlayersOfTeam1([]);
        setAllPlayersOfTeam2([]);
        setParticipatingPlayersInMatchT1([]);
        setParticipatingPlayersInMatchT2([]);
        setGoalRegulation(null);
        setAgeRegulation(null);
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
    const [team1GoalsInScore, team2GoalsInScore] = currentScore.split('-').map(Number);
    const totalGoalsInScore = team1GoalsInScore + team2GoalsInScore;

    if (currentGoalDetails.length !== totalGoalsInScore) {
        return `Tổng số bàn thắng trong chi tiết (${currentGoalDetails.length}) không khớp với tỉ số (${totalGoalsInScore}).`;
    }

    let countedGoalsForTeam1 = 0;
    let countedGoalsForTeam2 = 0;

    for (const goal of currentGoalDetails) {
        if (!goal.playerId || !goal.beneficiaryTeamId || !goal.goalType || goal.minute === undefined || goal.minute === '') {
            return "Vui lòng điền đầy đủ thông tin cho mỗi bàn thắng (Cầu thủ, Đội hưởng, Phút, Loại).";
        }

        const selectedPlayerId = goal.playerId;
        const beneficiaryTeamId = goal.beneficiaryTeamId;

        const playerInMatchT1 = participatingPlayersInMatchT1.find(p => p._id === selectedPlayerId);
        const playerInMatchT2 = participatingPlayersInMatchT2.find(p => p._id === selectedPlayerId);
        
        if (!playerInMatchT1 && !playerInMatchT2) {
            // This player might exist in allPlayersOfTeam1/2 but not selected for the match
            const allT1Player = allPlayersOfTeam1.find(p=>p._id === selectedPlayerId);
            const allT2Player = allPlayersOfTeam2.find(p=>p._id === selectedPlayerId);
            const playerName = allT1Player?.name || allT2Player?.name || `ID ${selectedPlayerId}`;
            return `Cầu thủ ${playerName} không có trong danh sách đăng ký thi đấu của một trong hai đội.`;
        }
        
        const actualPlayerTeamId = playerInMatchT1 ? editingMatch.team1._id : editingMatch.team2._id;

        if (goal.goalType === "OG") { 
            if (actualPlayerTeamId === beneficiaryTeamId) {
                return `Bàn thắng OG không hợp lệ: Cầu thủ ${playerInMatchT1?.name || playerInMatchT2?.name} đá phản lưới và đội hưởng bàn thắng không thể cùng một đội.`;
            }
        } else { 
            if (actualPlayerTeamId !== beneficiaryTeamId) {
                return `Bàn thắng thường không hợp lệ: Cầu thủ ${playerInMatchT1?.name || playerInMatchT2?.name} (thuộc đội ${actualPlayerTeamId === editingMatch.team1._id ? formData.team1Name : formData.team2Name}) không thể ghi bàn cho đội ${beneficiaryTeamId === editingMatch.team1._id ? formData.team1Name : formData.team2Name}.`;
            }
        }

        if (beneficiaryTeamId === editingMatch.team1._id) {
            countedGoalsForTeam1++;
        } else if (beneficiaryTeamId === editingMatch.team2._id) {
            countedGoalsForTeam2++;
        }

        if (goalRegulation && goalRegulation.rules?.goalTimeLimit) {
            const minMinute = goalRegulation.rules.goalTimeLimit.minMinute || 0;
            const maxMinute = goalRegulation.rules.goalTimeLimit.maxMinute || 120;
            if (goal.minute < minMinute || goal.minute > maxMinute) return `Phút ghi bàn '${goal.minute}' phải từ ${minMinute} đến ${maxMinute}.`;
        }
        if (goalRegulation && goalRegulation.rules?.goalTypes && !goalRegulation.rules.goalTypes.includes(goal.goalType)) {
            return `Loại bàn thắng '${goal.goalType}' không được phép. Chỉ được phép: ${goalRegulation.rules.goalTypes.join(', ')}.`;
        }
    }
    
    if (countedGoalsForTeam1 !== team1GoalsInScore) {
        return `Số bàn thắng của ${formData.team1Name} trong chi tiết (${countedGoalsForTeam1}) không khớp với tỉ số (${team1GoalsInScore}).`;
    }
    if (countedGoalsForTeam2 !== team2GoalsInScore) {
        return `Số bàn thắng của ${formData.team2Name} trong chi tiết (${countedGoalsForTeam2}) không khớp với tỉ số (${team2GoalsInScore}).`;
    }

    return true;
  };

  const handleGoalDetailChange = (index, field, value) => {
    const newGoalDetails = [...goalDetails];
    newGoalDetails[index] = { ...newGoalDetails[index], [field]: value };
    setGoalDetails(newGoalDetails);
  };

  const addGoalDetail = () => {
    setGoalDetails([...goalDetails, { playerId: '', minute: '', goalType: goalRegulation?.rules?.goalTypes?.[0] || 'normal', beneficiaryTeamId: '' }]);
  };

  const removeGoalDetail = (index) => {
    setGoalDetails(goalDetails.filter((_, i) => i !== index));
  };

  const handleParticipatingPlayersChange = (teamKey, selectedPlayerIds) => {
    setFormData(prev => ({ ...prev, [teamKey]: selectedPlayerIds }));
    if (teamKey === 'participatingPlayersTeam1') {
        setParticipatingPlayersInMatchT1(allPlayersOfTeam1.filter(p => selectedPlayerIds.includes(p._id)));
    } else if (teamKey === 'participatingPlayersTeam2') {
        setParticipatingPlayersInMatchT2(allPlayersOfTeam2.filter(p => selectedPlayerIds.includes(p._id)));
    }
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

    // Kiểm tra số lượng cầu thủ tham gia dựa trên Age Regulation
    if (!ageRegulation || !ageRegulation.rules || typeof ageRegulation.rules.minPlayersPerTeam !== 'number') {
        setError("Không thể xác định số lượng cầu thủ tối thiểu mỗi đội từ quy định. Vui lòng kiểm tra lại Age Regulation.");
        setLoading(false);
        return;
    }
    const minPlayersPerTeamRequiredByRegulation = ageRegulation.rules.minPlayersPerTeam;
    
    if (formData.participatingPlayersTeam1.length < minPlayersPerTeamRequiredByRegulation) {
        setError(`Đội ${formData.team1Name} phải có ít nhất ${minPlayersPerTeamRequiredByRegulation} cầu thủ tham gia theo quy định.`);
        setLoading(false);
        return;
    }
    if (formData.participatingPlayersTeam2.length < minPlayersPerTeamRequiredByRegulation) {
        setError(`Đội ${formData.team2Name} phải có ít nhất ${minPlayersPerTeamRequiredByRegulation} cầu thủ tham gia theo quy định.`);
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

      const [hours, minutes] = formData.time.split(':').map(Number);
      const matchDateTime = new Date(formData.date);
      matchDateTime.setHours(hours, minutes, 0, 0);

      const matchPayload = {
        date: matchDateTime.toISOString(),
        stadium: formData.stadium,
        score: currentScore === '' ? null : currentScore,
        goalDetails: (currentScore === '' || currentScore === null) ? [] : goalDetails.map(goal => {
          return {
            player_id: goal.playerId,
            team_id: goal.beneficiaryTeamId, 
            minute: parseInt(goal.minute, 10),
            goalType: goal.goalType,
          };
        }),
        participatingPlayersTeam1: formData.participatingPlayersTeam1,
        participatingPlayersTeam2: formData.participatingPlayersTeam2,
      };

      const matchUpdateResponse = await axios.put(`http://localhost:5000/api/matches/${matchId}`, matchPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMatches((prevMatches) =>
        prevMatches.map((m) =>
          (m.id === matchId || m._id === matchId)
            ? { ...m, ...matchUpdateResponse.data.data } 
            : m
        )
      );

      if (matchPayload.score !== null && /^\d+-\d+$/.test(matchPayload.score)) {
        await axios.put(`http://localhost:5000/api/team_results/${matchId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await axios.put(`http://localhost:5000/api/player_results/match/${matchId}`, {}, { headers: { Authorization: `Bearer ${token}` } });

        const seasonIdToUpdateRanking = editingMatch.season_id?._id || editingMatch.season_id;
        await axios.put(`http://localhost:5000/api/rankings/${seasonIdToUpdateRanking}`,
          { match_date: matchDateTime.toISOString().split('T')[0] }, 
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đội 2: {formData.team2Name}</label>
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

        {editingMatch && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="participatingPlayersTeam1" className="block text-sm font-medium text-gray-700 mb-1">
                  Cầu thủ ra sân ({formData.team1Name || 'Đội 1'}):
                </label>
                {loadingPlayers ? <p>Đang tải cầu thủ...</p> : allPlayersOfTeam1.length > 0 ? (
                  <select
                    id="participatingPlayersTeam1"
                    multiple
                    value={formData.participatingPlayersTeam1}
                    onChange={(e) => handleParticipatingPlayersChange('participatingPlayersTeam1', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm h-32"
                  >
                    {allPlayersOfTeam1.map(player => (
                      <option key={player._id} value={player._id}>
                        {player.name} (#{player.number})
                      </option>
                    ))}
                  </select>
                ) : <p className="text-sm text-gray-500">Không có cầu thủ cho {formData.team1Name || 'Đội 1'}.</p>}
                 <p className="text-xs text-gray-500 mt-1">Giữ Ctrl (hoặc Cmd trên Mac) để chọn nhiều cầu thủ.</p>
              </div>
              <div>
                <label htmlFor="participatingPlayersTeam2" className="block text-sm font-medium text-gray-700 mb-1">
                  Cầu thủ ra sân ({formData.team2Name || 'Đội 2'}):
                </label>
                 {loadingPlayers ? <p>Đang tải cầu thủ...</p> : allPlayersOfTeam2.length > 0 ? (
                  <select
                    id="participatingPlayersTeam2"
                    multiple
                    value={formData.participatingPlayersTeam2}
                    onChange={(e) => handleParticipatingPlayersChange('participatingPlayersTeam2', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm h-32"
                  >
                    {allPlayersOfTeam2.map(player => (
                      <option key={player._id} value={player._id}>
                        {player.name} (#{player.number})
                      </option>
                    ))}
                  </select>
                ) : <p className="text-sm text-gray-500">Không có cầu thủ cho {formData.team2Name || 'Đội 2'}.</p>}
                 <p className="text-xs text-gray-500 mt-1">Giữ Ctrl (hoặc Cmd trên Mac) để chọn nhiều cầu thủ.</p>
              </div>
            </div>
          </>
        )}


        {(formData.score && /^\d+-\d+$/.test(formData.score)) && (
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cầu Thủ Ghi Bàn</label>
            {goalDetails.map((goal, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 rounded-lg shadow-sm items-center">
                    <div className="sm:col-span-2">
                        <label htmlFor={`goal-player-${index}`} className="text-xs text-gray-600">Cầu thủ</label>
                        <select
                            id={`goal-player-${index}`}
                            value={goal.playerId || ''}
                            onChange={(e) => handleGoalDetailChange(index, 'playerId', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                            required
                        >
                            <option value="">Chọn cầu thủ ghi bàn</option>
                            <optgroup label={`${formData.team1Name} (Ra sân)`}>
                                {participatingPlayersInMatchT1.map((player) => ( <option key={player._id} value={player._id}> {player.name} (#{player.number}) </option> ))}
                            </optgroup>
                            <optgroup label={`${formData.team2Name} (Ra sân)`}>
                                {participatingPlayersInMatchT2.map((player) => ( <option key={player._id} value={player._id}> {player.name} (#{player.number}) </option> ))}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`beneficiary-team-${index}`} className="text-xs text-gray-600">Đội hưởng</label>
                        <select
                            id={`beneficiary-team-${index}`}
                            value={goal.beneficiaryTeamId || ''}
                            onChange={(e) => handleGoalDetailChange(index, 'beneficiaryTeamId', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                            required
                        >
                            <option value="">Chọn đội hưởng</option>
                            {editingMatch && editingMatch.team1 && <option value={editingMatch.team1._id}>{formData.team1Name}</option>}
                            {editingMatch && editingMatch.team2 && <option value={editingMatch.team2._id}>{formData.team2Name}</option>}
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
                            min={goalRegulation?.rules?.goalTimeLimit?.minMinute || 0}
                            max={goalRegulation?.rules?.goalTimeLimit?.maxMinute || 120}
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
                                {goalRegulation?.rules?.goalTypes?.length > 0 ? (
                                goalRegulation.rules.goalTypes.map((type) => ( <option key={type} value={type}> {type.charAt(0).toUpperCase() + type.slice(1)} </option> ))
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
            disabled={loading || loadingPlayers}
          >
            {loading || loadingPlayers ? 'Đang xử lý...' : (editingMatch ? 'Lưu Thay Đổi' : 'Thêm Trận')}
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
            disabled={loading || loadingPlayers}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;