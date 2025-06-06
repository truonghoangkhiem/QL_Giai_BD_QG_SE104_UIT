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
        avatar: '',
    };

    const [formData, setFormData] = useState(initialFormDataState);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [teamsInSelectedSeason, setTeamsInSelectedSeason] = useState([]);
    const [error, setError] = useState('');
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // State cho vòng xoay tải

    const API_URL = 'http://localhost:5000';

    // Tải danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async () => {
            if (!token) return;
            setLoadingSeasons(true);
            try {
                const response = await axios.get(`${API_URL}/api/seasons`, { headers: { Authorization: `Bearer ${token}` } });
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0 && !editingPlayer) {
                    setSelectedSeasonId(seasonsData[0]._id);
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải.');
            } finally {
                setLoadingSeasons(false);
            }
        };
        fetchSeasons();
    }, [token, editingPlayer]);

    // Tải danh sách đội bóng khi mùa giải thay đổi
    useEffect(() => {
        if (!selectedSeasonId || !token) {
            setTeamsInSelectedSeason([]);
            if (editingPlayer) { // Don't clear team_id if editing
                setFormData(prev => ({ ...prev }));
            } else {
                setFormData(prev => ({ ...prev, team_id: '' }));
            }
            return;
        }
        const fetchTeams = async () => {
            setLoadingTeams(true);
            try {
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeasonId}`, { headers: { Authorization: `Bearer ${token}` } });
                setTeamsInSelectedSeason(response.data.data || []);
            } catch (err) {
                setError('Không thể tải danh sách đội bóng.');
            } finally {
                setLoadingTeams(false);
            }
        };
        fetchTeams();
    }, [selectedSeasonId, token]);

    // Điền dữ liệu vào form khi sửa
    useEffect(() => {
        if (editingPlayer) {
            const teamId = editingPlayer.team_id?._id || editingPlayer.team_id;
            const teamSeasonId = editingPlayer.team_id?.season_id?._id || editingPlayer.team_id?.season_id;
            
            if (teamSeasonId) setSelectedSeasonId(teamSeasonId);
            
            setFormData({
                team_id: teamId || '',
                name: editingPlayer.name || '',
                number: editingPlayer.number || '',
                position: editingPlayer.position || '',
                nationality: editingPlayer.nationality || '',
                dob: editingPlayer.dob ? new Date(editingPlayer.dob).toISOString().split('T')[0] : '',
                isForeigner: editingPlayer.isForeigner || false,
                avatar: editingPlayer.avatar || '',
            });
        }
    }, [editingPlayer]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');
        setIsSubmitting(true);

        const playerDataToSend = {
            ...formData,
            team_id: formData.team_id,
            number: formData.number.toString(),
            avatar: formData.avatar.trim() || '',
        };

        try {
            if (editingPlayer) {
                await axios.put(`${API_URL}/api/players/${editingPlayer._id}`, playerDataToSend, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // Tạo cầu thủ và các bản ghi liên quan
                const playerResponse = await axios.post(`${API_URL}/api/players`, playerDataToSend, { headers: { Authorization: `Bearer ${token}` } });
                const newPlayer = playerResponse.data.data;

                // Tạo PlayerResult
                await axios.post(`${API_URL}/api/player_results`, {
                    player_id: newPlayer._id,
                    season_id: selectedSeasonId,
                    team_id: newPlayer.team_id,
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            onSuccess();
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Đã có lỗi xảy ra.";
            setError(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="container mx-auto p-6 bg-white shadow-xl rounded-lg">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
                {editingPlayer ? 'Sửa thông tin cầu thủ' : 'Thêm cầu thủ mới'}
            </h2>
            {error && <p className="text-red-600 mb-4 text-center p-3 bg-red-100 rounded-md shadow">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                 <fieldset disabled={isSubmitting} className="space-y-6">
                    {/* Season and Team Selection for NEW players */}
                    {!editingPlayer && (
                        <>
                             <div>
                                <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">Mùa giải:</label>
                                <select id="season-select" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} required disabled={loadingSeasons} className="w-full p-3 border border-gray-300 rounded-md shadow-sm">
                                    <option value="">{loadingSeasons ? "Đang tải..." : "Chọn mùa giải"}</option>
                                    {seasons.map((season) => <option key={season._id} value={season._id}>{season.season_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 mb-1">Đội bóng:</label>
                                <select id="team-select" value={formData.team_id} onChange={(e) => setFormData({ ...formData, team_id: e.target.value })} required disabled={loadingTeams || !selectedSeasonId} className="w-full p-3 border border-gray-300 rounded-md shadow-sm">
                                    <option value="">{loadingTeams ? "Đang tải..." : "Chọn đội bóng"}</option>
                                    {teamsInSelectedSeason.map((team) => <option key={team._id} value={team._id}>{team.team_name}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Player Details */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên cầu thủ:</label>
                        <input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên cầu thủ" required className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="number" className="block text-sm font-medium text-gray-700">Số áo:</label>
                            <input id="number" type="number" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} placeholder="Số áo" required min="1" max="999" className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-gray-700">Vị trí:</label>
                            <input id="position" type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Vị trí" required className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Quốc tịch:</label>
                            <input id="nationality" type="text" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} placeholder="Quốc tịch" required className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Ngày sinh:</label>
                            <input id="dob" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} required className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">URL Ảnh đại diện:</label>
                        <input id="avatar" type="url" value={formData.avatar} onChange={(e) => setFormData({ ...formData, avatar: e.target.value })} placeholder="https://example.com/player.jpg" className="mt-1 w-full p-3 border border-gray-300 rounded-md" />
                    </div>

                    <div className="flex items-center">
                        <input id="isForeigner" type="checkbox" checked={formData.isForeigner} onChange={(e) => setFormData({ ...formData, isForeigner: e.target.checked })} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                        <label htmlFor="isForeigner" className="ml-2 block text-sm text-gray-900">Cầu thủ ngoại quốc</label>
                    </div>

                    <div className="flex justify-end space-x-4 pt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Hủy</button>
                        <button type="submit" className="px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center w-36">
                            {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (editingPlayer ? 'Lưu thay đổi' : 'Thêm cầu thủ')}
                        </button>
                    </div>
                 </fieldset>
            </form>
        </div>
    );
};

export default PlayerForm;