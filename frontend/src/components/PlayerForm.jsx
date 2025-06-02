import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PlayerForm = ({ editingPlayer, setEditingPlayer, setShowForm, setPlayers, token, onSuccess }) => {
    const initialFormDataState = {
        team_id: '',
        name: '',
        number: '',
        position: '',
        nationality: '',
        dob: '',
        isForeigner: false,
        avatar: '', // Added avatar
    };

    const [formData, setFormData] = useState(initialFormDataState);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [teamsInSelectedSeason, setTeamsInSelectedSeason] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const [error, setError] = useState('');
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = 'http://localhost:5000';

    const resetFormForNewPlayer = useCallback(() => {
        setSelectedTeamId('');
        setFormData(initialFormDataState);
    }, [initialFormDataState]);

    useEffect(() => {
        const fetchSeasons = async () => {
            if (!token) {
                setError("Token không hợp lệ. Vui lòng đăng nhập lại.");
                setLoadingSeasons(false);
                setSeasons([]);
                setSelectedSeasonId('');
                return;
            }
            setLoadingSeasons(true);
            setError('');
            try {
                const response = await axios.get(`${API_URL}/api/seasons`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0) {
                    if (!editingPlayer && !selectedSeasonId) {
                        setSelectedSeasonId(seasonsData[0]._id);
                    }
                } else {
                    setSelectedSeasonId('');
                }
            } catch (err) {
                setError(`Không thể tải danh sách mùa giải: ${err.response?.data?.message || err.message}`);
                setSeasons([]);
                setSelectedSeasonId('');
            } finally {
                setLoadingSeasons(false);
            }
        };
        fetchSeasons();
    }, [token]);

    useEffect(() => {
        if (!selectedSeasonId || !token) {
            setTeamsInSelectedSeason([]);
            setSelectedTeamId('');
            return;
        }
        const fetchTeams = async () => {
            setLoadingTeams(true);
            setError('');
            setTeamsInSelectedSeason([]);
            setSelectedTeamId('');
            try {
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeasonId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTeamsInSelectedSeason(response.data.data || []);
            } catch (err) {
                setError(`Không thể tải danh sách đội bóng: ${err.response?.data?.message || err.message}`);
                setTeamsInSelectedSeason([]);
            } finally {
                setLoadingTeams(false);
            }
        };
        fetchTeams();
    }, [selectedSeasonId, token]);

    useEffect(() => {
        if (editingPlayer) {
            const playerTeamId = (typeof editingPlayer.team_id === 'object' ? editingPlayer.team_id._id : editingPlayer.team_id)?.toString();
            const playerTeamSeasonId = (typeof editingPlayer.team_id?.season_id === 'object' ? editingPlayer.team_id.season_id._id : editingPlayer.team_id?.season_id)?.toString();

            if (playerTeamSeasonId && playerTeamSeasonId !== selectedSeasonId) {
                setSelectedSeasonId(playerTeamSeasonId);
            }
            
            setSelectedTeamId(playerTeamId || '');

            setFormData({
                team_id: playerTeamId || '',
                name: editingPlayer.name || '',
                number: editingPlayer.number || '',
                position: editingPlayer.position || '',
                nationality: editingPlayer.nationality || '',
                dob: editingPlayer.dob ? new Date(editingPlayer.dob).toISOString().split('T')[0] : '',
                isForeigner: editingPlayer.isForeigner || false,
                avatar: editingPlayer.avatar || '', // Added avatar
            });
        } else {
            setFormData({
                ...initialFormDataState,
                team_id: selectedTeamId,
                avatar: '', // Ensure avatar is reset for new player
            });
        }
    }, [editingPlayer, selectedTeamId]);


    const validateForm = () => {
        if (!selectedSeasonId) { setError('Vui lòng chọn mùa giải.'); return false; }
        if (!formData.team_id) { setError('Vui lòng chọn đội bóng.'); return false; }
        if (!formData.name.trim()) { setError('Tên cầu thủ không được để trống'); return false; }
        const numberValue = Number(formData.number);
        if (!Number.isInteger(numberValue) || numberValue <= 0 || numberValue > 999) {
            setError('Số áo phải là số nguyên dương (1-999)');
            return false;
        }
        if (!formData.position.trim()) { setError('Vị trí không được để trống'); return false; }
        if (!formData.nationality.trim()) { setError('Quốc tịch không được để trống'); return false; }
        
        const dob = new Date(formData.dob);
        const today = new Date();
        today.setHours(0,0,0,0); 
        if (isNaN(dob.getTime())) { setError('Ngày sinh không hợp lệ.'); return false;}
        if (dob > today) { setError('Ngày sinh không thể ở tương lai.'); return false; }
        if (formData.avatar && !/^https?:\/\/.+\..+/.test(formData.avatar)) { // Basic URL validation
            setError('URL ảnh đại diện không hợp lệ.'); return false;
        }
        return true;
    };

    const checkTeamConstraints = async () => {
        if (!formData.team_id || !selectedSeasonId) {
            setError('Mùa giải hoặc đội bóng chưa được chọn để kiểm tra ràng buộc.');
            return false;
        }

        try {
            const teamDetailsResponse = await axios.get(`${API_URL}/api/teams/${formData.team_id}`, {
                 headers: { Authorization: `Bearer ${token}` },
            });
            const teamDetails = teamDetailsResponse.data.data;
            if (!teamDetails || !teamDetails.season_id) {
                setError('Không thể lấy thông tin mùa giải của đội đã chọn.');
                return false;
            }
            const actualTeamSeasonId = (typeof teamDetails.season_id === 'object' ? teamDetails.season_id._id : teamDetails.season_id).toString();
            if (actualTeamSeasonId !== selectedSeasonId.toString()) {
                setError('Đội bóng đã chọn không thuộc về mùa giải đang thao tác trên form.');
                return false;
            }

            const [playersInTeamResponse, regulationsResponse] = await Promise.all([
                axios.get(`${API_URL}/api/players/team/${formData.team_id}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/regulations/season/${actualTeamSeasonId}`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const playersInTeam = playersInTeamResponse.data.data || [];
            const regulations = regulationsResponse.data.data || [];
            
            const ageRegulation = regulations.find((reg) => reg.regulation_name === 'Age Regulation');
            if (!ageRegulation || !ageRegulation.rules) {
                setError('Quy định "Age Regulation" chưa được thiết lập cho mùa giải của đội này.');
                return false; 
            }

            const { maxPlayersPerTeam, maxForeignPlayers, minAge, maxAge } = ageRegulation.rules;
            if (minAge === undefined || maxAge === undefined || maxPlayersPerTeam === undefined || maxForeignPlayers === undefined) {
                setError('Quy định về tuổi/số lượng cầu thủ (minAge, maxAge, maxPlayersPerTeam, maxForeignPlayers) chưa đầy đủ.');
                return false;
            }

            if (formData.number && playersInTeam.some(
                (player) => player.number === formData.number.toString() && player._id !== editingPlayer?._id
            )) {
                setError('Số áo này đã được sử dụng trong đội.');
                return false;
            }
            
            if (!editingPlayer) {
                if (playersInTeam.length >= maxPlayersPerTeam) {
                    setError(`Đội đã đạt số lượng tối đa (${maxPlayersPerTeam} cầu thủ).`);
                    return false;
                }
                if (formData.isForeigner) {
                    const foreignPlayersCount = playersInTeam.filter(p => p.isForeigner).length;
                    if (foreignPlayersCount >= maxForeignPlayers) {
                        setError(`Đội đã đạt số lượng tối đa (${maxForeignPlayers} cầu thủ ngoại).`);
                        return false;
                    }
                }
            } else { 
                if (formData.isForeigner && (!editingPlayer.isForeigner || formData.team_id !== (typeof editingPlayer.team_id === 'object' ? editingPlayer.team_id._id : editingPlayer.team_id)?.toString()) ) { 
                    const teamToCheck = formData.team_id;
                    const playersInTargetTeam = formData.team_id === (typeof editingPlayer.team_id === 'object' ? editingPlayer.team_id._id : editingPlayer.team_id)?.toString() 
                                              ? playersInTeam 
                                              : (await axios.get(`${API_URL}/api/players/team/${teamToCheck}`, { headers: { Authorization: `Bearer ${token}` } })).data.data || [];

                    const foreignPlayersCount = playersInTargetTeam.filter(p => p.isForeigner && p._id !== editingPlayer._id).length;
                    if (foreignPlayersCount >= maxForeignPlayers) {
                        setError(`Đội bóng này đã đạt số lượng tối đa (${maxForeignPlayers}) cầu thủ ngoại.`);
                        return false;
                    }
                }
            }
            
            if (formData.dob) {
                const birthDate = new Date(formData.dob);
                const currentDate = new Date();
                let playerAge = currentDate.getFullYear() - birthDate.getFullYear();
                const monthDiff = currentDate.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
                    playerAge--;
                }
                if (playerAge < minAge || playerAge > maxAge) {
                    setError(`Độ tuổi của cầu thủ phải từ ${minAge} đến ${maxAge}. Tuổi hiện tại: ${playerAge}`);
                    return false;
                }
            }
            return true;
        } catch (err) {
            const apiErrorMessage = err.response?.data?.message || err.message;
            setError(`Lỗi khi kiểm tra ràng buộc đội: ${apiErrorMessage}`);
            console.error("checkTeamConstraints error:", err);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');
        setIsSubmitting(true);

        if (!token) {
            setError('Vui lòng đăng nhập để tiếp tục.');
            setIsSubmitting(false);
            return;
        }

        if (!validateForm()) {
            setIsSubmitting(false);
            return;
        }
        
        const constraintsOk = await checkTeamConstraints();
        if (!constraintsOk) {
            setIsSubmitting(false);
            return;
        }
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const playerDataToSend = {
            team_id: formData.team_id,
            name: formData.name,
            number: formData.number.toString(),
            position: formData.position,
            nationality: formData.nationality,
            dob: formData.dob,
            isForeigner: formData.isForeigner,
            avatar: formData.avatar.trim() === '' ? null : formData.avatar.trim(), // Send null if empty, else trimmed URL
        };

        try {
            let savedPlayer;
            let playerOverallSuccessMessage = "";

            if (editingPlayer) {
                const response = await axios.put(`${API_URL}/api/players/${editingPlayer._id}`, playerDataToSend, config);
                savedPlayer = response.data.data;
                setPlayers((prev) =>
                    prev.map((player) => (player._id === editingPlayer._id ? savedPlayer : player))
                );
                playerOverallSuccessMessage = 'Cập nhật cầu thủ thành công!';
            } else {
                const playerResponse = await axios.post(`${API_URL}/api/players`, playerDataToSend, config);
                savedPlayer = playerResponse.data.data;

                if (!savedPlayer?._id) {
                    throw new Error('Không thể tạo cầu thủ: Phản hồi từ server không hợp lệ.');
                }
                playerOverallSuccessMessage = `Thêm cầu thủ ${savedPlayer.name} thành công. `;

                const playerResultData = {
                    player_id: savedPlayer._id,
                    season_id: selectedSeasonId,
                    team_id: savedPlayer.team_id,
                };
                let newPlayerResult;
                try {
                    const playerResultResponse = await axios.post(`${API_URL}/api/player_results`, playerResultData, config);
                    newPlayerResult = playerResultResponse.data.data;
                    if(!newPlayerResult?._id){
                        throw new Error(playerResultResponse.data?.message || "Tạo PlayerResult không trả về ID.");
                    }
                    playerOverallSuccessMessage += `Khởi tạo kết quả thành công. `;
                } catch (prError) {
                    try { 
                        await axios.delete(`${API_URL}/api/players/${savedPlayer._id}`, config); 
                        playerOverallSuccessMessage += `Tạo kết quả thất bại (${prError.response?.data?.message || prError.message}). Cầu thủ đã được hoàn tác.`;
                    } catch (delErr) { 
                        playerOverallSuccessMessage += `Tạo kết quả thất bại (${prError.response?.data?.message || prError.message}). Không thể hoàn tác cầu thủ.`;
                    }
                    setError(playerOverallSuccessMessage); 
                    setIsSubmitting(false);
                    return; 
                }

                const playerRankingData = {
                    season_id: selectedSeasonId,
                    player_results_id: newPlayerResult._id,
                };
                try {
                    await axios.post(`${API_URL}/api/player_rankings`, playerRankingData, config);
                    playerOverallSuccessMessage += `Khởi tạo xếp hạng thành công.`;
                } catch (prkError) {
                    playerOverallSuccessMessage += `Khởi tạo xếp hạng thất bại: ${prkError.response?.data?.message || prkError.message}. Vui lòng kiểm tra lại.`;
                }
                
                setPlayers((prev) => [...prev, savedPlayer]);
            }
            
            onSuccess?.(playerOverallSuccessMessage);
            setShowForm(false);
            setEditingPlayer(null);
            
            if (!editingPlayer) { 
                setFormData(prev => ({...initialFormDataState, team_id: formData.team_id, avatar: ''})); 
            } else {
                resetFormForNewPlayer(false); 
            }

        } catch (err) { 
            const errMsg = err.response?.data?.message || err.message || "Đã có lỗi xảy ra trong quá trình xử lý.";
            setError(errMsg);
            console.error('PlayerForm handleSubmit (outer catch):', err.response || err, err.stack);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPlayer(null);
        setError('');
        resetFormForNewPlayer(false); 
    };

    return (
        <div className="container mx-auto p-6 bg-white shadow-xl rounded-lg">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
                {editingPlayer ? 'Sửa thông tin cầu thủ' : 'Thêm cầu thủ mới'}
            </h2>
            {error && <p className="text-red-600 mb-4 text-center p-3 bg-red-100 rounded-md shadow">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Mùa giải:
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeasonId}
                        onChange={(e) => {
                            setSelectedSeasonId(e.target.value);
                        }}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        disabled={loadingSeasons || !!editingPlayer} 
                        required
                    >
                        {loadingSeasons ? (
                            <option value="">Đang tải mùa giải...</option>
                        ) : seasons.length === 0 ? (
                            <option value="">Không có mùa giải</option>
                        ) : (
                            <>
                              <option value="">Chọn mùa giải</option>
                              {seasons.map((season) => (
                                  <option key={season._id} value={season._id}>
                                      {season.season_name}
                                  </option>
                              ))}
                            </>
                        )}
                    </select>
                </div>

                <div>
                    <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Đội bóng:
                    </label>
                    <select
                        id="team-select"
                        value={selectedTeamId} 
                        onChange={(e) => setSelectedTeamId(e.target.value)} 
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        disabled={loadingTeams || !selectedSeasonId || !!editingPlayer}
                        required
                    >
                        {loadingTeams ? (
                            <option value="">Đang tải đội bóng...</option>
                        ) : !selectedSeasonId ? (
                             <option value="">Vui lòng chọn mùa giải trước</option>
                        ) : teamsInSelectedSeason.length === 0 ? (
                            <option value="">Không có đội cho mùa giải này</option>
                        ) : (
                            <>
                                <option value="">Chọn đội bóng</option>
                                {teamsInSelectedSeason.map((team) => (
                                    <option key={team._id} value={team._id}>
                                        {team.team_name}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên cầu thủ:</label>
                    <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nhập tên cầu thủ"
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="number" className="block text-sm font-medium text-gray-700">Số áo:</label>
                        <input
                            id="number"
                            type="number"
                            value={formData.number}
                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            placeholder="Nhập số áo"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            min="1"
                            max="999"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700">Vị trí:</label>
                        <input
                            id="position"
                            type="text"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            placeholder="Nhập vị trí"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Quốc tịch:</label>
                        <input
                            id="nationality"
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            placeholder="Nhập quốc tịch"
                            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Ngày sinh:</label>
                        <input
                            id="dob"
                            type="date"
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">URL Ảnh đại diện:</label>
                    <input
                        id="avatar"
                        type="url"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        placeholder="https://example.com/player.jpg"
                        className="mt-1 w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>


                <div className="flex items-center">
                    <input
                        id="isForeigner"
                        type="checkbox"
                        checked={formData.isForeigner}
                        onChange={(e) => setFormData({ ...formData, isForeigner: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="isForeigner" className="ml-2 block text-sm text-gray-900">
                        Cầu thủ ngoại quốc
                    </label>
                </div>

                <div className="flex justify-end space-x-4 pt-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                        disabled={!formData.team_id || loadingSeasons || loadingTeams || isSubmitting}
                    >
                        {isSubmitting ? 'Đang xử lý...' : (editingPlayer ? 'Lưu thay đổi' : 'Thêm cầu thủ')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlayerForm;