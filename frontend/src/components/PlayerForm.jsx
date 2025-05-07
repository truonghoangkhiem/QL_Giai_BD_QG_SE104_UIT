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
    });
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [error, setError] = useState('');
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);

    const API_URL = 'http://localhost:5000';

    // Lấy danh sách mùa giải
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
                setError('Không thể tải danh sách mùa giải.');
            } finally {
                setLoadingSeasons(false);
            }
        };

        fetchSeasons();
    }, [token]);

    // Lấy danh sách đội bóng khi mùa giải thay đổi
    useEffect(() => {
        if (!selectedSeason) return;

        const fetchTeams = async () => {
            setLoadingTeams(true);
            try {
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const teamsData = response.data.data || [];
                setTeams(teamsData);
                if (teamsData.length > 0 && !selectedTeam) {
                    setSelectedTeam(teamsData[0]._id);
                    setFormData((prev) => ({ ...prev, team_id: teamsData[0]._id }));
                } else if (!teamsData.length) {
                    setSelectedTeam('');
                    setFormData((prev) => ({ ...prev, team_id: '' }));
                }
            } catch (err) {
                setError('Không thể tải danh sách đội bóng.');
            } finally {
                setLoadingTeams(false);
            }
        };

        fetchTeams();
    }, [selectedSeason, token]);

    // Cập nhật formData khi editingPlayer thay đổi
    useEffect(() => {
        if (editingPlayer) {
            setFormData({
                team_id: editingPlayer.team_id || '',
                name: editingPlayer.name || '',
                number: editingPlayer.number || '',
                position: editingPlayer.position || '',
                nationality: editingPlayer.nationality || '',
                dob: editingPlayer.dob ? new Date(editingPlayer.dob).toISOString().split('T')[0] : '',
            });
            setSelectedTeam(editingPlayer.team_id || '');
            // Giả sử cần lấy season_id từ team_id để hiển thị đúng mùa giải
            const fetchTeamSeason = async () => {
                try {
                    const response = await axios.get(`${API_URL}/api/teams/${editingPlayer.team_id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const team = response.data.data;
                    setSelectedSeason(team.season_id || '');
                } catch (err) {
                    setError('Không thể tải thông tin mùa giải của đội.');
                }
            };
            if (editingPlayer.team_id) fetchTeamSeason();
        }
    }, [editingPlayer, token]);

    // Cập nhật team_id trong formData khi selectedTeam thay đổi
    useEffect(() => {
        setFormData((prev) => ({ ...prev, team_id: selectedTeam }));
    }, [selectedTeam]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            let response;
            if (editingPlayer) {
                response = await axios.put(`http://localhost:5000/api/players/${editingPlayer._id}`, formData, config);
                setPlayers((prev) =>
                    prev.map((player) => (player._id === editingPlayer._id ? response.data.data : player))
                );
            } else {
                response = await axios.post('http://localhost:5000/api/players', formData, config);
                setPlayers((prev) => [...prev, response.data.data]);
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
            });
            setSelectedSeason('');
            setSelectedTeam('');
            onSuccess(editingPlayer ? 'Cập nhật cầu thủ thành công!' : 'Thêm cầu thủ thành công!');
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu cầu thủ');
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
                        disabled={loadingTeams || !selectedSeason}
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
                <div className="flex space-x-2">
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded">Lưu</button>
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