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
    const [selectedTeam, setSelectedTeam] = useState('');
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
                if (seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError(`Không thể tải danh sách mùa giải: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingSeasons(false);
            }
        };

        if (token) fetchSeasons();
    }, [token]);

    // Fetch teams when season changes
    useEffect(() => {
        if (!selectedSeason || !token) return;

        const fetchTeams = async () => {
            setLoadingTeams(true);
            setTeams([]);
            setSelectedTeam('');
            setFormData((prev) => ({ ...prev, team_id: '' }));

            try {
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const teamsData = response.data.data || [];
                setTeams(teamsData);
                if (teamsData.length > 0) {
                    setSelectedTeam(teamsData[0]._id);
                    setFormData((prev) => ({ ...prev, team_id: teamsData[0]._id }));
                }
            } catch (err) {
                setError(`Không thể tải danh sách đội bóng: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingTeams(false);
            }
        };

        fetchTeams();
    }, [selectedSeason, token]);

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
            setSelectedTeam(editingPlayer.team_id || '');
            const fetchTeamSeason = async () => {
                try {
                    const response = await axios.get(`${API_URL}/api/teams/${editingPlayer.team_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setSelectedSeason(response.data.data.season_id || '');
                } catch (err) {
                    setError(`Không thể tải thông tin mùa giải: ${err.response?.data?.message || err.message}`);
                }
            };
            if (editingPlayer.team_id) fetchTeamSeason();
        }
    }, [editingPlayer, token]);

    // Sync selected team with formData
    useEffect(() => {
        setFormData((prev) => ({ ...prev, team_id: selectedTeam }));
    }, [selectedTeam]);

    // Validate form inputs
    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Tên cầu thủ không được để trống');
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
        if (isNaN(dob.getTime()) || dob > today) {
            setError('Ngày sinh không hợp lệ hoặc trong tương lai');
            return false;
        }
        return true;
    };

    // Check team constraints (max players, foreign players, age, jersey number)
    const checkTeamConstraints = async () => {
        try {
            const [playersResponse, teamResponse, regulationResponse] = await Promise.all([
                axios.get(`${API_URL}/api/players/team/${selectedTeam}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_URL}/api/teams/${selectedTeam}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_URL}/api/regulations/season/${selectedSeason}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const players = playersResponse.data.data || [];
            const team = teamResponse.data.data;
            const regulations = regulationResponse.data.data || [];

            // Validate team and season consistency
            if (!team || team.season_id !== selectedSeason) {
                setError('Đội bóng không thuộc mùa giải đã chọn');
                return false;
            }

            // Check jersey number
            if (players.some((player) => player.number === formData.number.toString() && player._id !== editingPlayer?._id)) {
                setError('Số áo này đã được sử dụng trong đội');
                return false;
            }

            // Find age regulation
            const ageRegulation = regulations.find((reg) => reg.regulation_name === 'Age Regulation');
            if (!ageRegulation) {
                setError('Không tìm thấy quy định độ tuổi cho mùa giải này');
                return false;
            }

            const { maxPlayersPerTeam, maxForeignPlayers, minAge, maxAge } = ageRegulation.rules;

            // Check max players
            if (!editingPlayer && players.length >= maxPlayersPerTeam) {
                setError(`Đội đã đạt số lượng tối đa (${maxPlayersPerTeam} cầu thủ)`);
                return false;
            }

            // Check foreign players
            const foreignPlayers = players.filter((player) => player.isForeigner);
            if (formData.isForeigner && foreignPlayers.length >= maxForeignPlayers && !editingPlayer?.isForeigner) {
                setError(`Đội đã đạt số lượng tối đa (${maxForeignPlayers} cầu thủ ngoại)`);
                return false;
            }

            // Check age
            const playerAge = Math.floor((new Date() - new Date(formData.dob)) / (365.25 * 24 * 60 * 60 * 1000));
            if (playerAge < minAge || playerAge > maxAge) {
                setError(`Độ tuổi phải từ ${minAge} đến ${maxAge}`);
                return false;
            }

            return true;
        } catch (err) {
            setError(`Không thể kiểm tra quy định đội bóng: ${err.response?.data?.message || err.message}`);
            return false;
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Vui lòng đăng nhập để tiếp tục');
            return;
        }

        if (!validateForm()) return;
        if (!editingPlayer && !(await checkTeamConstraints())) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const dataToSend = {
                team_id: formData.team_id,
                name: formData.name,
                number: formData.number,
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
                    setError('Không thể tạo cầu thủ: Phản hồi từ server không hợp lệ');
                    return;
                }

                // Create PlayerResult
                try {
                    const playerResultData = {
                        player_id: newPlayer._id,
                        season_id: selectedSeason,
                        team_id: selectedTeam,
                    };

                    await axios.post(`${API_URL}/api/player_results`, playerResultData, config);
                    setPlayers((prev) => [...prev, newPlayer]);
                    onSuccess?.('Thêm cầu thủ và kết quả thi đấu thành công!');
                } catch (playerResultErr) {
                    // Rollback player creation
                    try {
                        await axios.delete(`${API_URL}/api/players/${newPlayer._id}`, config);
                    } catch (rollbackErr) {
                        console.error('Không thể hủy tạo cầu thủ:', rollbackErr);
                    }

                    const errMsg = playerResultErr.response?.data?.message || playerResultErr.message;
                    if (errMsg.includes('Player result already exists')) {
                        setError('Kết quả thi đấu đã tồn tại cho cầu thủ này trong mùa giải này');
                    } else if (errMsg.includes('Player not found') || errMsg.includes('Season not found')) {
                        setError('Không tìm thấy cầu thủ hoặc mùa giải');
                    } else {
                        setError(`Không thể tạo kết quả thi đấu: ${errMsg}`);
                    }
                    return;
                }
            }

            // Reset form
            setShowForm(false);
            setEditingPlayer(null);
            setFormData({
                team_id: '',
                name: '',
                number: '',
                position: '',
                nationality: '',
                dob: '',
                isForeigner: false,
            });
            setSelectedSeason('');
            setSelectedTeam('');
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message;
            if (errMsg.includes('player number already exists')) {
                setError('Số áo này đã được sử dụng trong đội');
            } else if (errMsg.includes('too many foreign players')) {
                setError('Đội đã vượt quá số lượng cầu thủ ngoại quốc');
            } else if (errMsg.includes('age out of range')) {
                setError('Độ tuổi không phù hợp với quy định');
            } else if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn');
            } else if (err.response?.status === 404) {
                setError('Đội bóng hoặc mùa giải không tồn tại');
            } else {
                setError(`Lỗi: ${errMsg}`);
            }
        }
    };

    // Handle form cancellation
    const handleCancel = () => {
        setShowForm(false);
        setEditingPlayer(null);
        setFormData({
            team_id: '',
            name: '',
            number: '',
            position: '',
            nationality: '',
            dob: '',
            isForeigner: false,
        });
        setSelectedSeason('');
        setSelectedTeam('');
        setError('');
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingPlayer ? 'Sửa cầu thủ' : 'Thêm cầu thủ'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label htmlFor="season-select" className="block text-gray-600 mb-1">
                        Mùa giải:
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                        disabled={loadingSeasons || editingPlayer}
                        required
                    >
                        {loadingSeasons ? (
                            <option value="">Đang tải...</option>
                        ) : seasons.length === 0 ? (
                            <option value="">Không có mùa giải</option>
                        ) : (
                            seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="team-select" className="block text-gray-600 mb-1">
                        Đội bóng:
                    </label>
                    <select
                        id="team-select"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600"
                        disabled={loadingTeams || !selectedSeason || editingPlayer}
                        required
                    >
                        {loadingTeams ? (
                            <option value="">Đang tải...</option>
                        ) : teams.length === 0 ? (
                            <option value="">Không có đội bóng</option>
                        ) : (
                            teams.map((team) => (
                                <option key={team._id} value={team._id}>
                                    {team.team_name}
                                </option>
                            ))
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
                    type="number"
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
                        className="mr-2"
                    />
                    <label htmlFor="isForeigner" className="text-gray-600">
                        Cầu thủ ngoại quốc
                    </label>
                </div>
                <div className="flex space-x-2">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={!selectedSeason || !selectedTeam || loadingSeasons || loadingTeams}
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