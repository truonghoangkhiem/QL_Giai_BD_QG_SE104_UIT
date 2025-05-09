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
                setError('Không thể tải danh sách mùa giải: ' + (err.message || 'Lỗi không xác định'));
            } finally {
                setLoadingSeasons(false);
            }
        };

        fetchSeasons();
    }, [token]);

    useEffect(() => {
        if (!selectedSeason) return;

        setSelectedTeam('');
        setFormData((prev) => ({ ...prev, team_id: '' }));

        const fetchTeams = async () => {
            setLoadingTeams(true);
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
                setError('Không thể tải danh sách đội bóng: ' + (err.message || 'Lỗi không xác định'));
            } finally {
                setLoadingTeams(false);
            }
        };

        fetchTeams();
    }, [selectedSeason, token]);

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
                    const team = response.data.data;
                    setSelectedSeason(team.season_id || '');
                } catch (err) {
                    setError('Không thể tải thông tin mùa giải của đội: ' + (err.message || 'Lỗi không xác định'));
                }
            };
            if (editingPlayer.team_id) fetchTeamSeason();
        }
    }, [editingPlayer, token]);

    useEffect(() => {
        setFormData((prev) => ({ ...prev, team_id: selectedTeam }));
    }, [selectedTeam]);

    const validateForm = () => {
        const numberValue = Number(formData.number);
        if (!Number.isInteger(numberValue) || numberValue <= 0) {
            setError('Số áo phải là số nguyên dương');
            return false;
        }
        const today = new Date();
        const dob = new Date(formData.dob);
        if (dob > today) {
            setError('Ngày sinh không được là ngày trong tương lai');
            return false;
        }
        return true;
    };

    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }

        return age;
    };

    const checkTeamConstraints = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/players/team/${selectedTeam}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const players = response.data.data || [];
            const foreignPlayers = players.filter(player => player.isForeigner === true);
            const numberExists = players.some(player => player.number === formData.number.toString());
            if (numberExists) {
                setError('Số áo này đã được sử dụng trong đội');
                return false;
            }

            const teamResponse = await axios.get(`${API_URL}/api/teams/${selectedTeam}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const team = teamResponse.data.data;
            if (!team || team.season_id !== selectedSeason) {
                setError('Đội bóng không thuộc mùa giải đã chọn. Vui lòng chọn lại đội bóng hoặc cập nhật season_id của đội bóng trong database.');
                return false;
            }

            const regulationResponse = await axios.get(`${API_URL}/api/regulations/season/${selectedSeason}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const regulations = regulationResponse.data.data || [];
            const ageRegulation = regulations.find(reg => reg.regulation_name === 'Age Regulation');
            if (!ageRegulation) {
                setError('Không tìm thấy quy định độ tuổi cho mùa giải này');
                return false;
            }
            const { maxPlayersPerTeam, maxForeignPlayers, minAge, maxAge } = ageRegulation.rules;

            if (players.length >= maxPlayersPerTeam) {
                setError('Đội đã đạt số lượng cầu thủ tối đa');
                return false;
            }
            if (formData.isForeigner && foreignPlayers.length >= maxForeignPlayers) {
                setError('Đội đã vượt quá số lượng cầu thủ ngoại quốc cho phép');
                return false;
            }

            const playerAge = calculateAge(formData.dob);
            if (playerAge < minAge || playerAge > maxAge) {
                setError(`Độ tuổi phải từ ${minAge} đến ${maxAge} (theo quy định của mùa giải)`);
                return false;
            }

            return true;
        } catch (err) {
            setError('Không thể kiểm tra quy định đội bóng: ' + (err.message || 'Lỗi không xác định'));
            return false;
        }
    };

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

            const requiredFields = ['team_id', 'name', 'number', 'position', 'nationality', 'dob', 'isForeigner'];
            const missingFields = requiredFields.filter(field => dataToSend[field] === undefined || dataToSend[field] === '');
            if (missingFields.length > 0) {
                setError(`Thiếu các trường bắt buộc: ${missingFields.join(', ')}`);
                return;
            }

            console.log('Submitting player data:', dataToSend);
            let response;
            if (editingPlayer) {
                const updateData = { ...dataToSend };
                delete updateData.team_id;
                response = await axios.put(`${API_URL}/api/players/${editingPlayer._id}`, updateData, config);
                setPlayers((prev) =>
                    prev.map((player) => (player._id === editingPlayer._id ? response.data.data : player))
                );
                if (typeof onSuccess === 'function') {
                    onSuccess('Cập nhật cầu thủ thành công!');
                }
            } else {
                response = await axios.post(`${API_URL}/api/players`, dataToSend, config);
                console.log('Player API response:', response.data);
                const newPlayer = response.data.data;

                if (!newPlayer || !newPlayer._id) {
                    console.error('Invalid player API response:', response.data);
                    setError('Không thể tạo cầu thủ: Phản hồi từ server không chứa thông tin cầu thủ.');
                    return;
                }

                try {
                    const currentDate = new Date();
                    currentDate.setUTCHours(0, 0, 0, 0);
                    const playerResultData = {
                        player_id: newPlayer._id,
                        season_id: selectedSeason,
                        team_id: selectedTeam,
                        date: currentDate.toISOString(),
                        matchesplayed: 0,
                        totalGoals: 0,
                        assists: 0,
                        yellowCards: 0,
                        redCards: 0,
                    };

                    const requiredPlayerResultFields = ['player_id', 'season_id', 'team_id', 'date', 'matchesplayed', 'totalGoals', 'assists', 'yellowCards', 'redCards'];
                    const missingPlayerResultFields = requiredPlayerResultFields.filter(
                        field => playerResultData[field] === undefined || playerResultData[field] === ''
                    );
                    if (missingPlayerResultFields.length > 0) {
                        throw new Error(`Thiếu các trường bắt buộc cho PlayerResult: ${missingPlayerResultFields.join(', ')}`);
                    }

                    console.log('Creating playerResult with data:', playerResultData);
                    await axios.post(`${API_URL}/api/player_results`, playerResultData, config);

                    setPlayers((prev) => [...prev, newPlayer]);
                    if (typeof onSuccess === 'function') {
                        onSuccess('Thêm cầu thủ và PlayerResult thành công!');
                    }
                } catch (playerResultErr) {
                    try {
                        await axios.delete(`${API_URL}/api/players/${newPlayer._id}`, config);
                        console.log('Rolled back player creation for player:', newPlayer._id);
                    } catch (rollbackErr) {
                        console.error('Failed to roll back player creation:', rollbackErr);
                    }

                    const playerResultErrorData = playerResultErr.response?.data || { message: playerResultErr.message || 'Lỗi không xác định từ server' };
                    let playerResultErrorMessage = typeof playerResultErrorData.message === 'string'
                        ? playerResultErrorData.message
                        : 'Không thể tạo PlayerResult, lỗi không xác định';

                    if (playerResultErrorMessage.includes('Player result already exists')) {
                        playerResultErrorMessage = 'PlayerResult đã tồn tại cho cầu thủ này trong mùa giải này. Vui lòng xóa PlayerResult cũ nếu muốn tạo lại.';
                    } else if (playerResultErrorMessage.includes('Invalid')) {
                        playerResultErrorMessage = `Dữ liệu không hợp lệ: ${playerResultErrorMessage}`;
                    } else if (playerResultErr.response?.status === 401) {
                        playerResultErrorMessage = 'Phiên đăng nhập hết hạn, không thể tạo PlayerResult.';
                    } else if (playerResultErr.response?.status === 404) {
                        playerResultErrorMessage = 'Không tìm thấy cầu thủ hoặc mùa giải khi tạo PlayerResult.';
                    } else if (playerResultErr.response?.status === 500) {
                        playerResultErrorMessage = 'Lỗi server khi tạo PlayerResult, có thể do dữ liệu không hợp lệ hoặc lỗi hệ thống.';
                    }

                    setError(`Không thể tạo cầu thủ do lỗi khi tạo PlayerResult: ${playerResultErrorMessage}`);
                    return;
                }
            }
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
            const errorData = err.response?.data || { message: err.message || 'Lỗi không xác định' };
            console.error('Error adding/updating player:', errorData);
            const errorMessage = typeof errorData.message === 'string' ? errorData.message : 'Không thể lưu cầu thủ';
            if (errorMessage.includes('player number already exists')) {
                setError('Số áo này đã được sử dụng trong đội');
            } else if (errorMessage.includes('too many foreign players')) {
                setError('Đội đã vượt quá số lượng cầu thủ ngoại quốc cho phép');
            } else if (errorMessage.includes('age out of range')) {
                setError('Độ tuổi của cầu thủ không phù hợp với quy định');
            } else if (err.response?.status === 401) {
                setError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
            } else if (err.response?.status === 404) {
                setError('Đội bóng không tồn tại');
            } else if (err.response?.status === 500) {
                setError('Quy định mùa giải không tồn tại');
            } else if (errorMessage.includes('Required')) {
                setError('Thiếu trường bắt buộc. Vui lòng kiểm tra dữ liệu nhập: ' + JSON.stringify(errorData));
            } else {
                setError(errorMessage);
            }
        }
    };

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
                    <label htmlFor="season-select" className="block text-gray-600 mb-1">Mùa giải:</label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="w-full p-2 border rounded"
                        disabled={loadingSeasons}
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
                    <label htmlFor="team-select" className="block text-gray-600 mb-1">Đội bóng:</label>
                    <select
                        id="team-select"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full p-2 border rounded"
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
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Số áo"
                    className="w-full p-2 border rounded"
                    min="1"
                    required
                />
                <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Vị trí"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="Quốc tịch"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    placeholder="Ngày sinh"
                    className="w-full p-2 border rounded"
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
                    <label htmlFor="isForeigner" className="text-gray-600">Cầu thủ ngoại quốc</label>
                </div>
                <div className="flex space-x-2">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded disabled:bg-blue-300"
                        disabled={!selectedSeason || !selectedTeam || loadingSeasons || loadingTeams}
                    >
                        Lưu
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-gray-500 text-white p-2 rounded"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlayerForm;