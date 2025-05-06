import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerForm = ({ editingPlayer, setEditingPlayer, setShowForm, setPlayers }) => {
    const [formData, setFormData] = useState({
        team_id: '',
        name: '',
        number: '',
        position: '',
        nationality: '',
        dateOfBirth: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingPlayer) {
            setFormData({
                team_id: editingPlayer.team_id,
                name: editingPlayer.name,
                number: editingPlayer.number,
                position: editingPlayer.position,
                nationality: editingPlayer.nationality,
                dateOfBirth: editingPlayer.dateOfBirth,
            });
        }
    }, [editingPlayer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPlayer) {
                const response = await axios.put(`http://localhost:5000/api/players/${editingPlayer._id}`, formData);
                setPlayers((prev) =>
                    prev.map((player) => (player._id === editingPlayer._id ? response.data.data : player))
                );
            } else {
                const response = await axios.post('http://localhost:5000/api/players', formData);
                setPlayers((prev) => [...prev, response.data.data]);
            }
            setShowForm(false);
            setEditingPlayer(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu cầu thủ');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingPlayer ? 'Sửa cầu thủ' : 'Thêm cầu thủ'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <input
                    type="text"
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    placeholder="ID đội bóng"
                    className="w-full p-2 border rounded"
                    required
                />
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
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="Ngày sinh"
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

export default PlayerForm;