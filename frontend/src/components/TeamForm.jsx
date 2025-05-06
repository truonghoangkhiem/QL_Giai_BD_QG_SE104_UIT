import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamForm = ({ editingTeam, setEditingTeam, setShowForm, setTeams }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        team_name: '',
        stadium: '',
        coach: '',
        logo: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingTeam) {
            setFormData({
                season_id: editingTeam.season_id,
                team_name: editingTeam.team_name,
                stadium: editingTeam.stadium,
                coach: editingTeam.coach,
                logo: editingTeam.logo,
            });
        }
    }, [editingTeam]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTeam) {
                const response = await axios.put(`http://localhost:5000/api/teams/${editingTeam._id}`, formData);
                setTeams((prev) =>
                    prev.map((team) => (team._id === editingTeam._id ? response.data.data : team))
                );
            } else {
                const response = await axios.post('http://localhost:5000/api/teams/', formData);
                setTeams((prev) => [...prev, response.data.data]);
            }
            setShowForm(false);
            setEditingTeam(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu đội bóng');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingTeam ? 'Sửa đội bóng' : 'Thêm đội bóng'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <input
                    type="text"
                    value={formData.season_id}
                    onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
                    placeholder="ID mùa giải"
                    className="w-full p-2 border rounded"
                    required
                />
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
                <button type="submit" className="bg-blue-600 text-white p-2 rounded">Lưu</button>
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