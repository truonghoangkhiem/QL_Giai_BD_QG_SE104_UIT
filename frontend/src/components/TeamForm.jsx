import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamForm = ({ editingTeam, setEditingTeam, setShowForm, setTeams, seasons, token }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        team_name: '',
        stadium: '',
        coach: '',
        logo: '',
    });
    const [error, setError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        // console.log('seasons:', seasons);
        const safeSeasons = Array.isArray(seasons) ? seasons : [];
        if (editingTeam) {
            setFormData({
                season_id: editingTeam.season_id?._id || editingTeam.season_id, // Handle populated or direct ID
                team_name: editingTeam.team_name,
                stadium: editingTeam.stadium,
                coach: editingTeam.coach,
                logo: editingTeam.logo,
            });
            const currentSeasonId = editingTeam.season_id?._id || editingTeam.season_id;
            setIsFormValid(!!currentSeasonId && /^[0-9a-fA-F]{24}$/.test(currentSeasonId));
        } else if (safeSeasons.length > 0) {
            const firstValidSeason = safeSeasons.find(season => season._id && /^[0-9a-fA-F]{24}$/.test(season._id));
            if (firstValidSeason) {
                setFormData((prev) => ({
                    ...prev,
                    season_id: firstValidSeason._id,
                    team_name: '',
                    stadium: '',
                    coach: '',
                    logo: '',
                }));
                setIsFormValid(true);
            } else {
                setError('Không có ID mùa giải hợp lệ trong danh sách mùa giải.');
                setIsFormValid(false);
                setFormData((prev) => ({ ...prev, season_id: '' }));
            }
        } else {
            setError('Không có mùa giải nào để chọn. Vui lòng tạo mùa giải trước.');
            setIsFormValid(false);
            setFormData((prev) => ({ ...prev, season_id: '' }));
        }
    }, [editingTeam, seasons]);

    const validateFormData = () => {
        if (!formData.season_id) return 'Vui lòng chọn mùa giải';
        if (!/^[0-9a-fA-F]{24}$/.test(formData.season_id)) return 'ID mùa giải không hợp lệ';
        if (!formData.team_name.trim()) return 'Vui lòng nhập tên đội';
        if (!formData.stadium.trim()) return 'Vui lòng nhập sân vận động';
        if (!formData.coach.trim()) return 'Vui lòng nhập huấn luyện viên';
        if (!formData.logo.trim()) return 'Vui lòng nhập URL logo';
        if (!token) return 'Không có token xác thực. Vui lòng đăng nhập lại.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validateFormData();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            if (editingTeam) {
                // Sửa đội bóng
                const response = await axios.put(`http://localhost:5000/api/teams/${editingTeam._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTeams((prev) =>
                    prev.map((team) => (team._id === editingTeam._id ? response.data.data : team))
                );
            } else {
                // 1. Tạo đội bóng mới
                const teamResponse = await axios.post('http://localhost:5000/api/teams/', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const newTeamFromServer = teamResponse.data.data;
                const newTeamId = newTeamFromServer?._id; // Backend nên trả về _id

                if (!newTeamId || !/^[0-9a-fA-F]{24}$/.test(newTeamId)) {
                    throw new Error('ID đội bóng không hợp lệ hoặc không được trả về từ API sau khi tạo.');
                }

                // 2. Tạo TeamResult ban đầu
                console.log('Frontend: Creating TeamResult payload:', { team_id: newTeamId, season_id: formData.season_id });
                const teamResultResponse = await axios.post('http://localhost:5000/api/team_results/', {
                    team_id: newTeamId,
                    season_id: formData.season_id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Frontend: teamResultResponse data:', teamResultResponse.data);
                
                const newTeamResultId = teamResultResponse.data.data?._id;
                if (!newTeamResultId || !/^[0-9a-fA-F]{24}$/.test(newTeamResultId)) {
                     throw new Error('Không lấy được ID của TeamResult từ phản hồi sau khi tạo hoặc ID không hợp lệ.');
                }

                // 3. Tạo Ranking ban đầu
                // Endpoint của ranking là /api/rankings/:team_result_id và season_id trong body
                console.log('Frontend: Creating Ranking payload:', { team_result_id: newTeamResultId, season_id: formData.season_id });
                const rankingResponse = await axios.post(`http://localhost:5000/api/rankings/${newTeamResultId}`, {
                    season_id: formData.season_id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Frontend: rankingResponse data:', rankingResponse.data);
                
                // Cập nhật UI với đội bóng mới
                const teamForUI = {
                    ...newTeamFromServer, // Sử dụng dữ liệu đầy đủ từ server nếu có
                    _id: newTeamId,      // Đảm bảo _id là chính xác
                    season_id: formData.season_id, // season_id có thể không có trong newTeamFromServer nếu không populate
                    team_name: formData.team_name,
                    stadium: formData.stadium,
                    coach: formData.coach,
                    logo: formData.logo,
                };
                setTeams((prev) => [...prev, teamForUI]);
            }
            setShowForm(false);
            setEditingTeam(null);
            // Reset form sau khi submit thành công
             if (!editingTeam) {
                const safeSeasonsOnSubmit = Array.isArray(seasons) ? seasons : [];
                const firstValidSeasonOnSubmit = safeSeasonsOnSubmit.find(season => season._id && /^[0-9a-fA-F]{24}$/.test(season._id));
                setFormData({
                    season_id: firstValidSeasonOnSubmit ? firstValidSeasonOnSubmit._id : '',
                    team_name: '', stadium: '', coach: '', logo: ''
                });
                setIsFormValid(!!firstValidSeasonOnSubmit);
            }

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Không thể lưu đội bóng hoặc tạo bản ghi liên quan.';
            setError(errorMessage);
            console.error('API Error in TeamForm handleSubmit:', err.response?.data || err.message, err.stack);
        }
    };

    const safeSeasons = Array.isArray(seasons) ? seasons : [];

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingTeam ? 'Sửa đội bóng' : 'Thêm đội bóng'}</h2>
            {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded-md">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label htmlFor="season_id" className="block mb-1 font-medium text-gray-700">Mùa giải:</label>
                    <select
                        id="season_id"
                        value={formData.season_id}
                        onChange={(e) => {
                            const selectedSeasonId = e.target.value;
                            setFormData({ ...formData, season_id: selectedSeasonId });
                            setIsFormValid(!!selectedSeasonId && /^[0-9a-fA-F]{24}$/.test(selectedSeasonId));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        disabled={!!editingTeam} 
                    >
                        <option value="" disabled={!!formData.season_id}>Chọn mùa giải</option>
                        {safeSeasons.map((season) => (
                            <option key={season._id || `season-${Math.random()}`} value={season._id || ''}>
                                {season.season_name || season._id || 'Không xác định'}
                            </option>
                        ))}
                    </select>
                </div>
                <input
                    type="text"
                    value={formData.team_name}
                    onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                    placeholder="Tên đội"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
                <input
                    type="text"
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    placeholder="Sân vận động"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
                <input
                    type="text"
                    value={formData.coach}
                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                    placeholder="Huấn luyện viên"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
                <input
                    type="url" 
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="URL logo (https://example.com/logo.png)"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
                <div className="flex space-x-3">
                    <button
                        type="submit"
                        className={`px-4 py-2 rounded-md text-white font-semibold ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : 'bg-gray-400 cursor-not-allowed'}`}
                        disabled={!isFormValid}
                    >
                        {editingTeam ? 'Lưu thay đổi' : 'Thêm đội'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setEditingTeam(null); 
                            setError(''); 
                            const firstValidSeason = safeSeasons.find(season => season._id && /^[0-9a-fA-F]{24}$/.test(season._id));
                            setFormData({
                                season_id: firstValidSeason ? firstValidSeason._id : '',
                                team_name: '', stadium: '', coach: '', logo: ''
                            });
                            setIsFormValid(!!firstValidSeason);
                        }}
                        className="px-4 py-2 rounded-md text-white font-semibold bg-gray-500 hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TeamForm;