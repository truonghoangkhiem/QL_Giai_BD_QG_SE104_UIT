import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamForm = ({ editingTeam, setEditingTeam, setShowForm, onSuccess, seasons, token }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        team_name: '',
        stadium: '',
        coach: '',
        logo: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // State cho vòng xoay tải

    useEffect(() => {
        const safeSeasons = Array.isArray(seasons) ? seasons : [];
        if (editingTeam) {
            setFormData({
                season_id: editingTeam.season_id?._id || editingTeam.season_id,
                team_name: editingTeam.team_name,
                stadium: editingTeam.stadium,
                coach: editingTeam.coach,
                logo: editingTeam.logo,
            });
        } else if (safeSeasons.length > 0) {
            setFormData(prev => ({ ...prev, season_id: safeSeasons[0]._id }));
        }
    }, [editingTeam, seasons]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (editingTeam) {
                // Sửa đội bóng
                await axios.put(`http://localhost:5000/api/teams/${editingTeam._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // Thêm đội bóng mới và các bản ghi liên quan
                // 1. Tạo đội bóng mới
                const teamResponse = await axios.post('http://localhost:5000/api/teams/', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const newTeamId = teamResponse.data.data?._id;

                if (!newTeamId) throw new Error('Không nhận được ID đội bóng mới từ server.');

                // 2. Tạo TeamResult ban đầu
                await axios.post('http://localhost:5000/api/team_results/', {
                    team_id: newTeamId,
                    season_id: formData.season_id
                }, { headers: { Authorization: `Bearer ${token}` } });
                
            }
            onSuccess(); // Gọi hàm thành công từ component cha
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Không thể lưu đội bóng. Vui lòng thử lại.';
            setError(errorMessage);
            console.error('Lỗi khi submit TeamForm:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const safeSeasons = Array.isArray(seasons) ? seasons : [];

    return (
        <div className="container mx-auto p-4 max-w-lg bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">{editingTeam ? 'Sửa đội bóng' : 'Thêm đội bóng'}</h2>
            {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded-md text-center">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                 <fieldset disabled={isSubmitting} className="space-y-4">
                    <div>
                        <label htmlFor="season_id" className="block mb-1 font-medium text-gray-700">Mùa giải:</label>
                        <select
                            id="season_id"
                            value={formData.season_id}
                            onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                            disabled={!!editingTeam || isSubmitting}
                        >
                            <option value="">Chọn mùa giải</option>
                            {safeSeasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <input type="text" value={formData.team_name} onChange={(e) => setFormData({ ...formData, team_name: e.target.value })} placeholder="Tên đội" className="w-full p-2 border border-gray-300 rounded-md" required />
                    <input type="text" value={formData.stadium} onChange={(e) => setFormData({ ...formData, stadium: e.target.value })} placeholder="Sân vận động" className="w-full p-2 border border-gray-300 rounded-md" required />
                    <input type="text" value={formData.coach} onChange={(e) => setFormData({ ...formData, coach: e.target.value })} placeholder="Huấn luyện viên" className="w-full p-2 border border-gray-300 rounded-md" required />
                    <input type="url" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} placeholder="URL logo" className="w-full p-2 border border-gray-300 rounded-md" required />

                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setShowForm(false)} disabled={isSubmitting} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
                            Hủy
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center justify-center w-36">
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                editingTeam ? 'Lưu' : 'Thêm'
                            )}
                        </button>
                    </div>
                </fieldset>
            </form>
        </div>
    );
};

export default TeamForm;