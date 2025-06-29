// File: truonghoangkhiem/ql_giai_bd_qg_se104_uit/QL_Giai_BD_QG_SE104_UIT-ten-nhanh-moi/frontend/src/components/MatchForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const getPositionAbbreviation = (position) => {
  if (!position) return 'SUB'; // Mặc định nếu không có vị trí
  const lowerPos = position.toLowerCase();

  if (lowerPos.includes('forward') || lowerPos.includes('tiền đạo')) return 'FW';
  if (lowerPos.includes('midfielder') || lowerPos.includes('tiền vệ')) return 'MF';
  if (lowerPos.includes('defender') || lowerPos.includes('hậu vệ')) return 'DF';
  if (lowerPos.includes('goalkeeper') || lowerPos.includes('thủ môn')) return 'GK';

  return 'SUB'; // Mặc định cho các trường hợp khác
};

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const initialFormData = {
    date: '',
    time: '15:00',
    stadium: '',
    score: '',
    team1Name: '', // Only for display
    team2Name: '', // Only for display
  };

  const [formData, setFormData] = useState(initialFormData);
  const [goalDetails, setGoalDetails] = useState([]);

  // Lineup states
  const [lineupTeam1Players, setLineupTeam1Players] = useState([]);
  const [lineupTeam2Players, setLineupTeam2Players] = useState([]);
  const [allPlayersOfTeam1, setAllPlayersOfTeam1] = useState([]);
  const [allPlayersOfTeam2, setAllPlayersOfTeam2] = useState([]);

  const [goalRegulation, setGoalRegulation] = useState(null);
  const [ageRegulation, setAgeRegulation] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingLineups, setLoadingLineups] = useState(false);


  const fetchLineupForTeam = async (matchId, teamId, setLineupFn) => {
    if (!matchId || !teamId) {
      setLineupFn([]);
      return;
    }
    setLoadingLineups(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/matchlineups/match/${matchId}/team/${teamId}`);
      if (response.data && response.data.status === 'success' && response.data.data && response.data.data.players) {
        setLineupFn(response.data.data.players.map(p => ({
          player_id: p.player_id._id || p.player_id,
          position: p.position,
          jersey_number: p.jersey_number
        })));
      } else {
        setLineupFn([]);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(`Lỗi lấy đội hình đội ${teamId} cho trận ${matchId}:`, err.response?.data || err.message);
      }
      setLineupFn([]);
    } finally {
      setLoadingLineups(false);
    }
  };


  useEffect(() => {
    if (editingMatch && editingMatch.team1 && editingMatch.team2) {
      const matchId = editingMatch.id || editingMatch._id;
      const matchDateObj = editingMatch.date ? new Date(editingMatch.date) : null;
      let initialTime = '15:00';
      if (matchDateObj) {
        const hours = String(matchDateObj.getHours()).padStart(2, '0');
        const minutes = String(matchDateObj.getMinutes()).padStart(2, '0');
        if (hours !== "NaN" && minutes !== "NaN" && !isNaN(parseInt(hours)) && !isNaN(parseInt(minutes))) {
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
        playerId: typeof goal.player_id === 'string' ? goal.player_id : goal.player_id?._id,
        minute: goal.minute,
        goalType: goal.goalType || 'normal',
        beneficiaryTeamId: typeof goal.team_id === 'string' ? goal.team_id : goal.team_id?._id,
      })) || []);
      
      fetchLineupForTeam(matchId, editingMatch.team1?._id, setLineupTeam1Players);
      fetchLineupForTeam(matchId, editingMatch.team2?._id, setLineupTeam2Players);

      const fetchAllPlayersForTeam = async (teamId, setPlayersFn, teamNameForError) => {
        if (teamId && typeof teamId === 'string') {
          setLoadingPlayers(true);
          try {
            const response = await axios.get(`http://localhost:5000/api/players/team/${teamId}`);
            setPlayersFn(response.data.data || []);
          } catch (err) {
            console.error(`Lỗi lấy tất cả cầu thủ đội ${teamNameForError} (ID: ${teamId}):`, err.response?.data || err.message);
            setError(`Không thể tải cầu thủ cho đội ${teamNameForError}.`);
            setPlayersFn([]);
          } finally {
            setLoadingPlayers(false);
          }
        } else {
           setPlayersFn([]);
        }
      };
      
      fetchAllPlayersForTeam(editingMatch.team1?._id, setAllPlayersOfTeam1, editingMatch.team1?.team_name);
      fetchAllPlayersForTeam(editingMatch.team2?._id, setAllPlayersOfTeam2, editingMatch.team2?.team_name);

      const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
      if (seasonId && typeof seasonId === 'string') {
        const fetchRegulations = async () => {
            try {
                const [goalRegRes, ageRegRes] = await Promise.allSettled([
                    axios.get(`http://localhost:5000/api/regulations/${seasonId}/Goal%20Rules`),
                    axios.get(`http://localhost:5000/api/regulations/${seasonId}/Age%20Regulation`)
                ]);

                if (goalRegRes.status === 'fulfilled' && goalRegRes.value.data?.status === 'success' && typeof goalRegRes.value.data.data === 'string') {
                    const goalRegDetails = await axios.get(`http://localhost:5000/api/regulations/${goalRegRes.value.data.data}`);
                    if (goalRegDetails.data?.status === 'success') setGoalRegulation(goalRegDetails.data.data);
                } else { console.error('Goal Regulation ID not found or error fetching it.'); }

                if (ageRegRes.status === 'fulfilled' && ageRegRes.value.data?.status === 'success' && typeof ageRegRes.value.data.data === 'string') {
                    const ageRegDetails = await axios.get(`http://localhost:5000/api/regulations/${ageRegRes.value.data.data}`);
                     if (ageRegDetails.data?.status === 'success') setAgeRegulation(ageRegDetails.data.data);
                } else { console.error('Age Regulation ID not found or error fetching it.');}

            } catch (err) { console.error('Lỗi tải Regulations:', err.message); }
        };
        fetchRegulations();
      }

    } else {
        setFormData(initialFormData);
        setGoalDetails([]);
        setAllPlayersOfTeam1([]);
        setAllPlayersOfTeam2([]);
        setLineupTeam1Players([]);
        setLineupTeam2Players([]);
        setGoalRegulation(null);
        setAgeRegulation(null);
    }
  }, [editingMatch]);


  const validateScore = (score) => {
    if (score === '' || score === null) return true;
    return /^[0-9]+-[0-9]+$/.test(score);
  };

  const getPlayerByIdFromAll = (playerId) => {
      return allPlayersOfTeam1.find(p => p._id === playerId) || allPlayersOfTeam2.find(p => p._id === playerId);
  }

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

        const playerInLineupT1 = lineupTeam1Players.find(p => p.player_id === selectedPlayerId);
        const playerInLineupT2 = lineupTeam2Players.find(p => p.player_id === selectedPlayerId);
        
        const playerMasterData = getPlayerByIdFromAll(selectedPlayerId);
        if (!playerMasterData) {
            return `Cầu thủ ghi bàn (ID: ${selectedPlayerId}) không tồn tại.`;
        }
        const actualPlayerTeamId = playerMasterData.team_id?._id || playerMasterData.team_id;


        if (!playerInLineupT1 && !playerInLineupT2) {
            return `Cầu thủ ${playerMasterData.name} không có trong danh sách đăng ký thi đấu (đội hình).`;
        }
        
        if (goal.goalType === "OG") { 
            if (actualPlayerTeamId === beneficiaryTeamId) {
                return `Bàn thắng OG không hợp lệ: Cầu thủ ${playerMasterData.name} đá phản lưới và đội hưởng bàn thắng không thể cùng một đội.`;
            }
        } else { 
            if (actualPlayerTeamId !== beneficiaryTeamId) {
                return `Bàn thắng thường không hợp lệ: Cầu thủ ${playerMasterData.name} (thuộc đội ${actualPlayerTeamId === editingMatch.team1._id ? formData.team1Name : formData.team2Name}) không thể ghi bàn cho đội ${beneficiaryTeamId === editingMatch.team1._id ? formData.team1Name : formData.team2Name}.`;
            }
        }

        if (beneficiaryTeamId === editingMatch.team1._id) countedGoalsForTeam1++;
        else if (beneficiaryTeamId === editingMatch.team2._id) countedGoalsForTeam2++;

        if (goalRegulation && goalRegulation.rules?.goalTimeLimit) {
            const minMinute = goalRegulation.rules.goalTimeLimit.minMinute || 0;
            const maxMinute = goalRegulation.rules.goalTimeLimit.maxMinute || 120;
            if (goal.minute < minMinute || goal.minute > maxMinute) return `Phút ghi bàn '${goal.minute}' phải từ ${minMinute} đến ${maxMinute}.`;
        }
        if (goalRegulation && goalRegulation.rules?.goalTypes && !goalRegulation.rules.goalTypes.includes(goal.goalType)) {
            return `Loại bàn thắng '${goal.goalType}' không được phép. Chỉ được phép: ${goalRegulation.rules.goalTypes.join(', ')}.`;
        }
    }
    
    if (countedGoalsForTeam1 !== team1GoalsInScore) return `Số bàn thắng của ${formData.team1Name} trong chi tiết (${countedGoalsForTeam1}) không khớp tỉ số (${team1GoalsInScore}).`;
    if (countedGoalsForTeam2 !== team2GoalsInScore) return `Số bàn thắng của ${formData.team2Name} trong chi tiết (${countedGoalsForTeam2}) không khớp tỉ số (${team2GoalsInScore}).`;
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

  const handleLineupPlayerChange = (teamLineup, setTeamLineup, index, field, value) => {
    const newLineup = [...teamLineup];
  
    if (field === 'player_id') {
      const selectedPlayer = (teamLineup === lineupTeam1Players ? allPlayersOfTeam1 : allPlayersOfTeam2).find(p => p._id === value);
      
      if (selectedPlayer) {
        // Tự động điền số áo và vị trí viết tắt khi chọn cầu thủ
        newLineup[index] = {
          ...newLineup[index],
          player_id: value,
          jersey_number: selectedPlayer.number || '',
          position: getPositionAbbreviation(selectedPlayer.position) // Sử dụng hàm helper
        };
      } else {
        // Nếu bỏ chọn, xóa các trường liên quan
        newLineup[index] = {
          ...newLineup[index],
          player_id: '',
          jersey_number: '',
          position: ''
        };
      }
    } else {
      // Cho phép chỉnh sửa thủ công các trường khác
      newLineup[index] = { ...newLineup[index], [field]: value };
    }
  
    setTeamLineup(newLineup);
  };
  
  const addLineupPlayer = (teamLineup, setTeamLineup) => {
    // Thêm một slot trống, vị trí sẽ được điền tự động khi người dùng chọn cầu thủ
    setTeamLineup([...teamLineup, { player_id: '', position: '', jersey_number: '' }]);
  };

  const removeLineupPlayer = (teamLineup, setTeamLineup, index) => {
    setTeamLineup(teamLineup.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!token) {
      setError('Vui lòng đăng nhập.'); setIsSubmitting(false); return;
    }
    if (!editingMatch) {
      setError('Không có thông tin trận đấu để sửa.'); setIsSubmitting(false); return;
    }
    
    const currentScore = formData.score.trim();
    if (!validateScore(currentScore)) {
      setError('Tỉ số phải dạng số-số (vd: 2-1) hoặc để trống.'); setIsSubmitting(false); return;
    }
    
    if (currentScore && /^\d+-\d+$/.test(currentScore)) {
        if(lineupTeam1Players.length === 0 || lineupTeam2Players.length === 0) {
          setError("Phải nhập đội hình cho cả hai đội khi có tỉ số.");
          setIsSubmitting(false);
          return;
        }
        const goalValidation = validateGoalDetails(currentScore, goalDetails);
        if (goalValidation !== true) {
          setError(goalValidation); setIsSubmitting(false); return;
        }
    } else if (goalDetails.length > 0 && (!currentScore || !/^\d+-\d+$/.test(currentScore))) {
        setError("Không thể có chi tiết bàn thắng khi chưa có tỉ số hợp lệ."); setIsSubmitting(false); return;
    }

    if (!formData.date || isNaN(new Date(formData.date).getTime())) {
      setError('Ngày thi đấu không hợp lệ.'); setIsSubmitting(false); return;
    }
    if (!formData.time) {
        setError('Giờ thi đấu không được để trống.'); setIsSubmitting(false); return;
    }

    try {
        const matchId = editingMatch.id || editingMatch._id;
        const seasonId = editingMatch.season_id?._id || editingMatch.season_id;
        const [hours, minutes] = formData.time.split(':').map(Number);
        const matchDateTime = new Date(formData.date);
        matchDateTime.setHours(hours, minutes, 0, 0);
  
        const headers = { Authorization: `Bearer ${token}` };
  
        // BƯỚC 1: LƯU ĐỘI HÌNH TRƯỚC
        if (lineupTeam1Players.length > 0) {
            const lineupTeam1Payload = { match_id: matchId, team_id: editingMatch.team1._id, season_id: seasonId, players: lineupTeam1Players };
            await axios.post(`http://localhost:5000/api/matchlineups`, lineupTeam1Payload, { headers });
        }
    
        if (lineupTeam2Players.length > 0) {
            const lineupTeam2Payload = { match_id: matchId, team_id: editingMatch.team2._id, season_id: seasonId, players: lineupTeam2Players };
            await axios.post(`http://localhost:5000/api/matchlineups`, lineupTeam2Payload, { headers });
        }
        
        // BƯỚC 2: SAU KHI LƯU ĐỘI HÌNH, MỚI CẬP NHẬT TRẬN ĐẤU
        const matchPayload = {
            date: matchDateTime.toISOString(),
            stadium: formData.stadium,
            score: currentScore === '' ? null : currentScore,
            goalDetails: (currentScore === '' || currentScore === null) ? [] : goalDetails.map(goal => ({
              player_id: goal.playerId,
              team_id: goal.beneficiaryTeamId, 
              minute: parseInt(goal.minute, 10),
              goalType: goal.goalType,
            })),
        };
  
        const matchUpdateResponse = await axios.put(`http://localhost:5000/api/matches/${matchId}`, matchPayload, { headers });
        
        // BƯỚC 3: Cập nhật kết quả, xếp hạng (giữ nguyên)
        if (matchPayload.score !== null && /^\d+-\d+$/.test(matchPayload.score)) {
            await axios.put(`http://localhost:5000/api/team_results/${matchId}`, {}, { headers });
            await axios.put(`http://localhost:5000/api/player_results/match/${matchId}`, {}, { headers });
            await axios.put(`http://localhost:5000/api/rankings/${seasonId}`,
              { match_date: matchDateTime.toISOString().split('T')[0] }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            await axios.put(`http://localhost:5000/api/player_rankings/match/${matchId}`, {}, { headers });
            setSuccess('Cập nhật trận đấu, đội hình và các kết quả liên quan thành công!');
        } else {
            setSuccess('Cập nhật thông tin trận đấu và đội hình thành công (không có tỉ số để cập nhật kết quả).');
        }
        
        setMatches((prevMatches) =>
            prevMatches.map((m) => (m.id === matchId || m._id === matchId) ? { ...m, ...matchUpdateResponse.data.data } : m)
        );
  
        setTimeout(() => {
            setShowForm(false); setEditingMatch(null); setSuccess('');
        }, 2000);
  
    } catch (err) {
        console.error('Submit error:', err.response?.data || err.message, err.stack);
        setError(err.response?.data?.message || 'Không thể lưu trận đấu hoặc đội hình.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderLineupInputs = (teamLabel, lineupPlayers, setTeamLineup, allTeamPlayers) => (
    <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{teamLabel} (Đội hình ra sân)</h3>
        {lineupPlayers.map((p, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg shadow-sm items-center">
                <div className="sm:col-span-2">
                    <label htmlFor={`lineup-${teamLabel}-player-${index}`} className="text-xs text-gray-600">Cầu thủ</label>
                    <select
                        id={`lineup-${teamLabel}-player-${index}`}
                        value={p.player_id}
                        onChange={(e) => handleLineupPlayerChange(lineupPlayers, setTeamLineup, index, 'player_id', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    >
                        <option value="">Chọn cầu thủ</option>
                        {allTeamPlayers.map(player => (
                            <option key={player._id} value={player._id}>{player.name} (#{player.number})</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label htmlFor={`lineup-${teamLabel}-number-${index}`} className="text-xs text-gray-600">Số áo</label>
                    <input
                        id={`lineup-${teamLabel}-number-${index}`}
                        type="text"
                        value={p.jersey_number}
                        onChange={(e) => handleLineupPlayerChange(lineupPlayers, setTeamLineup, index, 'jersey_number', e.target.value)}
                        placeholder="Số áo"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <label htmlFor={`lineup-${teamLabel}-pos-${index}`} className="text-xs text-gray-600">Vị trí</label>
                    <input
                        id={`lineup-${teamLabel}-pos-${index}`}
                        type="text"
                        value={p.position}
                        onChange={(e) => handleLineupPlayerChange(lineupPlayers, setTeamLineup, index, 'position', e.target.value)}
                        placeholder="Vd: GK, DF, MF, FW, SUB"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    />
                  </div>
                  <button type="button" onClick={() => removeLineupPlayer(lineupPlayers, setTeamLineup, index)}
                      className="bg-red-500 text-white px-2.5 py-2 rounded-lg hover:bg-red-600 transition shadow-sm text-sm">Xóa</button>
                </div>
            </div>
        ))}
        <button type="button" onClick={() => addLineupPlayer(lineupPlayers, setTeamLineup)}
            className="w-full bg-teal-500 text-white py-2 rounded-lg hover:bg-teal-600 transition shadow-sm mt-2 text-sm">
            Thêm cầu thủ vào đội hình {teamLabel}
        </button>
    </div>
  );


  return (
    <div className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {editingMatch ? 'Sửa Trận Đấu & Đội Hình' : 'Thêm Trận Đấu'}
      </h2>
      {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-center font-medium">{error}</p>}
      {success && <p className="text-green-600 bg-green-100 p-3 rounded-lg mb-4 text-center font-medium">{success}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={isSubmitting || loadingPlayers || loadingLineups} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Đội 1: {formData.team1Name}</label></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Đội 2: {formData.team2Name}</label></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="match-date" className="block text-sm font-medium text-gray-700 mb-1">Ngày Thi Đấu</label>
              <input id="match-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" required />
            </div>
            <div>
              <label htmlFor="match-time" className="block text-sm font-medium text-gray-700 mb-1">Giờ Thi Đấu</label>
              <input id="match-time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" required/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="stadium" className="block text-sm font-medium text-gray-700 mb-1">Sân Vận Động</label>
              <input id="stadium" type="text" value={formData.stadium} onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                placeholder="Sân vận động" className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" required/>
            </div>
            <div>
              <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">Tỉ Số (vd: 2-1, trống nếu chưa đá)</label>
              <input id="score" type="text" value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="x-y" className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
            </div>
          </div>

          {editingMatch && (
              <>
                {renderLineupInputs(formData.team1Name || "Đội 1", lineupTeam1Players, setLineupTeam1Players, allPlayersOfTeam1)}
                <hr className="my-6 border-gray-300"/>
                {renderLineupInputs(formData.team2Name || "Đội 2", lineupTeam2Players, setLineupTeam2Players, allPlayersOfTeam2)}
              </>
          )}

          {(formData.score && /^\d+-\d+$/.test(formData.score)) && (
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cầu Thủ Ghi Bàn</label>
              {goalDetails.map((goal, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 rounded-lg shadow-sm items-center">
                      <div className="sm:col-span-2">
                          <label htmlFor={`goal-player-${index}`} className="text-xs text-gray-600">Cầu thủ</label>
                          <select id={`goal-player-${index}`} value={goal.playerId || ''} onChange={(e) => handleGoalDetailChange(index, 'playerId', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                              <option value="">Chọn cầu thủ ghi bàn</option>
                              <optgroup label={`${formData.team1Name} (Đội hình)`}>
                                  {lineupTeam1Players.map(p => getPlayerByIdFromAll(p.player_id)).filter(Boolean).map(player => (<option key={player._id} value={player._id}>{player.name} (#{player.number})</option>))}
                              </optgroup>
                              <optgroup label={`${formData.team2Name} (Đội hình)`}>
                                  {lineupTeam2Players.map(p => getPlayerByIdFromAll(p.player_id)).filter(Boolean).map(player => (<option key={player._id} value={player._id}>{player.name} (#{player.number})</option>))}
                              </optgroup>
                          </select>
                      </div>
                      <div>
                          <label htmlFor={`beneficiary-team-${index}`} className="text-xs text-gray-600">Đội hưởng</label>
                          <select id={`beneficiary-team-${index}`} value={goal.beneficiaryTeamId || ''} onChange={(e) => handleGoalDetailChange(index, 'beneficiaryTeamId', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                              <option value="">Chọn đội hưởng</option>
                              {editingMatch?.team1 && <option value={editingMatch.team1._id}>{formData.team1Name}</option>}
                              {editingMatch?.team2 && <option value={editingMatch.team2._id}>{formData.team2Name}</option>}
                          </select>
                      </div>
                       <div>
                          <label htmlFor={`goal-minute-${index}`} className="text-xs text-gray-600">Phút</label>
                          <input id={`goal-minute-${index}`} type="number" value={goal.minute || ''} onChange={(e) => handleGoalDetailChange(index, 'minute', e.target.value)}
                              placeholder="Phút" className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required
                              min={goalRegulation?.rules?.goalTimeLimit?.minMinute || 0} max={goalRegulation?.rules?.goalTimeLimit?.maxMinute || 120} />
                      </div>
                      <div className="flex items-end gap-2">
                          <div className="flex-grow">
                              <label htmlFor={`goal-type-${index}`} className="text-xs text-gray-600">Loại</label>
                              <select id={`goal-type-${index}`} value={goal.goalType || 'normal'} onChange={(e) => handleGoalDetailChange(index, 'goalType', e.target.value)}
                                  className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                                  {goalRegulation?.rules?.goalTypes?.length > 0 ? 
                                    goalRegulation.rules.goalTypes.map(type => (<option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>))
                                    : <option value="normal">Normal</option> }
                              </select>
                          </div>
                          <button type="button" onClick={() => removeGoalDetail(index)}
                              className="bg-red-500 text-white px-2.5 py-2 rounded-lg hover:bg-red-600 transition shadow-sm text-sm">Xóa</button>
                      </div>
                  </div>
              ))}
              <button type="button" onClick={addGoalDetail}
                  className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition shadow-sm mt-2 text-sm">
                  Thêm Bàn Thắng
              </button>
              </div>
          )}

          <div className="flex justify-center space-x-4 pt-4">
            <button type="submit" disabled={isSubmitting || loadingPlayers || loadingLineups}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 shadow-md flex items-center justify-center min-w-[120px]">
              {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (editingMatch ? 'Lưu Thay Đổi' : 'Thêm Trận')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingMatch(null); setError(''); setSuccess(''); }}
              className="bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300 shadow-md" disabled={isSubmitting || loadingPlayers || loadingLineups}>
              Hủy
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default MatchForm;