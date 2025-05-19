import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerForm = ({ editingPlayer, setEditingPlayer, setShowForm, setPlayers, token, onSuccess }) => {
    const [formData, setFormData] = useState({
        team_id: '',
        name: '',
        number: '',
        position: '',
        nationality: '',
        dob: '',
        isForeigner: false,
    });
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(''); // Vẫn giữ selectedTeam để quản lý dropdown đội
    const [error, setError] = useState('');
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);

    const API_URL = 'http://localhost:5000';

    // Fetch seasons on mount
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const response = await axios.get(`${API_URL}/api/seasons`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (!editingPlayer && seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError(`Không thể tải danh sách mùa giải: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingSeasons(false);
            }
        };

        if (token) fetchSeasons();
    }, [token, editingPlayer]); // Thêm editingPlayer để re-fetch seasons nếu cần khi form reset

    // Fetch teams when season changes or when editingPlayer and selectedSeason is set
    useEffect(() => {
        if (!selectedSeason || !token) {
            setTeams([]);
            setSelectedTeam(''); // Clear selected team when season is not set
            // formData.team_id will be cleared by the subsequent useEffect
            return;
        }

        const fetchTeams = async () => {
            setLoadingTeams(true);
            setTeams([]); // Clear previous teams
            setSelectedTeam(''); // Clear selected team for new season
            // formData.team_id will be updated by useEffect watching selectedTeam

            try {
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const teamsData = response.data.data || [];
                setTeams(teamsData);
                if (teamsData.length > 0) {
                    // If editing, try to keep selectedTeam if it's in the new list, else pick first
                    if (editingPlayer && editingPlayer.team_id && teamsData.some(t => t._id === editingPlayer.team_id)) {
                        setSelectedTeam(editingPlayer.team_id);
                    } else if (!editingPlayer) { // For new player, auto-select first team
                        setSelectedTeam(teamsData[0]._id);
                    }
                }
                // If editingPlayer and their team_id wasn't in teamsData, selectedTeam remains ''
                // formData.team_id will update accordingly.
            } catch (err) {
                setError(`Không thể tải danh sách đội bóng: ${err.response?.data?.message || err.message}`);
                setTeams([]);
                setSelectedTeam('');
            } finally {
                setLoadingTeams(false);
            }
        };

        fetchTeams();
    }, [selectedSeason, token, editingPlayer]); // Thêm editingPlayer here

    // Populate form when editing a player
    useEffect(() => {
        if (editingPlayer) {
            setFormData({
                team_id: editingPlayer.team_id || '',
                name: editingPlayer.name || '',
                number: editingPlayer.number || '',
                position: editingPlayer.position || '',
                nationality: editingPlayer.nationality || '',
                dob: editingPlayer.dob ? new Date(editingPlayer.dob).toISOString().split('T')[0] : '',
                isForeigner: editingPlayer.isForeigner || false,
            });
            // Fetch the season of the team the player belongs to and set it
            const fetchTeamSeason = async () => {
                if (!editingPlayer.team_id) return;
                try {
                    const teamResponse = await axios.get(`${API_URL}/api/teams/${editingPlayer.team_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (teamResponse.data.data && teamResponse.data.data.season_id) {
                        // Set selectedSeason first, this will trigger team loading
                        setSelectedSeason(teamResponse.data.data.season_id._id || teamResponse.data.data.season_id);
                        // Then set selectedTeam once teams for that season are loaded by the other useEffect
                        // setSelectedTeam will be correctly set by the useEffect that watches selectedSeason
                    }
                } catch (err) {
                    setError(`Không thể tải thông tin mùa giải của đội: ${err.response?.data?.message || err.message}`);
                }
            };
            fetchTeamSeason();
        } else {
            // Reset form for new player
            setFormData({
                team_id: '', name: '', number: '', position: '',
                nationality: '', dob: '', isForeigner: false,
            });
            // Don't reset selectedSeason if seasons are already loaded, let user pick
            // setSelectedTeam(''); // Will be set by useEffect on selectedSeason change
        }
    }, [editingPlayer, token]);

    // Sync selected team with formData.team_id
    useEffect(() => {
        // Only update formData.team_id if selectedTeam is valid,
        // or if editingPlayer and their team_id matches selectedTeam
        if (selectedTeam || (editingPlayer && editingPlayer.team_id === selectedTeam)) {
             setFormData((prev) => ({ ...prev, team_id: selectedTeam }));
        } else if (!editingPlayer && teams.length > 0 && !selectedTeam) {
            // If creating a new player and selectedTeam got cleared but there are teams,
            // default to the first one. This case might be redundant if handled well in selectedSeason useEffect.
            // setSelectedTeam(teams[0]._id);
        } else if (!selectedTeam) { // Explicitly clear if selectedTeam is empty
            setFormData((prev) => ({ ...prev, team_id: '' }));
        }
    }, [selectedTeam, editingPlayer, teams]);

    // Validate form inputs
    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Tên cầu thủ không được để trống');
            return false;
        }
        if (!formData.team_id){ // Check if a team is selected in the form data
            setError('Vui lòng chọn đội bóng.');
            return false;
        }
        const numberValue = Number(formData.number);
        if (!Number.isInteger(numberValue) || numberValue <= 0) {
            setError('Số áo phải là số nguyên dương');
            return false;
        }
        if (!formData.position.trim()) {
            setError('Vị trí không được để trống');
            return false;
        }
        if (!formData.nationality.trim()) {
            setError('Quốc tịch không được để trống');
            return false;
        }
        const dob = new Date(formData.dob);
        const today = new Date();
        today.setHours(0,0,0,0); // Compare dates only
        if (isNaN(dob.getTime()) || dob > today) {
            setError('Ngày sinh không hợp lệ hoặc trong tương lai');
            return false;
        }
        return true;
    };

    // Check team constraints (max players, foreign players, age, jersey number)
    const checkTeamConstraints = async () => {
        if (!formData.team_id) {
            setError('Vui lòng chọn đội bóng.');
            return false;
        }
        if (!selectedSeason) { // Ensure a season context is selected
            setError('Vui lòng chọn mùa giải.');
            return false;
        }

        try {
            const [playersInTeamResponse, teamDetailsResponse, regulationsResponse] = await Promise.all([
                axios.get(`${API_URL}/api/players/team/${formData.team_id}`, { // Use formData.team_id
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_URL}/api/teams/${formData.team_id}`, { // Use formData.team_id
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_URL}/api/regulations/season/${selectedSeason}`, { // selectedSeason for context
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const playersInTeam = playersInTeamResponse.data.data || [];
            const teamDetails = teamDetailsResponse.data.data;
            const regulations = regulationsResponse.data.data || [];

            if (!teamDetails) {
                setError('Không tìm thấy thông tin đội bóng đã chọn.');
                return false;
            }
            
            // This is the critical check
            const actualTeamSeasonId = teamDetails.season_id._id || teamDetails.season_id; // Handle populated or direct ID
            if (actualTeamSeasonId !== selectedSeason) {
                setError('Đội bóng không thuộc mùa giải đã chọn. Vui lòng kiểm tra lại mùa giải và đội bóng.');
                return false;
            }

            // Check jersey number (only if number has a value)
            if (formData.number && playersInTeam.some(
                (player) => player.number === formData.number.toString() && player._id !== editingPlayer?._id
            )) {
                setError('Số áo này đã được sử dụng trong đội.');
                return false;
            }

            const ageRegulation = regulations.find((reg) => reg.regulation_name === 'Age Regulation');
            if (!ageRegulation || !ageRegulation.rules) {
                setError('Không tìm thấy quy định độ tuổi cho mùa giải này.');
                return false; // Or allow if not critical, depends on requirements
            }

            const { maxPlayersPerTeam, maxForeignPlayers, minAge, maxAge } = ageRegulation.rules;

            if (maxPlayersPerTeam !== undefined && !editingPlayer && playersInTeam.length >= maxPlayersPerTeam) {
                setError(`Đội đã đạt số lượng tối đa (${maxPlayersPerTeam} cầu thủ).`);
                return false;
            }

            if (maxForeignPlayers !== undefined && formData.isForeigner) {
                const foreignPlayersCount = playersInTeam.filter(
                    (player) => player.isForeigner && player._id !== editingPlayer?._id
                ).length;
                if (foreignPlayersCount >= maxForeignPlayers) {
                    setError(`Đội đã đạt số lượng tối đa (${maxForeignPlayers} cầu thủ ngoại).`);
                    return false;
                }
            }
            
            if (formData.dob && minAge !== undefined && maxAge !== undefined) {
                const playerAge = Math.floor((new Date() - new Date(formData.dob)) / (365.25 * 24 * 60 * 60 * 1000));
                if (playerAge < minAge || playerAge > maxAge) {
                    setError(`Độ tuổi của cầu thủ phải từ ${minAge} đến ${maxAge}.`);
                    return false;
                }
            }

            return true;
        } catch (err) {
            const apiErrorMessage = err.response?.data?.message || err.message;
            if (err.response?.status === 404 && apiErrorMessage.includes("Team not found")) {
                 setError(`Đội bóng với ID ${formData.team_id} không tồn tại.`);
            } else {
                 setError(`Không thể kiểm tra quy định đội bóng: ${apiErrorMessage}`);
            }
            return false;
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Vui lòng đăng nhập để tiếp tục.');
            return;
        }

        if (!validateForm()) return;
        
        // Perform constraint check only if creating a new player or if team/season context might have changed for an existing one
        // For editing, if team_id hasn't changed, some checks might be skippable if they only depend on other players in the team.
        // However, age check is always relevant.
        if (!(await checkTeamConstraints())) return;


        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const dataToSend = {
                team_id: formData.team_id, // Ensure this is the correct, validated team_id
                name: formData.name,
                number: formData.number.toString(), // Ensure number is string as per schema (if backend expects string)
                position: formData.position,
                nationality: formData.nationality,
                dob: formData.dob,
                isForeigner: formData.isForeigner,
            };

            let response;
            if (editingPlayer) {
                response = await axios.put(`${API_URL}/api/players/${editingPlayer._id}`, dataToSend, config);
                setPlayers((prev) =>
                    prev.map((player) => (player._id === editingPlayer._id ? response.data.data : player))
                );
                onSuccess?.('Cập nhật cầu thủ thành công!');
            } else {
                response = await axios.post(`${API_URL}/api/players`, dataToSend, config);
                const newPlayer = response.data.data;

                if (!newPlayer?._id) {
                    setError('Không thể tạo cầu thủ: Phản hồi từ server không hợp lệ.');
                    return;
                }

                try {
                    const playerResultData = {
                        player_id: newPlayer._id,
                        season_id: selectedSeason, // Use selectedSeason from the form context
                        team_id: newPlayer.team_id, // Use team_id from the newly created player
                    };

                    await axios.post(`${API_URL}/api/player_results`, playerResultData, config);
                    setPlayers((prev) => [...prev, newPlayer]);
                    onSuccess?.('Thêm cầu thủ và kết quả thi đấu thành công!');
                } catch (playerResultErr) {
                    try {
                        await axios.delete(`${API_URL}/api/players/${newPlayer._id}`, config);
                    } catch (rollbackErr) {
                        console.error('Không thể hủy tạo cầu thủ:', rollbackErr);
                    }
                    const errMsg = playerResultErr.response?.data?.message || playerResultErr.message;
                    setError(`Không thể tạo kết quả thi đấu: ${errMsg}. Cầu thủ đã được hoàn tác.`);
                    return;
                }
            }

            setShowForm(false);
            setEditingPlayer(null);
            // Reset form fields, selectedSeason might persist if user wants to add another player to same season
            setFormData({ team_id: '', name: '', number: '', position: '', nationality: '', dob: '', isForeigner: false });
            // setSelectedTeam(''); // Keep selectedTeam if user might add more players to this team.
            // If selectedSeason causes teams to reload, selectedTeam will adjust.
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message;
            setError(`Lỗi khi lưu cầu thủ: ${errMsg}`);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPlayer(null);
        setFormData({ team_id: '', name: '', number: '', position: '', nationality: '', dob: '', isForeigner: false });
        // setSelectedSeason(''); // Optional: reset season or keep it
        setSelectedTeam('');
        setError('');
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingPlayer ? 'Sửa cầu thủ' : 'Thêm cầu thủ'}</h2>
            {error && <p className="text-red-500 mb-4 text-center p-2 bg-red-100 rounded">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label htmlFor="season-select" className="block text-gray-600 mb-1">
                        Mùa giải:
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => {
                            setSelectedSeason(e.target.value);
                            // When season changes, selectedTeam and formData.team_id will be reset/updated by useEffect
                        }}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                        disabled={loadingSeasons || (editingPlayer && !!editingPlayer.team_id)} // Disable if editing and team already set
                        required
                    >
                        {loadingSeasons ? (
                            <option value="">Đang tải mùa giải...</option>
                        ) : seasons.length === 0 ? (
                            <option value="">Không có mùa giải</option>
                        ) : (
                            <>
                              {!editingPlayer && <option value="">Chọn mùa giải</option>}
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
                    <label htmlFor="team-select" className="block text-gray-600 mb-1">
                        Đội bóng:
                    </label>
                    <select
                        id="team-select"
                        value={selectedTeam} // Controlled by selectedTeam state
                        onChange={(e) => {
                            setSelectedTeam(e.target.value); // This will trigger formData.team_id update
                        }}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                        disabled={loadingTeams || !selectedSeason || (editingPlayer && !!editingPlayer.team_id)}
                        required
                    >
                        {loadingTeams ? (
                            <option value="">Đang tải đội bóng...</option>
                        ) : !selectedSeason ? (
                             <option value="">Vui lòng chọn mùa giải trước</option>
                        ) : teams.length === 0 ? (
                            <option value="">Không có đội bóng cho mùa giải này</option>
                        ) : (
                            <>
                                <option value="">Chọn đội bóng</option>
                                {teams.map((team) => (
                                    <option key={team._id} value={team._id}>
                                        {team.team_name}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tên cầu thủ"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                    required
                />
                <input
                    type="number" // Use number type for better UX on mobile
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Số áo"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                    min="1"
                    required
                />
                <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Vị trí"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                    required
                />
                <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="Quốc tịch"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                    required
                />
                <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                    required
                />
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isForeigner"
                        checked={formData.isForeigner}
                        onChange={(e) => setFormData({ ...formData, isForeigner: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isForeigner" className="text-gray-600">
                        Cầu thủ ngoại quốc
                    </label>
                </div>
                <div className="flex space-x-2">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        disabled={!selectedSeason || !formData.team_id || loadingSeasons || loadingTeams}
                    >
                        Lưu
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlayerForm;