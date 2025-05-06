import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Rankings = ({ seasonId, token }) => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Placeholder URL cho logo mặc định (thay bằng URL bạn cung cấp)
    const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain'; // Thay bằng URL hình ảnh mặc định

    useEffect(() => {
        if (!seasonId) return;

        const fetchRankings = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5000/api/rankings/${seasonId}`);
                if (!response.data.success || !Array.isArray(response.data.data)) {
                    throw new Error('Invalid data format from API');
                }
                const data = response.data.data;

                // Kiểm tra nếu dữ liệu không populate đúng
                if (data.length > 0 && !data[0].team_result_id?.team_id?.team_name) {
                    console.warn('Data is not fully populated. Using partial data with fallback.');
                    setError('Dữ liệu không được populate đầy đủ. Tên đội bóng không khả dụng.');
                }

                setRankings(data);
                setLoading(false);
            } catch (err) {
                console.error('Fetch error:', err.message);
                setError('Không thể tải danh sách xếp hạng đội bóng.');
                setRankings([]);
                setLoading(false);
            }
        };
        fetchRankings();
    }, [seasonId]);

    const handleDelete = async (id) => {
        if (!token) {
            alert('Vui lòng đăng nhập để xóa xếp hạng.');
            return;
        }
        try {
            await axios.delete(`http://localhost:5000/api/rankings/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setRankings(rankings.filter((ranking) => ranking._id !== id));
        } catch (err) {
            setError('Không thể xóa xếp hạng');
        }
    };

    if (loading) return <p className="text-lg">Đang tải...</p>;
    if (error && rankings.length === 0) return <p className="text-red-500 text-lg">{error}</p>;

    return (
        <div className="container mx-auto p-6">
            {error && <p className="text-yellow-500 text-lg mb-6">{error}</p>}
            {rankings.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full max-w-6xl mx-auto border-2 border-gray-300 shadow-lg">
                        <thead>
                            <tr className="bg-blue-950 text-white">
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Xếp hạng</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Tên đội</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Số trận</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Thắng</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Hòa</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Thua</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Bàn thắng</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Bàn thua</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Hiệu số</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Điểm</th>
                                <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Ngày</th>
                                {token && <th className="py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Hành động</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((ranking, index) => (
                                <tr
                                    key={ranking._id}
                                    className={`hover:bg-gray-200 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}
                                >
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.rank || 'N/A'}</td>
                                    <td className="w-64 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            {ranking.team_result_id?.team_id?.logo ? (
                                                <img
                                                    src={ranking.team_result_id.team_id.logo}
                                                    alt={`${ranking.team_result_id.team_id.team_name} logo`}
                                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                                />
                                            ) : (
                                                <img
                                                    src={defaultLogoUrl}
                                                    alt="Default logo"
                                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                                />
                                            )}
                                            <span className="truncate text-lg text-gray-800" title={ranking.team_result_id?.team_id?.team_name || 'Không xác định'}>
                                                {ranking.team_result_id?.team_id?.team_name || 'Không xác định'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.matchplayed || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.wins || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.draws || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.losses || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.goalsFor || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.goalsAgainst || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.goalsDifference || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.team_result_id?.points || 0}</td>
                                    <td className="py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{new Date(ranking.date).toLocaleDateString()}</td>
                                    {token && (
                                        <td className="py-4 px-8 border-b-2 border-gray-300">
                                            <button
                                                onClick={() => handleDelete(ranking._id)}
                                                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-200"
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500 text-lg">Chưa có dữ liệu xếp hạng đội bóng.</p>
            )}
        </div>
    );
};

export default Rankings;