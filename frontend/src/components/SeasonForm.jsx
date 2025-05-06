import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SeasonForm = ({ editingSeason, setEditingSeason, setShowForm, setSeasons }) => {
    const [formData, setFormData] = useState({
        season_name: '',
        start_date: '',
        end_date: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingSeason) {
            setFormData({
                season_name: editingSeason.season_name,
                start_date: editingSeason.start_date.split('T')[0],
                end_date: editingSeason.end_date.split('T')[0],
            });
        }
    }, [editingSeason]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSeason) {
                const response = await axios.put(`http://localhost:5000/api/seasons/${editingSeason._id}`, formData);
                setSeasons((prev) =>
                    prev.map((season) => (season._id === editingSeason._id ? response.data.data : season))
                );
            } else {
                const response = await axios.post('http://localhost:5000/api/seasons', formData);
                setSeasons((prev) => [...prev, response.data.data]);
            }
            setShowForm(false);
            setEditingSeason(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu mùa giải');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{editingSeason ? 'Sửa mùa giải' : 'Thêm mùa giải'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <input
                    type="text"
                    value={formData.season_name}
                    onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
                    placeholder="Tên mùa giải"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    placeholder="Ngày bắt đầu"
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    placeholder="Ngày kết thúc"
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

export default SeasonForm;