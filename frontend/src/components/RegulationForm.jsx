import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RegulationForm = ({ editingRegulation, setEditingRegulation, setShowForm, setRegulations }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        regulation_name: '',
        rules: '{}',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingRegulation) {
            setFormData({
                season_id: editingRegulation.season_id,
                regulation_name: editingRegulation.regulation_name,
                rules: JSON.stringify(editingRegulation.rules),
            });
        }
    }, [editingRegulation]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                rules: JSON.parse(formData.rules),
            };
            if (editingRegulation) {
                const response = await axios.put(`http://localhost:5000/api/regulations/${editingRegulation._id}`, data);
                setRegulations((prev) =>
                    prev.map((regulation) => (regulation._id === editingRegulation._id ? response.data.data : regulation))
                );
            } else {
                const response = await axios.post('http://localhost:5000/api/regulations/', data);
                setRegulations((prev) => [...prev, response.data.data]);
            }
            setShowForm(false);
            setEditingRegulation(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu quy định');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingRegulation ? 'Sửa quy định' : 'Thêm quy định'}</h2>
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
                <select
                    value={formData.regulation_name}
                    onChange={(e) => setFormData({ ...formData, regulation_name: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                >
                    <option value="">Chọn tên quy định</option>
                    <option value="Age Regulation">Age Regulation</option>
                    <option value="Match Rules">Match Rules</option>
                    <option value="Goal Rules">Goal Rules</option>
                    <option value="Ranking Rules">Ranking Rules</option>
                </select>
                <textarea
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    placeholder='Quy tắc (JSON, ví dụ: {"minAge": 18, "maxAge": 40})'
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

export default RegulationForm;