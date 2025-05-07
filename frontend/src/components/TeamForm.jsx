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
        console.log('seasons:', seasons);
        const safeSeasons = Array.isArray(seasons) ? seasons : [];
        if (editingTeam) {
            setFormData({
                season_id: editingTeam.season_id,
                team_name: editingTeam.team_name,
                stadium: editingTeam.stadium,
                coach: editingTeam.coach,
                logo: editingTeam.logo,
            });
            setIsFormValid(/^[0-9a-fA-F]{24}$/.test(editingTeam.season_id));
        } else if (safeSeasons.length > 0) {
            const firstValidSeason = safeSeasons.find(season => season._id && /^[0-9a-fA-F]{24}$/.test(season._id));
            if (firstValidSeason) {
                setFormData((prev) => ({ ...prev, season_id: firstValidSeason._id }));
                setIsFormValid(true);
            } else {
                setError('Không có ID mùa giải hợp lệ trong danh sách mùa giải.');
                setIsFormValid(false);
            }
        } else {
            setError('Không có mùa giải nào để chọn. Vui lòng tạo mùa giải trước.');
            setIsFormValid(false);
        }
    }, [editingTeam, seasons]);

    const validateFormData = () => {
        if (!formData.season_id) return 'Vui lòng chọn mùa giải';
        if (!/^[0-9a-fA-F]{24}$/.test(formData.season_id)) return 'ID mùa giải không hợp lệ';
        if (!formData.team_name) return 'Vui lòng nhập tên đội';
        if (!formData.stadium) return 'Vui lòng nhập sân vận động';
        if (!formData.coach) return 'Vui lòng nhập huấn luyện viên';
        if (!formData.logo) return 'Vui lòng nhập URL logo';
        if (!token) return 'Không có token xác thực. Vui lòng đăng nhập lại.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Kiểm tra dữ liệu trước khi gửi
        const validationError = validateFormData();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            if (editingTeam) {
                const response = await axios.put(`http://localhost:5000/api/teams/${editingTeam._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTeams((prev) =>
                    prev.map((team) => (team._id === editingTeam._id ? response.data.data : team))
                );
            } else {
                console.log('formData before POST /api/teams/:', formData);
                // Tạo đội bóng mới
                const teamResponse = await axios.post('http://localhost:5000/api/teams/', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('teamResponse:', teamResponse.data);
                const newTeamId = teamResponse.data.data?.id; // Sửa: Lấy id từ teamResponse.data.data.id
                if (!newTeamId || !/^[0-9a-fA-F]{24}$/.test(newTeamId)) {
                    throw new Error('ID đội bóng không hợp lệ hoặc không được trả về từ API');
                }

                // Tạo đối tượng newTeam giả lập để cập nhật danh sách
                const newTeam = {
                    _id: newTeamId,
                    season_id: formData.season_id,
                    team_name: formData.team_name,
                    stadium: formData.stadium,
                    coach: formData.coach,
                    logo: formData.logo
                };

                console.log('TeamResult payload:', { team_id: newTeamId, season_id: formData.season_id });
                // Tạo TeamResult
                const teamResultResponse = await axios.post('http://localhost:5000/api/team_results/', {
                    team_id: newTeamId,
                    season_id: formData.season_id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('teamResultResponse:', teamResultResponse.data);

                console.log('GET team_results params:', { season_id: formData.season_id, team_id: newTeamId });
                // Lấy team_result_id
                const teamResultIdResponse = await axios.get(`http://localhost:5000/api/team_results/${formData.season_id}/${newTeamId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('teamResultIdResponse:', teamResultIdResponse.data);
                const teamResultId = teamResultIdResponse.data.data;
                if (!teamResultId) {
                    throw new Error('Không lấy được team_result_id từ phản hồi');
                }

                console.log('Ranking payload:', { teamResultId, season_id: formData.season_id });
                // Tạo Ranking
                const rankingResponse = await axios.post(`http://localhost:5000/api/rankings/${teamResultId}`, {
                    season_id: formData.season_id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('rankingResponse:', rankingResponse.data);

                // Cập nhật danh sách đội bóng
                setTeams((prev) => [...prev, newTeam]);
            }
            setShowForm(false);
            setEditingTeam(null);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Không thể lưu đội bóng hoặc tạo kết quả/xếp hạng';
            setError(errorMessage);
            console.error('API Error:', err.response?.data || err.message);
        }
    };

    // Đảm bảo seasons là mảng
    const safeSeasons = Array.isArray(seasons) ? seasons : [];

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingTeam ? 'Sửa đội bóng' : 'Thêm đội bóng'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label htmlFor="season_id" className="block mb-1">Mùa giải:</label>
                    <select
                        id="season_id"
                        value={formData.season_id}
                        onChange={(e) => {
                            const selectedSeasonId = e.target.value;
                            setFormData({ ...formData, season_id: selectedSeasonId });
                            setIsFormValid(/^[0-9a-fA-F]{24}$/.test(selectedSeasonId));
                        }}
                        className="w-full p-2 border rounded"
                        required
                    >
                        <option value="" disabled>Chọn mùa giải</option>
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
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="text"
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    placeholder="Sân vận động"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="text"
                    value={formData.coach}
                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                    placeholder="Huấn luyện viên"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="text"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="URL logo"
                    className="w-full p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    className={`p-2 rounded text-white ${isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    disabled={!isFormValid}
                >
                    Lưu
                </button>
                <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-500 text-white p-2 rounded"
                >
                    Hủy
                </button>
            </form>
        </div>
    );
};

export default TeamForm;