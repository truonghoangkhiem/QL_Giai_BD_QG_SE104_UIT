import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerRankings = ({ seasonId, token }) => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Placeholder URL cho hình ảnh mặc định (thay bằng URL bạn cung cấp)
    const defaultAvatarUrl = 'URL_CUA_BAN_SE_DAN_SAU'; // Thay bằng URL hình ảnh mặc định

    useEffect(() => {
        if (!seasonId) return;

        const fetchRankings = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5000/api/player_rankings/season/${seasonId}`, {
                    params: { date: new Date().toISOString().split('T')[0] },
                });
                if (!Array.isArray(response.data.data)) {
                    throw new Error('Invalid data format from API');
                }
                const data = response.data.data;

                if (data.length > 0 && !data[0].playerName) {
                    console.warn('Data is not fully populated. Using partial data with fallback.');
                    setError('Dữ liệu không được populate đầy đủ. Tên cầu thủ không khả dụng.');
                }

                setRankings(data);
                setLoading(false);
            } catch (err) {
                console.error('Fetch error:', err.message);
                setError('Không thể tải danh sách xếp hạng cầu thủ.');
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
            await axios.delete(`http://localhost:5000/api/player_rankings/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setRankings(rankings.filter((ranking) => ranking._id !== id));
        } catch (err) {
            setError('Không thể xóa xếp hạng cầu thủ');
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
                                <th className="w-24 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Xếp hạng</th>
                                <th className="w-64 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Tên cầu thủ</th>
                                <th className="w-32 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Số trận</th>
                                <th className="w-32 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Bàn thắng</th>
                                <th className="w-32 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Kiến tạo</th>
                                <th className="w-32 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Điểm</th>
                                <th className="w-40 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Ngày</th>
                                {token && <th className="w-40 py-4 px-8 border-b-2 border-gray-300 text-left text-xl font-bold">Hành động</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((ranking, index) => (
                                <tr
                                    key={ranking._id}
                                    className={`hover:bg-gray-200 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}`}
                                >
                                    <td className="w-24 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.rank || 'N/A'}</td>
                                    <td className="w-64 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800 flex items-center">
                                        <div className="flex items-center space-x-3 min-w-0">
                                            {ranking.avatar ? (
                                                <img
                                                    src={ranking.avatar}
                                                    alt={`${ranking.playerName} avatar`}
                                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                                />
                                            ) : (
                                                <img
                                                    src={defaultAvatarUrl}
                                                    alt="Default avatar"
                                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                                />
                                            )}
                                            <span className="truncate text-lg text-gray-800" title={ranking.playerName || 'Không xác định'}>
                                                {ranking.playerName || 'Không xác định'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="w-32 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.gamesPlayed || 0}</td>
                                    <td className="w-32 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.goalsScored || 0}</td>
                                    <td className="w-32 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{ranking.assists || 0}</td>
                                    <td className="w-32 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">
                                        {(ranking.goalsScored || 0) + (ranking.assists || 0)}
                                    </td>
                                    <td className="w-40 py-4 px-8 border-b-2 border-gray-300 text-lg text-gray-800">{new Date(ranking.date).toLocaleDateString()}</td>
                                    {token && (
                                        <td className="w-40 py-4 px-8 border-b-2 border-gray-300">
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
                <p className="text-gray-500 text-lg">Chưa có dữ liệu xếp hạng cầu thủ.</p>
            )}
        </div>
    );
};

export default PlayerRankings;