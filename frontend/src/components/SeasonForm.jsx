import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SeasonForm = ({ editingSeason, setEditingSeason, setShowForm, setSeasons }) => {
    const [formData, setFormData] = useState({
        season_name: '',
        start_date: '',
        end_date: '',
        status: true, // Thêm status mặc định
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // Thêm state cho thông báo thành công

    useEffect(() => {
        if (editingSeason) {
            setFormData({
                season_name: editingSeason.season_name,
                start_date: editingSeason.start_date.split('T')[0],
                end_date: editingSeason.end_date.split('T')[0],
                status: editingSeason.status !== undefined ? editingSeason.status : true,
            });
        } else {
            // Reset form khi không có editingSeason (trường hợp thêm mới)
            setFormData({
                season_name: '',
                start_date: '',
                end_date: '',
                status: true,
            });
        }
    }, [editingSeason]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            setError('Ngày bắt đầu không thể sau ngày kết thúc.');
            return;
        }

        try {
            if (editingSeason) {
                await axios.put(`http://localhost:5000/api/seasons/${editingSeason._id}`, formData);
                // setSeasons prop có thể không cần nếu component cha (Seasons) tự fetch lại list
                // Tuy nhiên, nếu muốn cập nhật ngay lập tức mà không fetch lại, bạn cần truyền setSeasons
                if (setSeasons) { // Kiểm tra xem setSeasons có được truyền không
                    setSeasons((prev) =>
                        prev.map((season) => (season._id === editingSeason._id ? { ...season, ...formData, _id: editingSeason._id } : season))
                    );
                }
                setSuccess('Cập nhật mùa giải thành công!');
            } else {
                const response = await axios.post('http://localhost:5000/api/seasons', formData);
                if (setSeasons) { // Kiểm tra xem setSeasons có được truyền không
                    setSeasons((prev) => [...prev, response.data.data]);
                }
                setSuccess('Thêm mùa giải thành công!');
            }

            // Đóng form sau một khoảng thời gian để người dùng đọc thông báo
            setTimeout(() => {
                setShowForm(false);
                setEditingSeason(null);
                setSuccess(''); // Clear success message
            }, 2000);

        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu mùa giải');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg mx-auto">
            <h2 className="text-2xl font-heading font-bold mb-6 text-center text-gray-800">
                {editingSeason ? 'Sửa mùa giải' : 'Thêm mùa giải mới'}
            </h2>
            {error && <p className="text-red-600 mb-4 text-center p-3 bg-red-100 rounded-md">{error}</p>}
            {success && <p className="text-green-600 mb-4 text-center p-3 bg-green-100 rounded-md">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="season_name" className="block text-sm font-medium text-gray-700 mb-1">Tên mùa giải</label>
                    <input
                        id="season_name"
                        type="text"
                        value={formData.season_name}
                        onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
                        placeholder="Ví dụ: V-League 2025"
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                    <input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                    <input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm"
                        required
                    />
                </div>
                <div className="flex items-center">
                    <input
                        id="status"
                        name="status"
                        type="checkbox"
                        checked={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                        className="h-4 w-4 text-theme-red border-gray-300 rounded focus:ring-theme-red"
                    />
                    <label htmlFor="status" className="ml-2 block text-sm text-gray-900">
                        Kích hoạt mùa giải
                    </label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setEditingSeason(null); // Quan trọng: reset editingSeason
                            setError(''); // Clear lỗi khi hủy
                            setSuccess(''); // Clear thành công khi hủy
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="bg-theme-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                    >
                        {editingSeason ? 'Lưu thay đổi' : 'Thêm mùa giải'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SeasonForm;