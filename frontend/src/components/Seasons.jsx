import React, { useState, useEffect } from 'react';
import axios from 'axios';
// SeasonForm không cần import ở đây nếu SeasonsPage quản lý việc hiển thị form

const Seasons = ({ setEditingSeason, setShowForm, token }) => {
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // useEffect để fetch seasons khi component mount hoặc khi có sự thay đổi cần fetch lại
    // (ví dụ: sau khi thêm/sửa/xóa thành công từ SeasonForm, SeasonsPage có thể trigger fetch lại)
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(response.data.data);
            } catch (err) {
                setError('Không thể tải danh sách mùa giải. Vui lòng thử lại.');
                console.error("Fetch seasons error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeasons();
    }, [setShowForm]); // Thêm dependency nếu việc đóng form nên trigger fetch lại (hoặc có một state/prop khác để trigger)

    const handleEdit = (season) => {
        setEditingSeason(season);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mùa giải này? Mọi dữ liệu liên quan (đội bóng, trận đấu, kết quả,...) sẽ bị xóa vĩnh viễn.')) {
            try {
                await axios.delete(`http://localhost:5000/api/seasons/${id}`, {
                    headers: { Authorization: `Bearer ${token}` } // Đảm bảo gửi token nếu API yêu cầu
                });
                setSeasons(seasons.filter((season) => season._id !== id));
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể xóa mùa giải. Có thể mùa giải này đang được sử dụng.');
                console.error("Delete season error:", err);
            }
        }
    };

    if (loading) return <p className="text-center text-gray-500 text-lg py-10">Đang tải danh sách mùa giải...</p>;
    if (error) return <p className="text-red-500 text-center text-lg py-10 bg-red-50 p-4 rounded-md">{error}</p>;

    return (
        // Container này giờ không cần padding lớn vì SeasonsPage hoặc App.jsx đã có
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Tiêu đề đã được chuyển lên SeasonsPage */}
            {seasons.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Chưa có mùa giải nào được tạo.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full ">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tên mùa giải</th>
                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ngày bắt đầu</th>
                                <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ngày kết thúc</th>
                                <th className="py-3 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                                <th className="py-3 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {seasons.map((season) => (
                                <tr key={season._id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{season.season_name}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">{new Date(season.start_date).toLocaleDateString('vi-VN')}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">{new Date(season.end_date).toLocaleDateString('vi-VN')}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-sm text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${season.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {season.status ? 'Đang kích hoạt' : 'Đã khóa'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 whitespace-nowrap text-center text-sm font-medium">
                                        {token && ( // Chỉ hiển thị nút nếu có token
                                            <div className="flex justify-center items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(season)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md shadow-sm transition-colors duration-200 text-xs"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(season._id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md shadow-sm transition-colors duration-200 text-xs"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Seasons;